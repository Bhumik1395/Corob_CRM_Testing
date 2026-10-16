import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { RepeatMachineRow } from "../../api/serviceCalls";
import { Pagination } from "../ui/Pagination";

const th = "px-4 py-2.5 text-left text-xs font-medium text-muted";
const td = "px-4 py-2.5 align-top";

export function RepeatMachinesTable({
    rows,
    page,
    pageSize,
    totalRows,
    onPageChange,
}: {
    rows: RepeatMachineRow[];
    page: number;
    pageSize: number;
    totalRows: number;
    onPageChange: (page: number) => void;
}) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const toggle = (machine: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(machine)) next.delete(machine);
            else next.add(machine);
            return next;
        });
    };

    return (
        <div className="flex flex-col">
            <div className="max-h-[300px] overflow-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-[#F6F8F7]">
                        <tr>
                            <th className={`${th} w-10`} aria-label="Expand" />
                            <th className={th}>Machine no.</th>
                            <th className={th}>Repeat calls</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-6 text-center text-muted">
                                    No repeat machines on this page
                                </td>
                            </tr>
                        )}
                        {rows.map((row) => {
                            const isOpen = expanded.has(row.machine_no);
                            return (
                                <Fragment key={row.machine_no}>
                                    <tr
                                        className="cursor-pointer border-t border-border hover:bg-gray-50"
                                        onClick={() => toggle(row.machine_no)}
                                    >
                                        <td className={`${td} text-muted`}>
                                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </td>
                                        <td className={`${td} font-medium`}>{row.machine_no}</td>
                                        <td className={td}>
                                            <span className="rounded-full bg-red-soft px-2 py-0.5 text-xs font-medium text-red">
                                                {row.repeat_count}
                                            </span>
                                        </td>
                                    </tr>
                                    {isOpen && (
                                        <tr>
                                            <td colSpan={3} className="bg-[#F6F8F7] p-0">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full min-w-[860px] text-sm">
                                                        <thead>
                                                            <tr className="text-muted">
                                                                <th className={`${th} pl-12`}>Date</th>
                                                                <th className={th}>Engineer</th>
                                                                <th className={th}>Customer</th>
                                                                <th className={th}>Dealer</th>
                                                                <th className={th}>Location</th>
                                                                <th className={th}>Status</th>
                                                                <th className={th}>Visit / service</th>
                                                                <th className={th}>Remarks / solution</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-surface">
                                                            {row.calls.map((c, i) => (
                                                                <tr key={i} className="border-t border-border">
                                                                    <td className={`${td} whitespace-nowrap pl-12`}>{c.call_date}</td>
                                                                    <td className={`${td} whitespace-nowrap`}>
                                                                        <div className="font-medium">{c.employee_name || "—"}</div>
                                                                        <div className="text-xs text-muted">{c.eng_code}</div>
                                                                    </td>
                                                                    <td className={td}>{c.customer}</td>
                                                                    <td className={td}>
                                                                        <div>{c.dealer_name}</div>
                                                                        <div className="text-xs text-muted">{c.dealer_code}</div>
                                                                    </td>
                                                                    <td className={td}>
                                                                        <div>{c.city}</div>
                                                                        <div className="text-xs text-muted">{c.state}</div>
                                                                    </td>
                                                                    <td className={`${td} whitespace-nowrap`}>{c.status}</td>
                                                                    <td className={`${td} whitespace-nowrap`}>
                                                                        <div>{c.visit_type}</div>
                                                                        <div className="text-xs text-muted">{c.service_type}</div>
                                                                    </td>
                                                                    <td className={`${td} min-w-[180px] whitespace-normal break-words`}>{c.remarks}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <Pagination page={page} pageSize={pageSize} totalRows={totalRows} noun="machines" onPageChange={onPageChange} />
        </div>
    );
}