import { useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getReviewNext, answerReview, getReviewRemarks } from "../api/pm";
import type { RemarkRow } from "../api/pm";
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

function AllRemarks({ token, company }: { token: string; company: string }) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<StatusFilter>("unresolved");
    const [searchInput, setSearchInput] = useState("");
    const [page, setPage] = useState(1);
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
            qc.invalidateQueries({ queryKey: ["pmReviewNext"] });
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
                                <button
                                    key={f.value}
                                    onClick={() => {
                                        setPage(1);
                                        setStatus(f.value);
                                    }}
                                    className="px-3 py-1 text-xs rounded-md border"
                                    style={status === f.value
                                        ? { background: "var(--color-accent-light)", color: "var(--color-accent)", borderColor: "var(--color-accent)" }
                                        : { borderColor: "#d1d5db", color: "#4b5563" }}
                                >
                                    {f.label}
                                    {data && f.value !== "all" && (
                                        <span className="ml-1 text-gray-400">
                                            {f.value === "unresolved" ? data.counts.unresolved : f.value === "done" ? data.counts.done : data.counts.dispute}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <input
                            value={searchInput}
                            onChange={(e) => {
                                setPage(1);
                                setSearchInput(e.target.value);
                            }}
                            placeholder="Search remarks…"
                            aria-label="Search remarks"
                            className="border rounded-lg px-3 py-1.5 text-sm w-64"
                        />
                    </div>

                    {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
                    {isError && <p className="text-sm text-red-600">Could not load remarks.</p>}

                    {data && (
                        <div className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
                            <div className="max-h-[420px] overflow-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead className="sticky top-0 bg-gray-50">
                                        <tr className="text-gray-500 text-xs uppercase">
                                            <th className="text-left p-2">Remark</th>
                                            <th className="text-left p-2 w-20">Rows</th>
                                            <th className="text-left p-2 w-28">Current</th>
                                            <th className="p-2 w-56"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.rows.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-4 text-center text-gray-400">No remarks match</td>
                                            </tr>
                                        )}
                                        {data.rows.map((r: RemarkRow) => (
                                            <tr key={r.key} className="border-t align-top">
                                                <td className="p-2 break-words">{r.remark}</td>
                                                <td className="p-2 tabular-nums">{r.rows.toLocaleString()}</td>
                                                <td className="p-2 text-xs">
                                                    {r.label ?? <span className="text-gray-400">Unresolved</span>}
                                                    {r.label && (
                                                        <span className="block text-gray-400">{r.source === "learned" ? "your answer" : "auto rule"}</span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-right whitespace-nowrap">
                                                    {(["PM Done", "Dispute"] as Label[]).map((l) => (
                                                        <button
                                                            key={l}
                                                            disabled={pendingKey === r.key}
                                                            onClick={() => save.mutate({ key: r.key, label: l })}
                                                            className="text-xs border rounded-md px-2.5 py-1 ml-1 hover:bg-gray-50 disabled:opacity-60"
                                                            style={r.label === l
                                                                ? { background: "var(--color-accent-light)", color: "var(--color-accent)", borderColor: "var(--color-accent)" }
                                                                : undefined}
                                                        >
                                                            {l}
                                                        </button>
                                                    ))}
                                                </td>
                                            </tr>
                                        ))}
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

export function PmRuleQuiz({ token, company }: { token: string; company: string }) {
    const qc = useQueryClient();
    const [skipped, setSkipped] = useState<string[]>([]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["pmReviewNext", company, skipped],
        queryFn: () => getReviewNext(token, company, skipped),
    });

    const answer = useMutation({
        mutationFn: (label: Label) => answerReview(token, data!.phrase!, label),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pmReviewNext"] });
            qc.invalidateQueries({ queryKey: ["pmReviewHistory"] });
            qc.invalidateQueries({ queryKey: ["pmReviewRemarks"] });
            qc.invalidateQueries({ queryKey: ["pmDashboard"] });
        },
    });

    let quiz = null;

    if (!isLoading && !isError && data) {
        if (data.done) {
            quiz = (
                <div className="bg-white rounded-xl border p-4 mb-4 text-sm text-gray-600" style={{ borderColor: "var(--color-border)" }}>
                    All frequent phrases are classified.
                </div>
            );
        } else {
            const resolved = data.totalRows - data.unresolvedRows;
            const pct = Math.round((resolved / data.totalRows) * 100);
            quiz = (
                <div className="bg-white rounded-xl border p-4 mb-4" style={{ borderColor: "var(--color-border)" }}>
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium">Help classify remarks</h3>
                        <span className="text-xs text-gray-500">{pct}% classified · {data.unresolvedRows.toLocaleString()} rows waiting</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full mb-3 overflow-hidden">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: "var(--color-accent)" }} />
                    </div>

                    <p className="text-sm mb-2">
                        Is the following filter <b>PM Done</b> or <b>Dispute</b>?
                    </p>
                    <p className="text-lg font-semibold mb-1">"{data.phrase}"</p>
                    <p className="text-xs text-gray-500 mb-2">Appears in {data.rowsAffected?.toLocaleString()} remarks. Examples:</p>
                    <ul className="text-xs text-gray-600 mb-3 space-y-1">
                        {data.examples?.map((e, i) => (
                            <li key={i} className="border-l-2 pl-2" style={{ borderColor: "var(--color-border)" }}>{e}</li>
                        ))}
                    </ul>

                    <div className="flex gap-2">
                        <button
                            disabled={answer.isPending}
                            onClick={() => answer.mutate("PM Done")}
                            className="flex-1 border text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-50 disabled:opacity-60"
                        >
                            a. PM Done
                        </button>
                        <button
                            disabled={answer.isPending}
                            onClick={() => answer.mutate("Dispute")}
                            className="flex-1 border text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-50 disabled:opacity-60"
                        >
                            b. Dispute
                        </button>
                        <button
                            onClick={() => setSkipped((s) => [...s, data.phrase!])}
                            className="text-xs text-gray-500 px-3 hover:text-gray-800"
                            title="Ask me later"
                        >
                            Skip
                        </button>
                    </div>
                    {answer.isError && <p className="text-xs text-red-600 mt-2">Could not save. Please try again.</p>}
                </div>
            );
        }
    }

    return (
        <>
            {quiz}
            <AllRemarks token={token} company={company} />
        </>
    );
}