import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { answerReview, getReviewRemarks, getRemarkRows, markRemarkRows } from "../api/pm";
import type { RemarkRow, RemarkTicketRow } from "../api/pm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { Pagination } from "./ui/Pagination";

type Label = "PM Done" | "Dispute";
type StatusFilter = "all" | "unresolved" | "done" | "dispute";

const FILTERS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "unresolved", label: "Unresolved" },
    { value: "done", label: "PM Done" },
    { value: "dispute", label: "Dispute" },
];

const ACTIVE = { background: "var(--color-accent-light)", color: "var(--color-accent)", borderColor: "var(--color-accent)" };
const rowKey = (r: { company: string; ticket_no: string }) => `${r.company}||${r.ticket_no}`;

function RemarkRows({ token, company, remarkKey, showCompany }: {
    token: string; company: string; remarkKey: string; showCompany: boolean;
}) {
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Map<string, { company: string; ticket_no: string }>>(new Map());
    const [allRows, setAllRows] = useState(false);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["pmReviewRows", company, remarkKey, page],
        queryFn: () => getRemarkRows(token, company, remarkKey, page, 25),
        placeholderData: keepPreviousData,
    });

    const mark = useMutation({
        mutationFn: (v: { label: Label | null; tickets?: { company: string; ticket_no: string }[]; all?: boolean }) =>
            markRemarkRows(token, {
                company,
                remark_key: remarkKey,
                label: v.label,
                all_rows: v.all,
                tickets: v.tickets,
            }),
        onSuccess: () => {
            setSelected(new Map());
            setAllRows(false);
            qc.invalidateQueries({ queryKey: ["pmReviewRows"] });
            qc.invalidateQueries({ queryKey: ["pmDashboard"] });
        },
    });

    if (isLoading) return <p className="p-3 text-sm text-gray-500">Loading rows…</p>;
    if (isError || !data) return <p className="p-3 text-sm text-red-600">Could not load rows.</p>;

    const rows = data.rows;
    const pageAll = rows.length > 0 && rows.every((r) => selected.has(rowKey(r)));
    const selectedCount = allRows ? data.total : selected.size;

    const toggleRow = (r: RemarkTicketRow) =>
        setSelected((prev) => {
            const next = new Map(prev);
            const k = rowKey(r);
            if (next.has(k)) next.delete(k);
            else next.set(k, { company: r.company, ticket_no: r.ticket_no });
            return next;
        });

    const togglePage = () =>
        setSelected((prev) => {
            const next = new Map(prev);
            rows.forEach((r) => {
                if (pageAll) next.delete(rowKey(r));
                else next.set(rowKey(r), { company: r.company, ticket_no: r.ticket_no });
            });
            return next;
        });

    const clearSelection = () => { setSelected(new Map()); setAllRows(false); };

    const applySelection = (label: Label | null) =>
        allRows
            ? mark.mutate({ label, all: true })
            : mark.mutate({ label, tickets: [...selected.values()] });

    const btn = "text-xs border rounded-md px-2.5 py-1 hover:bg-gray-50 disabled:opacity-60";

    return (
        <div className="bg-gray-50 px-3 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                <span>
                    {data.total.toLocaleString()} rows · {data.counts.done} PM Done · {data.counts.dispute} Dispute
                    {data.counts.overridden > 0 && ` · ${data.counts.overridden} set manually`}
                </span>
                {selectedCount > 0 && (
                    <span className="flex flex-wrap items-center gap-1">
                        <b>{selectedCount.toLocaleString()} selected</b>
                        <button className={btn} disabled={mark.isPending} onClick={() => applySelection("PM Done")}>Mark PM Done</button>
                        <button className={btn} disabled={mark.isPending} onClick={() => applySelection("Dispute")}>Mark Dispute</button>
                        <button className={btn} disabled={mark.isPending} onClick={() => applySelection(null)} title="Remove manual marks and go back to the remark's rule">
                            Reset
                        </button>
                        <button className="px-2 py-1 text-gray-500" onClick={clearSelection}>Clear</button>
                    </span>
                )}
            </div>

            {pageAll && !allRows && data.total > rows.length && (
                <div className="mb-2 rounded-md border bg-white px-3 py-1.5 text-xs">
                    All {rows.length} rows on this page are selected.{" "}
                    <button className="font-medium underline" onClick={() => setAllRows(true)}>
                        Select all {data.total.toLocaleString()} rows with this remark
                    </button>
                </div>
            )}
            {allRows && (
                <div className="mb-2 rounded-md border bg-white px-3 py-1.5 text-xs">
                    All {data.total.toLocaleString()} rows with this remark are selected.{" "}
                    <button className="font-medium underline" onClick={clearSelection}>Clear selection</button>
                </div>
            )}

            <div className="max-h-[320px] overflow-auto rounded-md border bg-white" style={{ borderColor: "var(--color-border)" }}>
                <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-gray-50">
                        <tr className="text-gray-500 text-xs uppercase">
                            <th className="p-2 w-8">
                                <input type="checkbox" aria-label="Select all rows on this page"
                                    checked={pageAll || allRows} disabled={allRows} onChange={togglePage} />
                            </th>
                            <th className="text-left p-2">Ticket</th>
                            <th className="text-left p-2">Dealer</th>
                            <th className="text-left p-2">Date</th>
                            <th className="text-left p-2">Remark</th>
                            <th className="text-left p-2">Current</th>
                            <th className="p-2 w-44"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={rowKey(r)} className="border-t align-top">
                                <td className="p-2">
                                    <input type="checkbox" aria-label={`Select ${r.ticket_no}`}
                                        checked={allRows || selected.has(rowKey(r))} disabled={allRows}
                                        onChange={() => toggleRow(r)} />
                                </td>
                                <td className="p-2 whitespace-nowrap font-medium">
                                    {r.ticket_no}
                                    {showCompany && <span className="block text-xs font-normal text-gray-400">{r.company}</span>}
                                </td>
                                <td className="p-2">
                                    {r.dealer_name}
                                    <span className="block text-xs text-gray-400">{r.dealer_code}</span>
                                </td>
                                <td className="p-2 whitespace-nowrap">{r.call_date}</td>
                                <td className="p-2 min-w-[220px] break-words text-xs text-gray-700">{r.remarks || "—"}</td>
                                <td className="p-2 text-xs">
                                    {r.outcome}
                                    {r.overridden && <span className="block text-gray-400">set manually</span>}
                                </td>
                                <td className="p-2 text-right whitespace-nowrap">
                                    {(["PM Done", "Dispute"] as Label[]).map((l) => (
                                        <button key={l} disabled={mark.isPending}
                                            onClick={() => mark.mutate({ label: l, tickets: [{ company: r.company, ticket_no: r.ticket_no }] })}
                                            className={`${btn} ml-1`}
                                            style={r.outcome === l ? ACTIVE : undefined}>
                                            {l}
                                        </button>
                                    ))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination page={page} pageSize={data.pageSize} totalRows={data.total} noun="rows" onPageChange={setPage} />
            {mark.isError && <p className="mt-2 text-xs text-red-600">Could not save. Please try again.</p>}
        </div>
    );
}

