import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { downloadPmReport, getCompanies, getPrintOptions } from "../../api/pm";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/ui/Card";
import { Select } from "../../components/ui/Select";

const monthLabel = (m: number) => new Date(2000, m - 1, 1).toLocaleString("en", { month: "long" });

export default function PmPrintPage() {
    const { token, roles, company: myCompany } = useAuth();
    const isEmployee = roles.includes("corob_employee");

    const [employeeCompany, setEmployeeCompany] = useState("");
    const [model, setModel] = useState("");
    const [year, setYear] = useState("");
    const [month, setMonth] = useState("");
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeCompany = isEmployee ? employeeCompany : myCompany ?? "";

    const { data: companiesData } = useQuery({
        queryKey: ["companies"],
        queryFn: () => getCompanies(token!),
        enabled: !!token && isEmployee,
    });

    const { data: options, isError, error: optionsError } = useQuery({
        queryKey: ["pmPrintOptions", activeCompany],
        queryFn: () => getPrintOptions(token!, activeCompany),
        enabled: !!token && !!activeCompany,
        retry: false,
    });

    const years = useMemo(
        () => [...new Set((options?.periods ?? []).map((p) => p.slice(0, 4)))].sort().reverse(),
        [options]
    );
    const selYear = years.includes(year) ? year : years[0] ?? "";
    const monthsInYear = useMemo(
        () => (options?.periods ?? []).filter((p) => p.startsWith(selYear)).map((p) => Number(p.slice(5))),
        [options, selYear]
    );
    const selMonth = monthsInYear.includes(Number(month)) ? Number(month) : monthsInYear[monthsInYear.length - 1];

    const canGenerate = !!activeCompany && !!selYear && !!selMonth && !generating;

    const handleGenerate = async () => {
        setError(null);
        setGenerating(true);
        try {
            await downloadPmReport(token!, {
                company: activeCompany,
                model: model || undefined,
                year: Number(selYear),
                month: selMonth!,
            });
        } catch (e: any) {
            setError(e?.message ?? "Could not generate the PDF.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 px-6 pb-6">
            <h2 className="text-lg font-semibold">Select premade formats</h2>

            <div className="flex flex-wrap items-center gap-2">
                {isEmployee && (
                    <Select
                        className="w-64"
                        aria-label="Company"
                        value={employeeCompany}
                        onChange={(e) => { setEmployeeCompany(e.target.value); setModel(""); }}
                    >
                        <option value="">Select company</option>
                        {companiesData?.companies.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </Select>
                )}
                <Select className="w-64" aria-label="Model number" value={model} onChange={(e) => setModel(e.target.value)} disabled={!options}>
                    <option value="">All models</option>
                    {options?.models.map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </Select>
                <Select className="w-40" aria-label="Month" value={selMonth ?? ""} onChange={(e) => setMonth(e.target.value)} disabled={!options}>
                    {monthsInYear.map((m) => (
                        <option key={m} value={m}>{monthLabel(m)}</option>
                    ))}
                </Select>
                <Select className="w-28" aria-label="Year" value={selYear} onChange={(e) => setYear(e.target.value)} disabled={!options}>
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </Select>
            </div>

            {isEmployee && !activeCompany && <p className="text-sm text-muted">Select a company to continue.</p>}
            {isError && (
                <p className="text-sm text-red">
                    {(optionsError as any)?.message ?? "Could not load PM data for this company."}
                </p>
            )}

            <Card title="PM Report" subtitle="Cover page, clickable model index, and a month-by-month chart and detail table per model.">
                <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted">
                        {selMonth && selYear
                            ? `${monthLabel(selMonth)} ${selYear} · ${model || "all models"}`
                            : "Choose the filters above."}
                    </p>
                    <button
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                        className="flex items-center gap-2 rounded-full bg-forest px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                        <FileText size={14} /> {generating ? "Generating…" : "Generate PDF"}
                    </button>
                </div>
                {error && <p className="mt-3 text-sm text-red">{error}</p>}
            </Card>
        </div>
    );
}