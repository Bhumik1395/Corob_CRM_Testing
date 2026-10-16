import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEngineerMonthly, getEngineerUtilization } from "../../api/engineers";
import type { EngineerSource, VisitSplit } from "../../api/engineers";
import { useAuth } from "../../auth/AuthContext";
import { EngineerMonthlyChart } from "../charts/EngineerMonthlyChart";
import { EngineerVisits } from "./EngineerVisits";
import { KpiCard } from "../ui/KpiCard";
import { Legend } from "../ui/Legend";
import { Segmented } from "../ui/Segmented";
import { Select } from "../ui/Select";
import { formatMonthFull, formatMonthShort } from "../../lib/format";
import { COLORS } from "../../lib/palette";

export interface SelectedEngineer {
    eng_code: string;
    employee_name: string;
    supervisor: string;
}

type Source = EngineerSource | "installation";

const SOURCE_COPY: Record<EngineerSource, { countLabel: string; negativeLabel: string; errorHint: string }> = {
    service: {
        countLabel: "Service calls",
        negativeLabel: "Repeat calls",
        errorHint: "Upload a Service Calls file (the data is kept for an hour after upload).",
    },
    pm: {
        countLabel: "PM Done",
        negativeLabel: "PM Dispute",
        errorHint: "No PM data has been uploaded yet.",
    },
};

const QUOTA_RULE =
    "A day counts as utilized if any one source meets its own quota: 2 local service calls, 2 local PMs, 1 upcountry/remote service call, or 1 upcountry/remote PM. Installation will be added once available.";

