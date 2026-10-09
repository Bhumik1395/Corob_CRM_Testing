import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getReviewNext, answerReview } from "../api/pm";

export function PmRuleQuiz({ token, company }: { token: string; company: string }) {
    const qc = useQueryClient();
    const [skipped, setSkipped] = useState<string[]>([]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["pmReviewNext", company, skipped],
        queryFn: () => getReviewNext(token, company, skipped),
    });

    const answer = useMutation({
        mutationFn: (label: "PM Done" | "Dispute") => answerReview(token, data!.phrase!, label),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pmReviewNext"] });
            qc.invalidateQueries({ queryKey: ["pmReviewHistory"] });
            qc.invalidateQueries({ queryKey: ["pmDashboard"] });   // KPIs update immediately
        },
    });

    if (isLoading || isError || !data) return null;

    if (data.done) {
        return (
            <div className="bg-white rounded-xl border p-4 mb-4 text-sm text-gray-600" style={{ borderColor: "var(--color-border)" }}>
                All remarks are classified. Nothing left to review.
            </div>
        );
    }

    const resolved = data.totalRows - data.unresolvedRows;
    const pct = Math.round((resolved / data.totalRows) * 100);

    return (
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