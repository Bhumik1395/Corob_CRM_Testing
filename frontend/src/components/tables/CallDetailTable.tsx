import { useState } from "react";

export function CallDetailTable({
    rows, page, pageSize, totalRows, onPageChange,
}: {
    rows: Record<string, string | number>[];
    page: number;
    pageSize: number;
    totalRows: number;
    onPageChange: (page: number) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const [jumpValue, setJumpValue] = useState(String(page));

    const columns = ["customer", "state", "machine_no", "call_date", "status", "visit_type"];
    const labels: Record<string, string> = {
        customer: "Customer", state: "State", machine_no: "Machine No.",
        call_date: "Call Date", status: "Status", visit_type: "Visit Type",
    };

    const handleJump = () => {
        const n = parseInt(jumpValue, 10);
        if (!isNaN(n) && n >= 1 && n <= totalPages) {
            onPageChange(n);
        } else {
            setJumpValue(String(page));
        }
    };

    return (
        <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                        {columns.map((c) => <th key={c} className="text-left p-3">{labels[c]}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-t">
                            {columns.map((c) => <td key={c} className="p-3">{row[c]}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex items-center justify-between p-3 border-t text-sm text-gray-500">
                <span>{totalRows.toLocaleString()} total rows</span>
                <div className="flex items-center gap-2">
                    <button
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                        className="px-3 py-1 border rounded-md disabled:opacity-40"
                    >
                        Prev
                    </button>
                    <span>Page</span>
                    <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={jumpValue}
                        onChange={(e) => setJumpValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleJump()}
                        onBlur={handleJump}
                        className="w-14 border rounded-md px-2 py-1 text-center"
                    />
                    <span>of {totalPages}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => onPageChange(page + 1)}
                        className="px-3 py-1 border rounded-md disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
