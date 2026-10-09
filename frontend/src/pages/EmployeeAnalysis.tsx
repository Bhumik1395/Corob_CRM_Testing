import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getEmployeeDashboard } from "../api/serviceCalls";
import { SimpleBarChart } from "../components/charts/SimpleBarChart";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { Search } from "lucide-react";

export default function EmployeeAnalysis() {
    const [page, setPage] = useState(1);
    const [jumpValue, setJumpValue] = useState(String(page));
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebouncedValue(searchInput, 400);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["employees", page, debouncedSearch],
        queryFn: () => getEmployeeDashboard(page, 50, debouncedSearch),
        placeholderData: keepPreviousData,
    });

    useEffect(() => {
        setJumpValue(String(page));
    }, [page]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    if (isLoading && !data) return <p className="p-6">Loading…</p>;
    if (isError || !data) return <p className="p-6">Failed to load dashboard data.</p>;

    const topByCalls = [...data.rows]
        .sort((a, b) => b.total_calls - a.total_calls)
        .slice(0, 10)
        .map((r) => ({ name: `${r.eng_code} - ${r.employee_name}`, calls: r.total_calls }));

    const topByUnderNorm = [...data.rows]
        .sort((a, b) => b.under_norm_pct - a.under_norm_pct)
        .slice(0, 10)
        .map((r) => ({ name: `${r.eng_code} - ${r.employee_name}`, pct: r.under_norm_pct }));

    const totalPages = Math.max(1, Math.ceil(data.totalRows / data.pageSize));

    const handleJump = () => {
        const n = parseInt(jumpValue, 10);
        if (!isNaN(n) && n >= 1 && n <= totalPages) {
            setPage(n);
        } else {
            setJumpValue(String(page));
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Employee Performance</h1>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-xl border p-4">
                    <h3 className="text-sm font-medium mb-2">Calls per Employee</h3>
                    <SimpleBarChart data={topByCalls} xKey="name" yKey="calls" />
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <h3 className="text-sm font-medium mb-2">Under-Norm % per Employee</h3>
                    <SimpleBarChart data={topByUnderNorm} xKey="name" yKey="pct" />
                </div>
            </div>

            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">All Employees</h3>
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search eng code or name…"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="border rounded-lg pl-8 pr-3 py-1.5 text-sm w-64"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <th className="text-left p-3">Eng Code</th>
                            <th className="text-left p-3">Name</th>
                            <th className="text-left p-3">Total Calls</th>
                            <th className="text-left p-3">Under-Norm Calls</th>
                            <th className="text-left p-3">Under-Norm %</th>
                            <th className="text-left p-3">Physical</th>
                            <th className="text-left p-3">Online</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.length === 0 && (
                            <tr><td colSpan={7} className="p-4 text-center text-gray-400">No matching employees</td></tr>
                        )}
                        {data.rows.map((row) => (
                            <tr key={row.eng_code} className="border-t">
                                <td className="p-3">{row.eng_code}</td>
                                <td className="p-3">{row.employee_name}</td>
                                <td className="p-3">{row.total_calls}</td>
                                <td className="p-3">{row.under_norm_calls}</td>
                                <td className="p-3">{row.under_norm_pct}%</td>
                                <td className="p-3">{row.physical}</td>
                                <td className="p-3">{row.online}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex items-center justify-between p-3 border-t text-sm text-gray-500">
                    <span>{data.totalRows.toLocaleString()} total</span>
                    <div className="flex items-center gap-2">
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded-md disabled:opacity-40">Prev</button>
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
                        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded-md disabled:opacity-40">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