function VisitTypeCard({ label, split, soon }: { label: string; split?: VisitSplit; soon?: boolean }) {
    return (
        <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-muted">{label}</p>
            {soon ? (
                <p className="mt-3 text-sm text-muted">—  (coming soon)</p>
            ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-[22px] font-semibold leading-none tabular-nums">{split?.local ?? 0}</p>
                        <p className="mt-1 text-xs text-muted">Local</p>
                    </div>
                    <div>
                        <p className="text-[22px] font-semibold leading-none tabular-nums">{split?.upcountry ?? 0}</p>
                        <p className="mt-1 text-xs text-muted">Upcountry / remote</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export function EngineerPanel({
    engineer,
    year = "",
    month: monthFilter = "",
}: {
    engineer: SelectedEngineer | null;
    year?: string;   // "" = all years
    month?: string;  // "" = all months
}) {
    const { token } = useAuth();
    const [source, setSource] = useState<Source>("service");
    const [month, setMonth] = useState("");
    const [yearSel, setYearSel] = useState("");

    const activeSource: EngineerSource = source === "pm" ? "pm" : "service";
    const inPeriod = (ym: string) => {
        const [y, mo] = ym.split("-");
        return (!year || y === year) && (!monthFilter || parseInt(mo, 10) === parseInt(monthFilter, 10));
    };

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["engineerMonthly", engineer?.eng_code, activeSource],
        queryFn: () => getEngineerMonthly(token!, engineer!.eng_code, activeSource),
        enabled: !!token && !!engineer && source !== "installation",
        retry: false,
    });

    // Combined quota days / utilization / local-upcountry visits: independent of the switch.
    const { data: combined, isLoading: combinedLoading } = useQuery({
        queryKey: ["engineerUtilization", engineer?.eng_code],
        queryFn: () => getEngineerUtilization(token!, engineer!.eng_code),
        enabled: !!token && !!engineer,
        retry: false,
    });

    if (!engineer) {
        return (
            <div className="flex h-full min-h-[240px] items-center justify-center p-6 text-center text-sm text-muted">
                Choose a supervisor, then an engineer, to see their analysis here.
            </div>
        );
    }

    const copy = SOURCE_COPY[activeSource];
    const workingDays = data?.workingDaysPerMonth ?? combined?.workingDaysPerMonth ?? 26;

    const combinedMonths = (combined?.months ?? []).filter((m) => inPeriod(m.year_month));
    const combinedByMonth = new Map(combinedMonths.map((m) => [m.year_month, m]));

    const sourceMonths = (data?.months ?? []).filter((m) => inPeriod(m.year_month));
    const sourceByMonth = new Map(sourceMonths.map((m) => [m.year_month, m]));

    // Every month with activity in any source.
    const monthKeys = Array.from(
        new Set([...combinedMonths.map((m) => m.year_month), ...sourceMonths.map((m) => m.year_month)])
    ).sort();
    const years = Array.from(new Set(monthKeys.map((k) => k.slice(0, 4))));

    // Year: the chosen one, otherwise the year of the selected source's latest month.
    const latestKey = monthKeys[monthKeys.length - 1] ?? "";
    const sourceLatest = sourceMonths.length ? sourceMonths[sourceMonths.length - 1].year_month : latestKey;
    const activeYear = years.includes(yearSel) ? yearSel : sourceLatest.slice(0, 4);

    // Month: limited to the active year; defaults to the latest month the selected source has.
    const yearKeys = monthKeys.filter((k) => k.startsWith(activeYear));
    const sourceInYear = sourceMonths.filter((m) => m.year_month.startsWith(activeYear));
    const defaultKey = sourceInYear.length
        ? sourceInYear[sourceInYear.length - 1].year_month
        : yearKeys[yearKeys.length - 1];
    const currentKey = yearKeys.includes(month) ? month : defaultKey;

    const cur = currentKey ? sourceByMonth.get(currentKey) : undefined;
    const curCombined = currentKey ? combinedByMonth.get(currentKey) : undefined;

    // Chart: bars from the selected source (selected year), quota line from the combined days.
    const chartMonths = sourceInYear.map((m) => {
        const c = combinedByMonth.get(m.year_month);
        return c ? { ...m, days_quota_met: c.days_quota_met, utilization_pct: c.utilization_pct } : m;
    });

    const loading = isLoading || combinedLoading;

    return (
        <div className="flex flex-col gap-4 p-5">
            {/* Identity */}
            <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{engineer.employee_name}</p>
                <p className="text-xs text-muted">
                    Eng code {engineer.eng_code} · Supervisor {engineer.supervisor || "—"}
                </p>
            </div>

            {loading && <div className="h-64 animate-pulse rounded-xl bg-gray-100" />}

            {!loading && monthKeys.length === 0 && (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-muted">
                    No activity recorded for this engineer in the selected period.
                </p>
            )}

            {!loading && currentKey && (
                <>
                    {/* 1. Month name + year and month filters */}
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{formatMonthFull(currentKey)}</p>
                        <div className="flex items-center gap-2">
                            <Select
                                className="w-24"
                                aria-label="Year"
                                value={activeYear}
                                onChange={(e) => {
                                    setYearSel(e.target.value);
                                    setMonth("");
                                }}
                            >
                                {years.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </Select>
                            <Select
                                className="w-32"
                                aria-label="Month"
                                value={currentKey}
                                onChange={(e) => setMonth(e.target.value)}
                            >
                                {yearKeys.map((ym) => (
                                    <option key={ym} value={ym}>{formatMonthShort(ym)}</option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    {/* 2. Days quota met + utilization (combined across all sources) */}
                    <div className="grid grid-cols-2 gap-3">
                        <KpiCard
                            label="Days quota met (combined)"
                            value={`${curCombined?.days_quota_met ?? 0} / ${workingDays}`}
                            caption={combined?.sources.length ? combined.sources.map((s) => (s === "pm" ? "PM" : "Service")).join(" + ") : undefined}
                        />
                        <KpiCard
                            tone="green"
                            label="Utilization (combined)"
                            value={`${curCombined?.utilization_pct ?? 0}%`}
                        />
                    </div>
                </>
            )}

            {/* 3. Work type filter: below the combined cards, above the Service / Repeat cards */}
            {!loading && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium">Work type</p>
                    <Segmented<Source>
                        label="Work type"
                        value={source}
                        onChange={setSource}
                        options={[
                            { value: "service", label: "Service calls" },
                            { value: "pm", label: "PM" },
                            { value: "installation", label: "Installation (soon)", disabled: true },
                        ]}
                    />
                </div>
            )}

            {!loading && currentKey && (
                <>
                    {/* 4. Service / repeat calls (follow the work type) */}
                    <div className="grid grid-cols-2 gap-3">
                        <KpiCard label={copy.countLabel} value={(cur?.count ?? 0).toLocaleString()} />
                        <KpiCard tone="red" label={copy.negativeLabel} value={(cur?.negative_count ?? 0).toLocaleString()} />
                    </div>

                    {/* 5. Local vs upcountry visits by type */}
                    <div>
                        <p className="mb-2 text-sm font-medium">Visits by type</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <VisitTypeCard label="Service calls" split={curCombined?.visits?.service} />
                            <VisitTypeCard label="PM Done" split={curCombined?.visits?.pm} />
                            <VisitTypeCard label="Installations" soon />
                        </div>
                    </div>
                </>
            )}

            {/* 6. Month-by-month graph (follows the work type and the selected year) */}
            <div>
                <p className="mb-2 text-sm font-medium">Month by month</p>

                {isError && (
                    <p className="rounded-xl bg-gray-50 p-4 text-sm text-muted">
                        {(error as any)?.error === "session_expired" || (error as any)?.error === "no_data"
                            ? copy.errorHint
                            : (error as any)?.message ?? "Couldn't load this engineer's data."}
                    </p>
                )}

                {!isLoading && !isError && data && chartMonths.length === 0 && (
                    <p className="rounded-xl bg-gray-50 p-4 text-sm text-muted">
                        No {copy.countLabel.toLowerCase()} recorded for this engineer in the selected period.
                    </p>
                )}

                {!isLoading && !isError && data && chartMonths.length > 0 && (
                    <>
                        <div className="mb-1 flex justify-end">
                            <Legend
                                items={[
                                    { label: copy.countLabel, color: COLORS.green },
                                    { label: copy.negativeLabel, color: COLORS.red },
                                    { label: "Days quota met (combined)", color: COLORS.forest },
                                ]}
                            />
                        </div>
                        <EngineerMonthlyChart
                            months={chartMonths}
                            countName={copy.countLabel}
                            negativeName={copy.negativeLabel}
                            workingDays={workingDays}
                        />
                        <p className="mt-1 text-xs text-muted">{QUOTA_RULE}</p>
                    </>
                )}
            </div>

            {/* 7. Table with its own Service / PM / Installation filter, following the selected month */}
            <EngineerVisits
                key={engineer.eng_code}
                engCode={engineer.eng_code}
                engName={engineer.employee_name}
                month={currentKey ?? ""}
            />
        </div>
    );
}