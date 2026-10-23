import type { RepeatMachineRow } from "./serviceCalls";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export type EngineerSource = "service" | "pm" | "installation";

export interface EngineerMonthRow {
    year_month: string;
    count: number;
    negative_count: number;
    days_active: number;
    days_quota_met: number;
    utilization_pct: number;
}

export interface EngineerMonthlyResponse {
    source: EngineerSource;
    engCode: string;
    workingDaysPerMonth: number;
    months: EngineerMonthRow[];
    totals: {
        daysQuotaMet: number;
        totalWorkingDays: number;
        utilizationPct: number;
        count: number;
        negativeCount: number;
    };
}

export interface VisitSplit {
    local: number;
    upcountry: number;
}

export interface EngineerUtilizationResponse {
    engCode: string;
    workingDaysPerMonth: number;
    sources: EngineerSource[];
    months: {
        year_month: string;
        days_active: number;
        days_quota_met: number;
        utilization_pct: number;
        visits?: { service?: VisitSplit; pm?: VisitSplit; installation?: VisitSplit };
    }[];
    totals: { daysQuotaMet: number; totalWorkingDays: number; utilizationPct: number };
}

export interface PmVisitRow {
    ticket_no: string;
    dealer_code: string;
    dealer_name: string;
    call_date: string;
    remarks: string;
    status: "PM Done" | "Dispute";
}

export interface InstallationVisitRow {
    machine_no: string;
    dealer_code: string;
    dealer_name: string;
    master_model: string;
    loc_up_rem: string;
    location: string;
    state: string;
    install_date: string;
}

interface VisitsPaging {
    page: number;
    pageSize: number;
    totalRows: number;
    month: string;
    engineer: { eng_code: string; name: string };
}

export type EngineerVisitsResponse =
    | ({ source: "service"; rows: RepeatMachineRow[] } & VisitsPaging)
    | ({ source: "pm"; rows: PmVisitRow[] } & VisitsPaging)
    | ({ source: "installation"; rows: InstallationVisitRow[] } & VisitsPaging);

async function get<T>(path: string, params: URLSearchParams, token: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw body?.detail ?? body ?? { message: "Request failed" };
    }
    return res.json();
}

export function getEngineerMonthly(token: string, engCode: string, source: EngineerSource) {
    return get<EngineerMonthlyResponse>(
        "/api/engineers/monthly", new URLSearchParams({ eng_code: engCode, source }), token);
}

export function getEngineerUtilization(token: string, engCode: string) {
    return get<EngineerUtilizationResponse>(
        "/api/engineers/utilization", new URLSearchParams({ eng_code: engCode }), token);
}

export function getEngineerVisits(
    token: string,
    engCode: string,
    source: EngineerSource,
    month: string,
    page = 1
) {
    return get<EngineerVisitsResponse>(
        "/api/engineers/visits",
        new URLSearchParams({ eng_code: engCode, source, month, page: String(page), page_size: "50" }),
        token);
}
