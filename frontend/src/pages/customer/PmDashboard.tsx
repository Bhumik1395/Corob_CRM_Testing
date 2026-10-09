import { Fragment, useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, FileText, FileX, Search } from "lucide-react";
import { getPmDashboard, getPmFilterOptions, getCompanies, pmPdfUrl } from "../../api/pm";
import { useAuth } from "../../auth/AuthContext";
import { PmTrendChart } from "../../components/charts/PmTrendChart";
import { PdfViewerModal } from "../../components/PdfViewerModal";
import { PmDashboardSkeleton } from "../../components/skeletons/Pmdashboardskeleton";
import { PmRuleQuiz } from "../../components/PmRuleQuiz";
import { PmRuleHistory } from "../../components/PmRuleHistory";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Pagination } from "../../components/ui/Pagination";
import { Segmented } from "../../components/ui/Segmented";
import { Select } from "../../components/ui/Select";
import { formatMonthFull, formatMonthShort } from "../../lib/format";

const ALL = "__all__";

type TrendView = "monthly" | "weekly";

const th = "px-4 py-2.5 text-left text-xs font-medium text-muted";
const td = "px-4 py-2.5";

export default function PmDashboard() {
    const { token, roles, company: myCompany } = useAuth();
    const [state, setState] = useState("");
    const [page, setPage] = useState(1);
    const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
    const [openPdf, setOpenPdf] = useState<{ url: string; title: string } | null>(null);
    const [pdfMissingTicket, setPdfMissingTicket] = useState<string | null>(null);

    const [trendView, setTrendView] = useState<TrendView>("monthly");
    const [weeklyMonth, setWeeklyMonth] = useState<string | undefined>(undefined);

    const [dealerSearchInput, setDealerSearchInput] = useState("");
    const [dealerSearch, setDealerSearch] = useState("");
    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            setDealerSearch(dealerSearchInput.trim());
        }, 300);
        return () => clearTimeout(t);
    }, [dealerSearchInput]);

    const [detailState, setDetailState] = useState("");
    const [detailMonth, setDetailMonth] = useState("");

    const [employeeCompany, setEmployeeCompany] = useState(roles.includes("corob_employee") ? ALL : (myCompany ?? ""));
    const isEmployee = roles.includes("corob_employee");
    const activeCompany = isEmployee ? employeeCompany : myCompany ?? undefined;
    const showCompanyColumn = activeCompany === ALL;

    const { data: companiesData } = useQuery({
        queryKey: ["companies"],
        queryFn: () => getCompanies(token!),
        enabled: !!token && isEmployee,
    });

    const { data: filterOptions } = useQuery({
        queryKey: ["pmFilterOptions", activeCompany],
        queryFn: () => getPmFilterOptions(token!, activeCompany),
        enabled: !!token && !!activeCompany,
    });

    const { data, isLoading, isFetching, isError, error } = useQuery({
        queryKey: ["pmDashboard", activeCompany, state, weeklyMonth, dealerSearch, detailState, detailMonth, page],
        queryFn: () =>
            getPmDashboard(token!, {
                company: activeCompany,
                state: state || undefined,
                month: weeklyMonth,
                dealerCode: dealerSearch || undefined,
                detailState: detailState || undefined,
                detailMonth: detailMonth || undefined,
                page,
            }),
        enabled: !!token && !!activeCompany,
        placeholderData: keepPreviousData,
    });

    const toggleRegion = (region: string) =>
        setExpandedRegions((prev) => {
            const next = new Set(prev);
            if (next.has(region)) next.delete(region);
            else next.add(region);
            return next;
        });

    const handleOpenPdf = async (ticketNo: string) => {
        setPdfMissingTicket(null);
        const url = pmPdfUrl(ticketNo);
        try {
            const res = await fetch(url, { method: "HEAD" });
            const contentType = res.headers.get("content-type") ?? "";
            if (res.ok && contentType.includes("application/pdf")) {
                setOpenPdf({ url, title: `PM Report — ${ticketNo}` });
            } else {
                setPdfMissingTicket(ticketNo);
            }
        } catch {
            setPdfMissingTicket(ticketNo);
        }
    };

    const showContent = !!activeCompany && !isLoading && !isError && !!data;
    const selectedWeeklyMonth = weeklyMonth ?? data?.weeklyTrendMonth ?? "";

    const trendPoints =
        data == null
            ? []
            : trendView === "monthly"
                ? data.monthlyTrend.map((d) => ({ label: formatMonthShort(d.year_month), value: d.pm_count }))
                : data.weeklyTrend.map((d) => ({ label: d.year_week, value: d.pm_count }));

    return (
        <div className="flex flex-col gap-4 px-6 pb-6">
            <div className="flex flex-wrap items-center gap-2">
                {isEmployee && (
                    <Select
                        className="w-64"
                        aria-label="Company"
                        value={employeeCompany}
                        onChange={(e) => {
                            setPage(1);
                            setEmployeeCompany(e.target.value);
                        }}
                    >
                        <option value={ALL}>All companies</option>
                        {companiesData?.companies.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </Select>
                )}
                {activeCompany && (
                    <Select
                        className="w-44"
                        aria-label="State"
                        value={state}
                        onChange={(e) => {
                            setPage(1);
                            setState(e.target.value);
                        }}
                    >
                        <option value="">All States</option>
                        {filterOptions?.states.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </Select>
                )}
                {isFetching && !isLoading && <span className="text-xs text-muted">Updating…</span>}
            </div>

            {!activeCompany && (
                <p className="text-sm text-muted">
                    {isEmployee ? "Select a company to view its PM dashboard." : "No company assigned to this account."}
                </p>
            )}

            {activeCompany && isLoading && <PmDashboardSkeleton />}

            {activeCompany && !isLoading && isError && (
                <Card>
                    <p className="text-sm text-red">
                        {(error as any)?.detail?.message ?? (error as any)?.message ?? "Could not load PM data."}
                    </p>
                </Card>
            )}

            {showContent && data && (
                <>
                    {isEmployee && (
                        <div>
                            <PmRuleQuiz token={token!} company={activeCompany!} />
                            <PmRuleHistory token={token!} company={activeCompany!} />
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                        <KpiCard label="Total PMs" value={data.kpis.totalPms.toLocaleString()} />
                        <KpiCard
                            tone="green"
                            label="PM Done"
                            value={data.kpis.pmDone.toLocaleString()}
                        />
                        <KpiCard
                            tone="red"
                            label="Dispute"
                            value={data.kpis.pmNotDone.toLocaleString()}
                        />
                    </div>

                    <div className="grid grid-cols-5 gap-4">
                        <Card
                            className={state || data.regionBreakdown.length === 0 ? "col-span-5" : "col-span-3"}
                            title="PMs over time"
                            subtitle={
                                trendView === "monthly"
                                    ? "New PMs per month"
                                    : `New PMs per week — ${formatMonthFull(selectedWeeklyMonth)}`
                            }
                            actions={
                                <>
                                    {trendView === "weekly" && (
                                        <Select
                                            className="w-32"
                                            aria-label="Month for weekly view"
                                            value={selectedWeeklyMonth}
                                            onChange={(e) => setWeeklyMonth(e.target.value || undefined)}
                                        >
                                            {data.availableMonths.map((m) => (
                                                <option key={m} value={m}>{formatMonthShort(m)}</option>
                                            ))}
                                        </Select>
                                    )}
                                    <Segmented<TrendView>
                                        label="Trend view"
                                        value={trendView}
                                        onChange={setTrendView}
                                        options={[
                                            { value: "monthly", label: "Monthly" },
                                            { value: "weekly", label: "Weekly" },
                                        ]}
                                    />
                                </>
                            }
                        >
                            <PmTrendChart data={trendPoints} seriesName={trendView === "monthly" ? "PMs this month" : "PMs this week"} />
                        </Card>

                        {!state && data.regionBreakdown.length > 0 && (
                            <Card className="col-span-2" title="Region-wise breakdown" bodyClassName="mt-3 border-t border-border">
                                <div className="max-h-[250px] overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 z-10 bg-[#F6F8F7]">
                                            <tr>
                                                <th className={`${th} w-10`} aria-label="Expand" />
                                                <th className={th}>Region</th>
                                                <th className={th}>Total</th>
                                                <th className={th}>PM Done</th>
                                                <th className={th}>Dispute</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.regionBreakdown.map((region) => {
                                                const isOpen = expandedRegions.has(region.region);
                                                return (
                                                    <Fragment key={region.region}>
                                                        <tr
                                                            className="cursor-pointer border-t border-border hover:bg-gray-50"
                                                            onClick={() => toggleRegion(region.region)}
                                                        >
                                                            <td className={`${td} text-muted`}>
                                                                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                            </td>
                                                            <td className={`${td} font-medium`}>{region.region}</td>
                                                            <td className={`${td} tabular-nums`}>{region.total_pms.toLocaleString()}</td>
                                                            <td className={`${td} tabular-nums text-green`}>{region.closed_pms.toLocaleString()}</td>
                                                            <td className={`${td} tabular-nums text-red`}>{region.open_pms.toLocaleString()}</td>
                                                        </tr>
                                                        {isOpen &&
                                                            region.states.map((s, i) => (
                                                                <tr key={`${region.region}-${s.state}`} className="border-t border-border bg-[#F6F8F7] text-[13px]">
                                                                    <td />
                                                                    <td className={td}>
                                                                        <span className="mr-2 text-muted">#{i + 1}</span>
                                                                        {s.state}
                                                                    </td>
                                                                    <td className={`${td} tabular-nums`}>{s.total_pms.toLocaleString()}</td>
                                                                    <td className={`${td} tabular-nums text-green`}>{s.closed_pms.toLocaleString()}</td>
                                                                    <td className={`${td} tabular-nums text-red`}>{s.open_pms.toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                    </Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </div>

                    <Card
                        title="PM detail"
                        bodyClassName="mt-3 border-t border-border"
                        actions={
                            <>
                                <Select
                                    className="w-40"
                                    aria-label="Filter detail by state"
                                    value={detailState}
                                    onChange={(e) => {
                                        setPage(1);
                                        setDetailState(e.target.value);
                                    }}
                                >
                                    <option value="">All States</option>
                                    {filterOptions?.states.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </Select>
                                <Select
                                    className="w-44"
                                    aria-label="Filter detail by month"
                                    value={detailMonth}
                                    onChange={(e) => {
                                        setPage(1);
                                        setDetailMonth(e.target.value);
                                    }}
                                >
                                    <option value="">All Months</option>
                                    {filterOptions?.months.map((m) => (
                                        <option key={m} value={m}>{formatMonthFull(m)}</option>
                                    ))}
                                </Select>
                                <div className="relative">
                                    <Search size={14} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                                    <input
                                        value={dealerSearchInput}
                                        onChange={(e) => setDealerSearchInput(e.target.value)}
                                        placeholder="Search dealer code…"
                                        aria-label="Search dealer code"
                                        className="h-9 w-52 rounded-full border border-border bg-surface pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lime"
                                    />
                                </div>
                            </>
                        }
                    >
                        {pdfMissingTicket && (
                            <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                <FileX size={14} className="shrink-0" />
                                PDF not found for ticket {pdfMissingTicket}.
                            </div>
                        )}

                        <div className="max-h-[340px] overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10 bg-[#F6F8F7]">
                                    <tr>
                                        <th className={th}>Ticket no</th>
                                        {showCompanyColumn && <th className={th}>Company</th>}
                                        <th className={th}>Dealer code</th>
                                        <th className={th}>Dealer name</th>
                                        <th className={th}>Date</th>
                                        <th className={th}>Resolution remark</th>
                                        <th className={th}>PDF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.pmDetailTable.rows.length === 0 && (
                                        <tr>
                                            <td colSpan={showCompanyColumn ? 7 : 6} className="p-6 text-center text-muted">
                                                No PM records match these filters
                                            </td>
                                        </tr>
                                    )}
                                    {data.pmDetailTable.rows.map((row) => (
                                        <tr key={`${row.company ?? ""}-${row.ticket_no}`} className="border-t border-border hover:bg-gray-50">
                                            <td className={`${td} whitespace-nowrap font-medium`}>{row.ticket_no}</td>
                                            {showCompanyColumn && <td className={td}>{row.company}</td>}
                                            <td className={td}>{row.dealer_code}</td>
                                            <td className={td}>{row.dealer_name}</td>
                                            <td className={`${td} whitespace-nowrap`}>{row.call_date}</td>
                                            <td className={td}>{row.remarks}</td>
                                            <td className={td}>
                                                <button
                                                    onClick={() => handleOpenPdf(row.ticket_no)}
                                                    className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:bg-gray-50"
                                                >
                                                    <FileText size={12} /> View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            page={page}
                            pageSize={data.pmDetailTable.pageSize}
                            totalRows={data.pmDetailTable.totalRows}
                            onPageChange={setPage}
                        />
                    </Card>
                </>
            )}

            {openPdf && <PdfViewerModal url={openPdf.url} title={openPdf.title} onClose={() => setOpenPdf(null)} />}
        </div>
    );
}