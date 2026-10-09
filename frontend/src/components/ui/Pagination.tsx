import { useEffect, useState } from "react";

export function Pagination({
    page,
    pageSize,
    totalRows,
    noun = "records",
    onPageChange,
}: {
    page: number;
    pageSize: number;
    totalRows: number;
    noun?: string;
    onPageChange: (page: number) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const [jump, setJump] = useState(String(page));

    useEffect(() => {
        setJump(String(page));
    }, [page]);

    const commit = () => {
        const n = parseInt(jump, 10);
        if (!isNaN(n) && n >= 1 && n <= totalPages) onPageChange(n);
        else setJump(String(page));
    };

    const btn =
        "rounded-full border border-border px-3 py-1 text-xs font-medium text-ink transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent";

    return (
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-muted">
            <span>
                {totalRows.toLocaleString()} total {noun}
            </span>
            <div className="flex items-center gap-2">
                <button className={btn} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                    Prev
                </button>
                <span>Page</span>
                <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jump}
                    onChange={(e) => setJump(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && commit()}
                    onBlur={commit}
                    aria-label="Page number"
                    className="w-14 rounded-full border border-border px-2 py-1 text-center text-xs outline-none focus-visible:ring-2 focus-visible:ring-lime"
                />
                <span>of {totalPages}</span>
                <button className={btn} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
                    Next
                </button>
            </div>
        </div>
    );
}