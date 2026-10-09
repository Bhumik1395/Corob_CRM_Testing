import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { UploadCloud, X, AlertCircle, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { uploadPmFiles } from "../../api/pm";
import { useAuth } from "../../auth/AuthContext";

export default function PmUploadPage() {
    const navigate = useNavigate();
    const { token, roles } = useAuth();
    const [dragOver, setDragOver] = useState(false);
    const [progress, setProgress] = useState(0);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);

    const isEmployee = roles.includes("corob_employee");
    const dashboardPath = isEmployee ? "/dashboard/pm" : "/customer/pm";

    const mutation = useMutation({
        mutationFn: (files: File[]) => uploadPmFiles(files, token!, setProgress),
        onError: () => setProgress(0),
    });

    const addFiles = useCallback((incoming: FileList | File[]) => {
        const xlsxFiles = Array.from(incoming).filter((f) => f.name.endsWith(".xlsx"));
        setPendingFiles((prev) => [...prev, ...xlsxFiles]);
    }, []);

    const removeFile = (name: string) => {
        setPendingFiles((prev) => prev.filter((f) => f.name !== name));
    };

    const handleUpload = () => {
        if (pendingFiles.length === 0) return;
        setProgress(0);
        mutation.mutate(pendingFiles);
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-xl border p-10" style={{ borderColor: "var(--color-border)" }}>
                <h1 className="text-2xl font-semibold text-center mb-2">Upload PM Data</h1>
                <p className="text-center text-gray-500 mb-6">
                    Drag and drop one or more PM Data Excel (.xlsx) files. Files are merged
                    together automatically, and duplicate tickets are deduplicated.
                    {isEmployee && " Each company is detected automatically from the \"Master Customer\" column, so one upload can cover multiple companies at once."}
                </p>

                {mutation.isError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <p className="font-medium text-sm">Upload Failed</p>
                            <p className="text-sm">{(mutation.error as any)?.message}</p>
                        </div>
                        <button onClick={() => mutation.reset()}><X size={16} /></button>
                    </div>
                )}

                {mutation.isSuccess && (
                    <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4">
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <p className="font-medium text-sm">Upload complete</p>
                            <p className="text-sm">
                                {mutation.data.files.reduce((sum, f) => sum + f.row_count, 0)} rows processed
                                across {mutation.data.files.length} file(s).
                            </p>
                            {mutation.data.companies.length > 0 && (
                                <ul className="text-sm mt-2 space-y-0.5">
                                    {mutation.data.companies.map((c) => (
                                        <li key={c.company}>
                                            <span className="font-medium">{c.company}</span> — {c.total_rows_stored} total rows stored
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {!mutation.isPending && (
                    <>
                        <div
                            className="border-2 border-dashed rounded-lg p-10 text-center transition-colors"
                            style={{
                                borderColor: dragOver ? "var(--color-accent)" : "#d1d5db",
                                background: dragOver ? "var(--color-accent-light)" : "transparent",
                            }}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault(); setDragOver(false);
                                if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
                            }}
                        >
                            <div
                                className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4"
                                style={{ background: "var(--color-accent-light)" }}
                            >
                                <UploadCloud style={{ color: "var(--color-accent)" }} size={26} />
                            </div>
                            <p className="font-medium mb-1">Drag & Drop file(s) here</p>
                            <p className="text-sm text-gray-500 mb-4">Supported formats: .xlsx (Max 50MB each, up to 10 files)</p>
                            <div className="flex items-center gap-3 mb-4">
                                <hr className="flex-1" /><span className="text-xs text-gray-400">OR</span><hr className="flex-1" />
                            </div>
                            <label
                                className="inline-block text-white text-sm font-medium px-4 py-2 rounded-md cursor-pointer"
                                style={{ background: "var(--color-accent)" }}
                            >
                                Browse files
                                <input
                                    type="file" accept=".xlsx" multiple className="hidden"
                                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                                />
                            </label>
                        </div>

                        {pendingFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {pendingFiles.map((f) => (
                                    <div key={f.name} className="flex items-center gap-3 border rounded-lg p-2.5 text-sm" style={{ borderColor: "var(--color-border)" }}>
                                        <FileSpreadsheet size={16} className="text-gray-400 shrink-0" />
                                        <span className="flex-1 truncate">{f.name}</span>
                                        <span className="text-xs text-gray-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                                        <button onClick={() => removeFile(f.name)} className="text-gray-400 hover:text-gray-700 shrink-0">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={handleUpload}
                                    className="w-full mt-2 text-white text-sm font-medium px-4 py-2.5 rounded-md"
                                    style={{ background: "var(--color-accent)" }}
                                >
                                    Upload {pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""}
                                </button>
                            </div>
                        )}

                        {mutation.isSuccess && (
                            <button
                                onClick={() => navigate(dashboardPath)}
                                className="w-full mt-3 border text-sm font-medium px-4 py-2.5 rounded-md hover:bg-gray-50"
                            >
                                Go to dashboard
                            </button>
                        )}
                    </>
                )}

                {mutation.isPending && (
                    <div className="mt-4 border rounded-lg p-3 flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: "var(--color-accent-light)" }}
                        >
                            <UploadCloud style={{ color: "var(--color-accent)" }} size={18} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">
                                {progress < 100 ? `Uploading (${progress}%)…` : "Processing your file(s)…"}
                            </p>
                            <div className="h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                                <div
                                    className="h-1.5 rounded-full transition-all duration-200 ease-out"
                                    style={{ width: `${progress}%`, background: "var(--color-accent)" }}
                                />
                            </div>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">{progress}%</span>
                    </div>
                )}
            </div>
        </div>
    );
}