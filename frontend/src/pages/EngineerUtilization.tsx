import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { getFilterOptions, getUtilizationDashboard } from "../api/serviceCalls";
import type { EngineerUtilizationRow } from "../api/serviceCalls";
import { EngineerPanel } from "../components/engineers/EngineerPanel";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";

const th = "px-4 py-2.5 text-left text-xs font-medium text-muted";
const td = "px-4 py-2.5";

export default function EngineerUtilization() {
    const [customer, setCustomer] = useState("");
    const [search, setSearch] = useState("");
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [selected, setSelected] = useState<EngineerUtilizationRow | null>(null);

    const { data: filterOptions } = useQuery({
        queryKey: ["filterOptions"],
        queryFn: getFilterOptions,
    });

    const { data, isLoading, isError } = useQuery({
        queryKey: ["utilization", customer],
        queryFn: () => getUtilizationDashboard(customer || undefined),
    });

    const engineersBySupervisor = useMemo(() => {
        const map: Record<string, EngineerUtilizationRow[]> = {};
        for (const eng of data?.engineers ?? []) {
            (map[eng.supervisor] ??= []).push(eng);
        }
        return map;
    }, [data]);

    const filteredSupervisors = useMemo(() => {
        if (!data) return [];
        const q = search.trim().toLowerCase();
        if (!q) return data.supervisors;
        return data.supervisors.filter(
            (s) =>
                s.supervisor.toLowerCase().includes(q) ||
                (engineersBySupervisor[s.supervisor] ?? []).some(
                    (e) =>
                        e.employee_name.toLowerCase().includes(q) ||
                        String(e.eng_code).toLowerCase().includes(q)
                )
        );
    }, [data, search, engineersBySupervisor]);

    const toggle = (supervisor: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(supervisor)) next.delete(supervisor);
            else next.add(supervisor);
            return next;
        });

    return (
        <div className="flex flex-col gap-4 px-6 pb-6 lg:h-[calc(100vh-88px)]">
            <div className="flex flex-wrap items-center gap-3">
                <Select
                    className="w-56"
                    aria-label="Customer"
                    value={customer}
                    onChange={(e) => {
                        setCustomer(e.target.value);
                        setSelected(null);
                    }}
                >
                    <option value="">All Companies</option>
                    {filterOptions?.customers.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </Select>
                {data && (
                    <p className="text-xs text-muted">
                        Based on {data.totalWorkingDays} working days ({data.distinctMonths} month
                        {data.distinctMonths > 1 ? "s" : ""} in this file, 26 working days each)
                    </p>
                )}
            </div>

            {isLoading && <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />}

            {!isLoading && (isError || !data) && (
                <Card>
                    <p className="text-sm text-muted">
                        Failed to load utilization data. Upload a Service Calls file first.
                    </p>
                </Card>
            )}

            {!isLoading && data && (
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
                    <Card
                        className="min-h-0"
                        title="Supervisors"
                        bodyClassName="mt-3 overflow-auto border-t border-border"
                        actions={
                            <div className="relative">
                                <Search size={14} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search supervisor or engineer…"
                                    aria-label="Search supervisor or engineer"
                                    className="h-9 w-60 rounded-full border border-border bg-surface pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lime"
                                />
                            </div>
                        }
                    >
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-[#F6F8F7]">
                                <tr>
                                    <th className={`${th} w-10`} aria-label="Expand" />
                                    <th className={th}>Supervisor</th>
                                    <th className={th}>Engineers</th>
                                    <th className={th}>Avg util.</th>
                                    <th className={th}>Avg under-norm</th>
                                    <th className={th}>Calls</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSupervisors.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-6 text-center text-muted">
                                            No matching supervisors or engineers
                                        </td>
                                    </tr>
                                )}
                                {filteredSupervisors.map((row) => {
                                    const isOpen = expanded.has(row.supervisor);
                                    const engineers = engineersBySupervisor[row.supervisor] ?? [];
                                    return (
                                        <Fragment key={row.supervisor}>
                                            <tr
                                                className="cursor-pointer border-t border-border hover:bg-gray-50"
                                                onClick={() => toggle(row.supervisor)}
                                            >
                                                <td className={`${td} text-muted`}>
                                                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                </td>
                                                <td className={`${td} font-medium`}>{row.supervisor}</td>
                                                <td className={`${td} tabular-nums`}>{row.num_engineers}</td>
                                                <td className={`${td} tabular-nums`}>{row.avg_utilization_pct}%</td>
                                                <td className={`${td} tabular-nums`}>{row.avg_under_norm_pct}%</td>
                                                <td className={`${td} tabular-nums`}>{row.total_calls.toLocaleString()}</td>
                                            </tr>
                                            {isOpen &&
                                                engineers.map((eng) => {
                                                    const isSelected = selected?.eng_code === eng.eng_code;
                                                    return (
                                                        <tr
                                                            key={eng.eng_code}
                                                            onClick={() => setSelected(eng)}
                                                            className={`cursor-pointer border-t border-border text-[13px] ${isSelected ? "bg-lime-soft" : "bg-[#F6F8F7] hover:bg-lime-soft/60"
                                                                }`}
                                                            aria-selected={isSelected}
                                                        >
                                                            <td />
                                                            <td className={`${td} pl-8 font-medium`}>{eng.employee_name}</td>
                                                            <td className={`${td} tabular-nums text-muted`}>{eng.eng_code}</td>
                                                            <td className={`${td} tabular-nums`}>{eng.utilization_pct}%</td>
                                                            <td className={`${td} tabular-nums`}>{eng.under_norm_pct}%</td>
                                                            <td className={`${td} tabular-nums`}>{eng.total_calls.toLocaleString()}</td>
                                                        </tr>
                                                    );
                                                })}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Card>

                    <Card
                        className="min-h-0"
                        title="Engineer analysis"
                        bodyClassName="mt-3 overflow-auto border-t border-border"
                    >
                        <EngineerPanel engineer={selected} />
                    </Card>
                </div>
            )}
        </div>
    );
}