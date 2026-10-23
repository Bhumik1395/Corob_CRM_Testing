import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getEngineerVisits } from "../../api/engineers";
import type { EngineerSource } from "../../api/engineers";
import { useAuth } from "../../auth/AuthContext";
import { formatMonthFull } from "../../lib/format";
import { RepeatMachinesTable } from "../tables/RepeatMachinesTable";
import { Pagination } from "../ui/Pagination";
import { Segmented } from "../ui/Segmented";

const th = "px-4 py-2.5 text-left text-xs font-medium text-muted";
const td = "px-4 py-2.5 align-top";

export function EngineerVisits({
    engCode,
    engName = "",
    month,
}: {
    engCode: string;
    engName?: string;
    month: string; // "YYYY-MM", taken from the panel's month dropdown
}) {
    const { token } = useAuth();
    const [source, setSource] = useState<EngineerSource>("service");
    const [page, setPage] = useState(1);

    useEffect(() => setPage(1), [source, month]);

    const apiSource: EngineerSource = source;
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["engineerVisits", engCode, apiSource, month, page],
        queryFn: () => getEngineerVisits(token!, engCode, apiSource, month, page),
        enabled: !!token,
        placeholderData: keepPreviousData,
        retry: false,
    });

    const baseTitle =
        source === "service" ? "Repeat calls" : source === "pm" ? "PM visits" : "Installations";
    const title = month ? `${baseTitle} — ${formatMonthFull(month)}` : baseTitle;

    const shownName = data?.engineer.name || engName;
    const shownCode = data?.engineer.eng_code || engCode;

    return (
        <div className="border-t border-border pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted">
                        Engineer: <span className="font-medium text-ink">{shownName || "—"}</span> · Code {shownCode}
                    </p>
                </div>
                <Segmented<EngineerSource>
                    label="Visit table"
                    value={source}
                    onChange={setSource}
                    options={[
                        { value: "service", label: "Service" },
                        { value: "pm", label: "PM" },
                        { value: "installation", label: "Installation" },
                    ]}
                />
            </div>

            {isLoading && <div className="h-40 animate-pulse rounded-xl bg-gray-100" />}

            {isError && (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-muted">
                    {(error as any)?.message ?? "Couldn't load visits."}
                </p>
            )}

            {data?.source === "service" && source === "service" && (
                <div className="overflow-hidden rounded-xl border border-border">
                    <RepeatMachinesTable
                        rows={data.rows}
                        page={data.page}
                        pageSize={data.pageSize}
                        totalRows={data.totalRows}
                        onPageChange={setPage}
                    />
                </div>
            )}

            {data?.source === "pm" && source === "pm" && (
                <div className="overflow-hidden rounded-xl border border-border">
                    <div className="max-h-[300px] overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-[#F6F8F7]">
                                <tr>
                                    <th className={th}>Ticket no</th>
                                    <th className={th}>Engineer</th>
                                    <th className={th}>Dealer</th>
                                    <th className={th}>Date</th>
                                    <th className={th}>Status</th>
                                    <th className={th}>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.rows.length === 0 && (
                                    <tr><td colSpan={6} className="p-6 text-center text-muted">No PM visits for this engineer this month</td></tr>
                                )}
                                {data.rows.map((r) => (
                                    <tr key={r.ticket_no} className="border-t border-border">
                                        <td className={`${td} whitespace-nowrap font-medium`}>{r.ticket_no}</td>
                                        <td className={`${td} whitespace-nowrap`}>
                                            <div className="font-medium">{shownName || "—"}</div>
                                            <div className="text-xs text-muted">{shownCode}</div>
                                        </td>
                                        <td className={td}>
                                            <div>{r.dealer_name}</div>
                                            <div className="text-xs text-muted">{r.dealer_code}</div>
                                        </td>
                                        <td className={`${td} whitespace-nowrap`}>{r.call_date}</td>
                                        <td className={td}>
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "PM Done" ? "bg-lime-soft text-forest-deep" : "bg-red-soft text-red"}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className={`${td} min-w-[180px] whitespace-normal break-words`}>{r.remarks}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={data.page} pageSize={data.pageSize} totalRows={data.totalRows} noun="PMs" onPageChange={setPage} />
                </div>
            )}

            {data?.source === "installation" && source === "installation" && (
                <div className="overflow-hidden rounded-xl border border-border">
                    <div className="max-h-[300px] overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-[#F6F8F7]">
                                <tr>
                                    <th className={th}>Machine S/N</th>
                                    <th className={th}>Dealer</th>
                                    <th className={th}>Model</th>
                                    <th className={th}>Date</th>
                                    <th className={th}>Loc / Up</th>
                                    <th className={th}>Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.rows.length === 0 && (
                                    <tr><td colSpan={6} className="p-6 text-center text-muted">No installations for this engineer this month</td></tr>
                                )}
                                {data.rows.map((r, i) => (
                                    <tr key={`${r.machine_no}-${i}`} className="border-t border-border">
                                        <td className={`${td} whitespace-nowrap font-medium`}>{r.machine_no}</td>
                                        <td className={td}>
                                            <div>{r.dealer_name}</div>
                                            <div className="text-xs text-muted">{r.dealer_code}</div>
                                        </td>
                                        <td className={td}>{r.master_model || "—"}</td>
                                        <td className={`${td} whitespace-nowrap`}>{r.install_date}</td>
                                        <td className={td}>{r.loc_up_rem || "—"}</td>
                                        <td className={td}>
                                            <div>{r.location}</div>
                                            <div className="text-xs text-muted">{r.state}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={data.page} pageSize={data.pageSize} totalRows={data.totalRows} noun="installations" onPageChange={setPage} />
                </div>
            )}
        </div>
    );
}
