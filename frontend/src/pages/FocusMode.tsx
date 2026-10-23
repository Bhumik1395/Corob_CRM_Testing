import { Fragment, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getFocusDashboard, getFilterOptions } from "../api/serviceCalls";
import type { RegionBreakdownRow } from "../api/serviceCalls";
import { SimpleBarChart } from "../components/charts/SimpleBarChart";
import { RegionVisitTypeChart } from "../components/charts/RegionVisitTypeChart";
import { MonthlyTrendChart } from "../components/charts/MonthlyTrendChart";
import { RepeatMachinesTable } from "../components/tables/RepeatMachinesTable";
import { FocusModeSkeleton } from "../components/skeletons/Focusmodeskeleton";
import { Card } from "../components/ui/Card";
import { KpiCard } from "../components/ui/KpiCard";
import { Legend } from "../components/ui/Legend";
import { Segmented } from "../components/ui/Segmented";
import { Select } from "../components/ui/Select";
import { useFocusFilter } from "../context/FocusFilterContext";
import { formatHours } from "../lib/format";
import { COLORS } from "../lib/palette";

type Panel = "regions" | "repeat";

const th = "px-4 py-2.5 text-left text-xs font-medium text-muted";
const td = "px-4 py-2.5";

function RegionTable({ regions }: { regions: RegionBreakdownRow[] }) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const toggle = (region: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(region)) next.delete(region);
            else next.add(region);
            return next;
        });

    return (
        <div className="max-h-[340px] overflow-auto">
            <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[#F6F8F7]">
                    <tr>
                        <th className={`${th} w-10`} aria-label="Expand" />
                        <th className={th}>Region</th>
                        <th className={th}>Total calls</th>
                        <th className={th}>Repeat</th>
                        <th className={th}>Under-norm</th>
                        <th className={th}>Under-norm %</th>
                        <th className={th}>Over-norm</th>
                        <th className={th}>Over-norm %</th>
                    </tr>
                </thead>
                <tbody>
                    {regions.length === 0 && (
                        <tr>
                            <td colSpan={8} className="p-6 text-center text-muted">
                                No data for the current filters
                            </td>
                        </tr>
                    )}
                    {regions.map((region) => {
                        const isOpen = expanded.has(region.region);
                        return (
                            <Fragment key={region.region}>
                                <tr className="cursor-pointer border-t border-border hover:bg-gray-50" onClick={() => toggle(region.region)}>
                                    <td className={`${td} text-muted`}>
                                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </td>
                                    <td className={`${td} font-medium`}>{region.region}</td>
                                    <td className={`${td} tabular-nums`}>{region.total_calls.toLocaleString()}</td>
                                    <td className={`${td} tabular-nums`}>{region.repeat_calls}</td>
                                    <td className={`${td} tabular-nums`}>{region.under_norm_calls.toLocaleString()}</td>
                                    <td className={`${td} tabular-nums text-green`}>{region.under_norm_pct}%</td>
                                    <td className={`${td} tabular-nums`}>{region.over_norm_calls.toLocaleString()}</td>
                                    <td className={`${td} tabular-nums text-red`}>{region.over_norm_pct}%</td>
                                </tr>
                                {isOpen &&
                                    region.states.map((s, i) => (
                                        <tr key={`${region.region}-${s.state}`} className="border-t border-border bg-[#F6F8F7] text-[13px]">
                                            <td />
                                            <td className={td}>
                                                <span className="mr-2 text-muted">#{i + 1}</span>
                                                {s.state}
                                            </td>
                                            <td className={`${td} tabular-nums`}>{s.total_calls.toLocaleString()}</td>
                                            <td className={`${td} tabular-nums`}>{s.repeat_calls}</td>
                                            <td className={`${td} tabular-nums`}>{s.under_norm_calls.toLocaleString()}</td>
                                            <td className={`${td} tabular-nums text-green`}>{s.under_norm_pct}%</td>
                                            <td className={`${td} tabular-nums`}>{s.over_norm_calls.toLocaleString()}</td>
                                            <td className={`${td} tabular-nums text-red`}>{s.over_norm_pct}%</td>
                                        </tr>
                                    ))}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default function FocusMode() {
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [page, setPage] = useState(1);
    const [panel, setPanel] = useState<Panel>("regions");
    const { setCustomer } = useFocusFilter();

    const { data: filterOptions } = useQuery({
        queryKey: ["filterOptions"],
        queryFn: getFilterOptions,
    });

    const { data, isLoading, isFetching, isError } = useQuery({
        queryKey: ["focus", filters, page],
        queryFn: () => getFocusDashboard(filters, page, 50),
        placeholderData: keepPreviousData,
    });

    const updateFilter = (key: string, value: string) => {
        setPage(1);
        setFilters((prev) => {
            const next = { ...prev };
            if (value) next[key] = value;
            else delete next[key];
            return next;
        });
        if (key === "customer") setCustomer(value);
    };

    return (
        <div className="flex flex-col gap-4 px-6 pb-6">
            <div className="flex flex-wrap items-center gap-2">
                <Select
                    className="w-52"
                    aria-label="Customer"
                    value={filters.customer ?? ""}
                    onChange={(e) => updateFilter("customer", e.target.value)}
                >
                    <option value="">All Customers</option>
                    {filterOptions?.customers.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </Select>
                <Select
                    className="w-44"
                    aria-label="State"
                    value={filters.state ?? ""}
                    onChange={(e) => updateFilter("state", e.target.value)}
                >
                    <option value="">All States</option>
                    {filterOptions?.states.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </Select>
                <Select
                    className="w-44"
                    aria-label="Service type"
                    value={filters.service_type ?? ""}
                    onChange={(e) => updateFilter("service_type", e.target.value)}
                >
                    <option value="">All Service Types</option>
                    {filterOptions?.serviceTypes?.map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                    {filterOptions?.hasBlankServiceType && <option value="__blank__">Not specified</option>}
                </Select>
                <Select
                    className="w-32"
                    aria-label="Year"
                    value={filters.year ?? ""}
                    onChange={(e) => updateFilter("year", e.target.value)}
                >
                    <option value="">All Years</option>
                    {filterOptions?.years?.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </Select>
                {isFetching && !isLoading && <span className="text-xs text-muted">Updating…</span>}
            </div>

            {isLoading && <FocusModeSkeleton />}

            {!isLoading && (isError || !data) && (
                <Card>
                    <p className="text-sm text-muted">Failed to load dashboard data.</p>
                </Card>
            )}

            {!isLoading && data && (
                <>
                    <div className="grid grid-cols-5 gap-4">
                        <KpiCard
                            tone="green"
                            label="Total calls"
                            value={data.kpis.totalCalls.toLocaleString()}
                        />
                        <KpiCard
                            tone="red"
                            label="Repeat calls"
                            value={data.kpis.repeatCalls.toLocaleString()}
                        />
                        <KpiCard label="Under-norm %" value={`${data.kpis.underNormPct}%`} />
                        <KpiCard label="Avg local call closure" value={formatHours(data.kpis.avgLocalClosureHours)} />
                        <KpiCard label="Avg upcountry/remote closure" value={formatHours(data.kpis.avgUpcountryClosureHours)} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Card
                            className="col-span-2"
                            title="Month-on-month trend"
                            actions={
                                <Legend
                                    items={[
                                        { label: "Total calls", color: COLORS.green },
                                        { label: "Repeat calls", color: COLORS.red },
                                    ]}
                                />
                            }
                        >
                            <MonthlyTrendChart data={data.monthlyTrend} />
                        </Card>
                        <Card title="Visit type by region">
                            <RegionVisitTypeChart data={data.charts.regionVisitType} />
                        </Card>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Card
                            className="col-span-2"
                            title={panel === "regions" ? "Region-wise breakdown" : "Repeat machines"}
                            bodyClassName="mt-3 border-t border-border"
                            actions={
                                <Segmented<Panel>
                                    label="Table view"
                                    value={panel}
                                    onChange={setPanel}
                                    options={[
                                        { value: "regions", label: "Regions" },
                                        {
                                            value: "repeat",
                                            label: `Repeat machines (${data.repeatMachinesTable.totalRows.toLocaleString()})`,
                                        },
                                    ]}
                                />
                            }
                        >
                            {panel === "regions" ? (
                                <RegionTable regions={data.regionBreakdown} />
                            ) : (
                                <RepeatMachinesTable
                                    rows={data.repeatMachinesTable.rows}
                                    page={data.repeatMachinesTable.page}
                                    pageSize={data.repeatMachinesTable.pageSize}
                                    totalRows={data.repeatMachinesTable.totalRows}
                                    onPageChange={setPage}
                                />
                            )}
                        </Card>

                        <Card title="Top repeat machines" subtitle="Calls per machine, top 10">
                            <SimpleBarChart
                                horizontal
                                color={COLORS.red}
                                height={320}
                                data={data.charts.repeatMachines}
                                xKey="machine"
                                yKey="calls"
                            />
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}