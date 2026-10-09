const API_BASE = import.meta.env.VITE_API_BASE_URL;

export type EngineerSource = "service" | "pm";

export interface EngineerMonthRow {
    year_month: string;
    count: number;
    days_active: number;
    days_quota_met: number;
    utilization_pct: number;
}

export interface EngineerMonthlyResponse {
    source: EngineerSource;
    engCode: string;
    workingDaysPerMonth: number;
    months: EngineerMonthRow[];
}

export async function getEngineerMonthly(
    token: string,
    engCode: string,
    source: EngineerSource
): Promise<EngineerMonthlyResponse> {
    const params = new URLSearchParams({ eng_code: engCode, source });
    const res = await fetch(`${API_BASE}/api/engineers/monthly?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include", // the Service Calls data is tied to the session cookie
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw body?.detail ?? body ?? { message: "Request failed" };
    }
    return res.json();
}