import { X } from "lucide-react";

export function PdfViewerModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                    <h3 className="text-sm font-medium truncate">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
                        <X size={18} />
                    </button>
                </div>
                <iframe src={url} title={title} className="flex-1 w-full" />
            </div>
        </div>
    );
}
