import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEngineerMonthly } from "../../api/engineers";
import type { EngineerSource } from "../../api/engineers";
import { useAuth } from "../../auth/AuthContext";
import { EngineerMonthlyChart } from "../charts/EngineerMonthlyChart";
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

const SOURCE_COPY: Record<EngineerSource, { countLabel: string; quotaRule: string; errorHint: string }> = {
    service: {
        countLabel: "Service calls",
        quotaRule: "Daily quota: 2 local service calls, or 1 upcountry/remote service call.",
        errorHint: "Upload a Service Calls file (the data is kept for an hour after upload).",
    },
    pm: {
        countLabel: "PMs done",
        quotaRule: "Daily quota: 2 local PMs, or 1 upcountry/remote PM. Only closed PMs count.",
        errorHint: "No PM data has been uploaded yet.",
    },
};

export function EngineerPanel({ engineer }: { engineer: SelectedEngineer | null }) {
    const { token } = useAuth();
    const [source, setSource] = useState<Source>("service");
    const [month, setMonth] = useState("");

    const activeSource: EngineerSource = source === "installation" ? "service" : source;

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["engineerMonthly", engineer?.eng_code, activeSource],
        queryFn: () => getEngineerMonthly(token!, engineer!.eng_code, activeSource),
        enabled: !!token && !!engineer && source !== "installation",
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
    const months = data?.months ?? [];
    const current = months.find((m) => m.year_month === month) ?? months[months.length - 1];

    return (
        <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{engineer.employee_name}</p>
                    <p className="text-xs text-muted">
                        Eng code {engineer.eng_code} · Supervisor {engineer.supervisor || "—"}
                    </p>
                </div>
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

            {isLoading && <div className="h-64 animate-pulse rounded-xl bg-gray-100" />}

            {isError && (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-muted">
                    {(error as any)?.error === "session_expired" || (error as any)?.error === "no_data"
                        ? copy.errorHint
                        : (error as any)?.message ?? "Couldn't load this engineer's data."}
                </p>
            )}

            {!isLoading && !isError && data && months.length === 0 && (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-muted">
                    No {copy.countLabel.toLowerCase()} recorded for this engineer.
                </p>
            )}

            {!isLoading && !isError && data && current && (
                <>
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{formatMonthFull(current.year_month)}</p>
                        <Select
                            className="w-32"
                            aria-label="Month"
                            value={current.year_month}
                            onChange={(e) => setMonth(e.target.value)}
                        >
                            {months.map((m) => (
                                <option key={m.year_month} value={m.year_month}>
                                    {formatMonthShort(m.year_month)}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <KpiCard label={copy.countLabel} value={current.count.toLocaleString()} />
                        <KpiCard label="Days quota met" value={`${current.days_quota_met} / ${data.workingDaysPerMonth}`} />
                        <KpiCard tone="green" label="Utilization" value={`${current.utilization_pct}%`} />
                    </div>

                    <div>
                        <div className="mb-1 flex items-center justify-between">
                            <p className="text-sm font-medium">Month by month</p>
                            <Legend
                                items={[
                                    { label: copy.countLabel, color: COLORS.green },
                                    { label: "Days quota met", color: COLORS.forest },
                                ]}
                            />
                        </div>
                        <EngineerMonthlyChart
                            months={months}
                            countName={copy.countLabel}
                            workingDays={data.workingDaysPerMonth}
                        />
                    </div>

                    <p className="text-xs text-muted">{copy.quotaRule}</p>
                </>
            )}
        </div>
    );
}