import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getReviewHistory, changeReviewLabel, removeReviewRule, restoreReviewRule } from "../api/pm";
import type { ReviewHistoryRow } from "../api/pm";

type Label = "PM Done" | "Dispute";

export function PmRuleHistory({ token, company }: { token: string; company: string }) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [scope, setScope] = useState<"mine" | "all">("mine");
    const [confirming, setConfirming] = useState<number | null>(null);

    const { data } = useQuery({
        queryKey: ["pmReviewHistory", company, scope],
        queryFn: () => getReviewHistory(token, company, scope),
        enabled: open,
    });

    const refresh = () => {
        setConfirming(null);
        qc.invalidateQueries({ queryKey: ["pmReviewHistory"] });
        qc.invalidateQueries({ queryKey: ["pmReviewNext"] });
        qc.invalidateQueries({ queryKey: ["pmDashboard"] });       // KPIs follow the new answer
    };
    const change = useMutation({ mutationFn: (v: { id: number; label: Label }) => changeReviewLabel(token, v.id, v.label), onSuccess: refresh });
    const remove = useMutation({ mutationFn: (id: number) => removeReviewRule(token, id), onSuccess: refresh });
    const restore = useMutation({ mutationFn: (id: number) => restoreReviewRule(token, id), onSuccess: refresh });
    const busy = change.isPending || remove.isPending || restore.isPending;

    const other = (l: Label): Label => (l === "PM Done" ? "Dispute" : "PM Done");

    return (
        <div className="bg-white rounded-xl border mb-4" style={{ borderColor: "var(--color-border)" }}>
            <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium">
                <span>Answer history</span>
                <span className="text-xs text-gray-500">{open ? "Hide" : "Show"}</span>
            </button>

            {open && (
                <div className="px-4 pb-4">
                    <div className="flex gap-1 mb-3">
                        {(["mine", "all"] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setScope(s)}
                                className="px-3 py-1 text-xs rounded-md border"
                                style={scope === s
                                    ? { background: "var(--color-accent-light)", color: "var(--color-accent)", borderColor: "var(--color-accent)" }
                                    : { borderColor: "#d1d5db", color: "#4b5563" }}
                            >
                                {s === "mine" ? "My answers" : "Everyone"}
                            </button>
                        ))}
                    </div>

                    {!data || data.rules.length === 0 ? (
                        <p className="text-sm text-gray-500">No answers yet.</p>
                    ) : (
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                                    <th className="text-left p-2">Phrase</th>
                                    <th className="text-left p-2">Answer</th>
                                    <th className="text-left p-2">Rows</th>
                                    <th className="text-left p-2">By</th>
                                    <th className="text-left p-2">Updated</th>
                                    <th className="p-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.rules.map((r: ReviewHistoryRow) => {
                                    const active = !!r.is_active;
                                    return (
                                        <tr key={r.id} className="border-t align-top" style={active ? undefined : { opacity: 0.55 }}>
                                            <td className="p-2 font-medium">"{r.phrase}"</td>
                                            <td className="p-2">
                                                {active ? r.label : <span className="text-gray-500">Removed</span>}
                                                {r.log_count > 1 && <span className="ml-1 text-xs text-gray-400">(edited)</span>}
                                            </td>
                                            <td className="p-2">{r.rowsAffected ?? "–"}</td>
                                            <td className="p-2 text-xs text-gray-600">{r.answered_by}</td>
                                            <td className="p-2 text-xs text-gray-600">{new Date(r.updated_at).toLocaleString()}</td>
                                            <td className="p-2 text-right whitespace-nowrap">
                                                {!active ? (
                                                    <button disabled={busy} onClick={() => restore.mutate(r.id)} className="text-xs border rounded-md px-2 py-1 hover:bg-gray-50">
                                                        Restore
                                                    </button>
                                                ) : confirming === r.id ? (
                                                    <span className="text-xs">
                                                        Move {r.rowsAffected ?? "these"} rows to {other(r.label)}?{" "}
                                                        <button disabled={busy} onClick={() => change.mutate({ id: r.id, label: other(r.label) })}
                                                            className="border rounded-md px-2 py-1 ml-1 hover:bg-gray-50 font-medium">Confirm</button>
                                                        <button onClick={() => setConfirming(null)} className="px-2 py-1 text-gray-500">Cancel</button>
                                                    </span>
                                                ) : (
                                                    <>
                                                        <button onClick={() => setConfirming(r.id)} className="text-xs border rounded-md px-2 py-1 mr-1 hover:bg-gray-50">
                                                            Change to {other(r.label)}
                                                        </button>
                                                        <button disabled={busy} onClick={() => remove.mutate(r.id)} className="text-xs text-gray-500 px-2 py-1 hover:text-red-600"
                                                            title="Removes the rule; the phrase will be asked again.">
                                                            Remove
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    {(change.isError || remove.isError || restore.isError) && (
                        <p className="text-xs text-red-600 mt-2">Could not save the change. Please try again.</p>
                    )}
                </div>
            )}
        </div>
    );
}