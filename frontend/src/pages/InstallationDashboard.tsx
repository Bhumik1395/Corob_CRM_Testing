import { Fragment, useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { getInstallationDashboard, getInstallationFilters } from "../api/installation";
import type { InstallationDashboardResponse, InstallationDetailRow } from "../api/installation";
import { useAuth } from "../auth/AuthContext";
import { RegionLocationChart } from "../components/charts/RegionLocationChart";
import { SimpleBarChart } from "../components/charts/SimpleBarChart";
import { Card } from "../components/ui/Card";
import { KpiCard } from "../components/ui/KpiCard";
import { Pagination } from "../components/ui/Pagination";
import { Segmented } from "../components/ui/Segmented";
import { Select } from "../components/ui/Select";
import { SkeletonCard, SkeletonPanel } from "../components/Skeleton";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { formatMonthShort } from "../lib/format";

type Panel = "location" | "regions";

const th = "px-4 py-2.5 text-left text-xs font-medium text-muted";
const td = "px-4 py-2.5";

const DETAIL_COLUMNS: { key: keyof InstallationDetailRow; label: string }[] = [
    { key: "company", label: "Company" },
    { key: "dealer_code", label: "Dealer code" },
    { key: "dealer_name", label: "Dealer name" },
    { key: "master_model", label: "Master model" },
    { key: "machine_no", label: "Machine S/N" },
    { key: "install_date", label: "Installed" },
    { key: "ups_model", label: "UPS model" },
    { key: "ups_sn", label: "UPS S/N" },
    { key: "loc_up_rem", label: "Loc/Up" },
    { key: "zone", label: "Zone" },
    { key: "state", label: "State" },
    { key: "location", label: "Location" },
    { key: "eng_name", label: "Engineer" },
    { key: "supervisor", label: "Supervisor" },
];

function ZoneTable({ zones }: { zones: InstallationDashboardResponse["zoneBreakdown"] }) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const toggle = (zone: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(zone)) next.delete(zone);
            else next.add(zone);
            return next;
        });

    return (
        <div className="max-h-[250px] overflow-auto">
            <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[#F6F8F7]">
                    <tr>
                        <th className={`${th} w-10`} aria-label="Expand" />
                        <th className={th}>Region / State</th>
                        <th className={th}>Installations</th>
                        <th className={th}>Local</th>
                        <th className={th}>Upcountry</th>
                    </tr>
                </thead>
                <tbody>
                    {zones.length === 0 && (
                        <tr><td colSpan={5} className="p-6 text-center text-muted">No data for the current filters</td></tr>
                    )}
                    {zones.map((z) => {
                        const isOpen = expanded.has(z.zone);
                        return (
                            <Fragment key={z.zone}>
                                <tr className="cursor-pointer border-t border-border hover:bg-gray-50" onClick={() => toggle(z.zone)}>
                                    <td className={`${td} text-muted`}>{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                                    <td className={`${td} font-medium`}>{z.zone}</td>
                                    <td className={`${td} tabular-nums`}>{z.total.toLocaleString()}</td>
                                    <td className={`${td} tabular-nums`}>{z.local.toLocaleString()}</td>
                                    <td className={`${td} tabular-nums`}>{z.upcountry.toLocaleString()}</td>
                                </tr>
                                {isOpen &&
                                    z.states.map((s, i) => (
                                        <tr key={`${z.zone}-${s.state}`} className="border-t border-border bg-[#F6F8F7] text-[13px]">
                                            <td />
                                            <td className={td}><span className="mr-2 text-muted">#{i + 1}</span>{s.state}</td>
                                            <td className={`${td} tabular-nums`}>{s.total.toLocaleString()}</td>
                                            <td className={`${td} tabular-nums`}>{s.local.toLocaleString()}</td>
                                            <td className={`${td} tabular-nums`}>{s.upcountry.toLocaleString()}</td>
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

export default function InstallationDashboard() {
    const { token } = useAuth();
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [panel, setPanel] = useState<Panel>("location");
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const search = useDebouncedValue(searchInput, 400);

    useEffect(() => {
        setPage(1);
    }, [search]);

    const updateFilter = (key: string, value: string) => {
        setPage(1);
        setFilters((prev) => {
            const next = { ...prev };
            if (value) next[key] = value;
            else delete next[key];
            return next;
        });
    };

    const { data: options } = useQuery({
        queryKey: ["installationFilters"],
        queryFn: () => getInstallationFilters(token!),
        enabled: !!token,
        retry: false,
    });

    const { data, isLoading, isFetching, isError, error } = useQuery({
        queryKey: ["installation", filters, search, page],
        queryFn: () => getInstallationDashboard(token!, filters, search, page),
        enabled: !!token,
        placeholderData: keepPreviousData,
        retry: false,
    });

    const trend = useMemo(
        () => (data?.monthlyTrend ?? []).map((m) => ({ label: formatMonthShort(m.year_month), count: m.count })),
        [data]
    );

    const locationByRegion = useMemo(
        () =>
            (data?.zoneBreakdown ?? []).map((z) => ({
                region: z.zone,
                Local: z.local,
                Upcountry: z.upcountry,
            })),
        [data]
    );

    const noData = isError && (error as any)?.error === "no_data";

    return (
        <div className="flex flex-col gap-4 px-6 pb-6">
            <div className="flex flex-wrap items-center gap-2">
                <Select className="w-52" aria-label="Company" value={filters.company ?? ""} onChange={(e) => updateFilter("company", e.target.value)}>
                    <option value="">All Companies</option>
                    {options?.companies.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
                <Select className="w-44" aria-label="State" value={filters.state ?? ""} onChange={(e) => updateFilter("state", e.target.value)}>
                    <option value="">All States</option>
                    {options?.states.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Select className="w-28" aria-label="Year" value={filters.year ?? ""} onChange={(e) => updateFilter("year", e.target.value)}>
                    <option value="">All Years</option>
                    {options?.years.map((y) => <option key={y} value={y}>{y}</option>)}
                </Select>
                {isFetching && !isLoading && <span className="text-xs text-muted">Updating…</span>}
            </div>

            {isLoading && (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-5 gap-4">
                        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                    <SkeletonPanel height={240} />
                    <SkeletonPanel height={300} />
                </div>
            )}

            {noData && (
                <Card>
                    <p className="text-sm text-muted">
                        No installation data yet.{" "}
                        <Link to="/dashboard/upload" className="font-medium text-forest underline">
                            Upload the Installation Excel
                        </Link>{" "}
                        to see the analysis.
                    </p>
                </Card>
            )}

            {!isLoading && isError && !noData && (
                <Card>
                    <p className="text-sm text-red">{(error as any)?.message ?? "Failed to load installation data."}</p>
                </Card>
            )}

            {data && (
                <>
                    <div className="grid grid-cols-5 gap-4">
                        <KpiCard tone="green" label="Installations" value={data.kpis.totalInstallations.toLocaleString()} />
                        <KpiCard label="Companies" value={data.kpis.companies.toLocaleString()} />
                        <KpiCard label="Dealers" value={data.kpis.dealers.toLocaleString()} />
                        <KpiCard label="Engineers" value={data.kpis.engineers.toLocaleString()} />
                        <KpiCard
                            label="With UPS recorded"
                            value={`${data.kpis.upsAttachPct}%`}
                            caption={`${data.kpis.upcountryPct}% upcountry`}
                        />
                    </div>

                    <div className="grid grid-cols-5 gap-4">
                        <Card className="col-span-3" title="Installations per month">
                            <SimpleBarChart data={trend} xKey="label" yKey="count" height={250} showTooltip={false} />
                        </Card>

                        <Card
                            className="col-span-2"
                            title={panel === "location" ? "Local vs upcountry by region" : "Region-wise breakdown"}
                            bodyClassName="mt-3 border-t border-border"
                            actions={
                                <Segmented<Panel>
                                    label="Breakdown view"
                                    value={panel}
                                    onChange={setPanel}
                                    options={[
                                        { value: "location", label: "Location" },
                                        { value: "regions", label: "Regions" },
                                    ]}
                                />
                            }
                        >
                            {panel === "location" && (
                                <div className="px-5 py-4">
                                    <RegionLocationChart data={locationByRegion} height={210} />
                                </div>
                            )}
                            {panel === "regions" && <ZoneTable zones={data.zoneBreakdown} />}
                        </Card>
                    </div>

                    <Card
                        title="Installation detail"
                        bodyClassName="mt-3 border-t border-border"
                        actions={
                            <div className="relative">
                                <Search size={14} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                                <input
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Search dealer, machine S/N, UPS S/N, engineer…"
                                    aria-label="Search installations"
                                    className="h-9 w-80 rounded-full border border-border bg-surface pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lime"
                                />
                            </div>
                        }
                    >
                        <div className="max-h-[420px] overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10 bg-[#F6F8F7]">
                                    <tr>
                                        {DETAIL_COLUMNS.map((c) => <th key={c.key} className={`${th} whitespace-nowrap`}>{c.label}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.detailTable.rows.length === 0 && (
                                        <tr><td colSpan={DETAIL_COLUMNS.length} className="p-6 text-center text-muted">No installations match these filters</td></tr>
                                    )}
                                    {data.detailTable.rows.map((r, i) => (
                                        <tr key={`${r.machine_no}-${r.install_date}-${i}`} className="border-t border-border hover:bg-gray-50">
                                            {DETAIL_COLUMNS.map((c) => (
                                                <td key={c.key} className={`${td} whitespace-nowrap ${c.key === "machine_no" ? "font-medium" : ""}`}>
                                                    {r[c.key] || "—"}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            page={page}
                            pageSize={data.detailTable.pageSize}
                            totalRows={data.detailTable.totalRows}
                            noun="installations"
                            onPageChange={setPage}
                        />
                    </Card>
                </>
            )}
        </div>
    );
}