export function PmRemarkReview({ token, company }: { token: string; company: string }) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<StatusFilter>("unresolved");
    const [searchInput, setSearchInput] = useState("");
    const [page, setPage] = useState(1);
    const [expanded, setExpanded] = useState<string | null>(null);
    const search = useDebouncedValue(searchInput, 400);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["pmReviewRemarks", company, status, search, page],
        queryFn: () => getReviewRemarks(token, company, { status, search, page, pageSize: 25 }),
        enabled: open,
        placeholderData: keepPreviousData,
    });

    const save = useMutation({
        mutationFn: (v: { key: string; label: Label }) => answerReview(token, v.key, v.label),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pmReviewRemarks"] });
            qc.invalidateQueries({ queryKey: ["pmReviewRows"] });
            qc.invalidateQueries({ queryKey: ["pmReviewHistory"] });
            qc.invalidateQueries({ queryKey: ["pmDashboard"] });
        },
    });

    const pendingKey = save.isPending ? save.variables?.key : null;

    return (
        <div className="bg-white rounded-xl border mb-4" style={{ borderColor: "var(--color-border)" }}>
            <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium">
                <span>Review every remark</span>
                <span className="text-xs text-gray-500">
                    {data ? `${data.counts.unresolved.toLocaleString()} unresolved · ` : ""}
                    {open ? "Hide" : "Show"}
                </span>
            </button>

            {open && (
                <div className="px-4 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex gap-1">
                            {FILTERS.map((f) => (
                                <button key={f.value}
                                    onClick={() => { setPage(1); setStatus(f.value); }}
                                    className="px-3 py-1 text-xs rounded-md border"
                                    style={status === f.value ? ACTIVE : { borderColor: "#d1d5db", color: "#4b5563" }}>
                                    {f.label}
                                    {data && f.value !== "all" && (
                                        <span className="ml-1 text-gray-400">
                                            {f.value === "unresolved" ? data.counts.unresolved : f.value === "done" ? data.counts.done : data.counts.dispute}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <input value={searchInput}
                            onChange={(e) => { setPage(1); setSearchInput(e.target.value); }}
                            placeholder="Search remarks…" aria-label="Search remarks"
                            className="border rounded-lg px-3 py-1.5 text-sm w-64" />
                    </div>

                    {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
                    {isError && <p className="text-sm text-red-600">Could not load remarks.</p>}

                    {data && (
                        <div className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
                            <div className="max-h-[520px] overflow-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead className="sticky top-0 bg-gray-50 z-10">
                                        <tr className="text-gray-500 text-xs uppercase">
                                            <th className="w-8 p-2"></th>
                                            <th className="text-left p-2">Remark</th>
                                            <th className="text-left p-2 w-20">Rows</th>
                                            <th className="text-left p-2 w-28">Current</th>
                                            <th className="p-2 w-56"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.rows.length === 0 && (
                                            <tr><td colSpan={5} className="p-4 text-center text-gray-400">No remarks match</td></tr>
                                        )}
                                        {data.rows.map((r: RemarkRow) => {
                                            const isOpen = expanded === r.key;
                                            return (
                                                <Fragment key={r.key}>
                                                    <tr className="border-t align-top">
                                                        <td className="p-2 text-gray-400 cursor-pointer" onClick={() => setExpanded(isOpen ? null : r.key)}>
                                                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                        </td>
                                                        <td className="p-2 break-words cursor-pointer" onClick={() => setExpanded(isOpen ? null : r.key)}>
                                                            {r.remark}
                                                        </td>
                                                        <td className="p-2 tabular-nums">{r.rows.toLocaleString()}</td>
                                                        <td className="p-2 text-xs">
                                                            {r.label ?? <span className="text-gray-400">Unresolved</span>}
                                                            {r.label && (
                                                                <span className="block text-gray-400">{r.source === "learned" ? "your answer" : "auto rule"}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-2 text-right whitespace-nowrap">
                                                            {(["PM Done", "Dispute"] as Label[]).map((l) => (
                                                                <button key={l}
                                                                    disabled={pendingKey === r.key}
                                                                    onClick={() => save.mutate({ key: r.key, label: l })}
                                                                    title="Applies to every row with this remark that hasn't been set manually"
                                                                    className="text-xs border rounded-md px-2.5 py-1 ml-1 hover:bg-gray-50 disabled:opacity-60"
                                                                    style={r.label === l ? ACTIVE : undefined}>
                                                                    {l}
                                                                </button>
                                                            ))}
                                                        </td>
                                                    </tr>
                                                    {isOpen && (
                                                        <tr>
                                                            <td colSpan={5} className="p-0">
                                                                <RemarkRows token={token} company={company} remarkKey={r.key}
                                                                    showCompany={company === "__all__"} />
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={page} pageSize={data.pageSize} totalRows={data.total} noun="remarks" onPageChange={setPage} />
                        </div>
                    )}

                    {save.isError && <p className="text-xs text-red-600 mt-2">Could not save that answer. Please try again.</p>}
                </div>
            )}
        </div>
    );
}
