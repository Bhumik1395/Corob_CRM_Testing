import { AlertTriangle } from "lucide-react";

export function ConfirmModal({
    title,
    message,
    confirmLabel,
    confirming,
    onConfirm,
    onCancel,
}: {
    title: string;
    message: string;
    confirmLabel: string;
    confirming: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onCancel}>
            <div className="bg-white rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-2 text-red-600">
                    <AlertTriangle size={18} />
                    <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-6">{message}</p>
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 border text-sm font-medium px-4 py-2.5 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={confirming}
                        className="flex-1 bg-red-600 text-white text-sm font-medium px-4 py-2.5 rounded-md disabled:opacity-60"
                    >
                        {confirming ? "Deleting…" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}