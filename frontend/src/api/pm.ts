const API_BASE = import.meta.env.VITE_API_BASE_URL;

export interface PmStateRow {
    state: string;
    total_pms: number;
    closed_pms: number;
    open_pms: number;
}

export interface PmRegionBreakdownRow {
    region: string;
    total_pms: number;
    closed_pms: number;
    open_pms: number;
    states: PmStateRow[];
}

export interface PmMonthlyTrendRow {
    year_month: string;
    pm_count: number;
    done_count: number;
    dispute_count: number;
}

export interface PmWeeklyTrendRow {
    year_week: string;
    pm_count: number;
    done_count: number;
    dispute_count: number;
}

export interface PmDetailRow {
    ticket_no: string;
    company?: string;
    dealer_code: string;
    dealer_name: string;
    call_date: string;
    remarks: string;
}

export interface PmDashboardResponse {
    kpis: {
        totalPms: number;
        pmDone: number;
        pmNotDone: number;
    };

    regionBreakdown: PmRegionBreakdownRow[];
    monthlyTrend: PmMonthlyTrendRow[];
    weeklyTrend: PmWeeklyTrendRow[];
    weeklyTrendMonth: string | null;
    availableMonths: string[];
    pmDetailTable: {
        rows: PmDetailRow[];
        page: number;
        pageSize: number;
        totalRows: number;
    };
}

export interface ReviewQuestion {
    done: boolean;
    phrase?: string;
    rowsAffected?: number;
    examples?: string[];
    unresolvedRows: number;
    totalRows: number;
}

export interface ReviewHistoryRow {
    id: number;
    phrase: string;
    label: "PM Done" | "Dispute";
    answered_by: string;
    is_active: number | boolean;
    created_at: string;
    updated_at: string;
    log_count: number;
    rowsAffected: number | null;
}

export interface PmFilterOptions {
    states: string[];
    months: string[];
}
export interface PmUploadResponse {
    files: { filename: string; row_count: number }[];
    companies: { company: string; total_rows_stored: number }[];
}

export interface PmPrintOptions {
    periods: string[];
    models: string[];
}

function authHeaders(token: string): HeadersInit {
    return { Authorization: `Bearer ${token}` };
}

async function handle<T>(res: Response): Promise<T> {
    if (res.status === 401) throw { error: "session_expired" };
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw body?.detail ?? body ?? { message: "Request failed" };
    }
    return res.json();
}


export function uploadPmFiles(
    files: File[],
    token: string,
    onProgress?: (pct: number) => void
): Promise<PmUploadResponse> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const form = new FormData();
        files.forEach((f) => form.append("files", f));

        xhr.open("POST", `${API_BASE}/api/pm/upload`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        };

        xhr.onload = () => {
            let body: any = {};
            try {
                body = JSON.parse(xhr.responseText);
            } catch { }
            if (xhr.status >= 200 && xhr.status < 300) resolve(body);
            else reject(body.detail ?? body ?? { message: "Upload failed" });
        };
        xhr.onerror = () => reject({ message: "Network error during upload" });
        xhr.send(form);
    });
}

export async function getPmDashboard(
    token: string,
    opts: {
        company?: string;
        state?: string;
        overallMonth?: string;
        month?: string;
        dealerCode?: string;
        detailState?: string;
        detailMonth?: string;
        page?: number;
        pageSize?: number;
    } = {}
): Promise<PmDashboardResponse> {
    const params = new URLSearchParams();
    if (opts.company) params.set("company", opts.company);
    if (opts.state) params.set("state", opts.state);
    if (opts.overallMonth) params.set("overall_month", opts.overallMonth);
    if (opts.month) params.set("month", opts.month);
    if (opts.dealerCode) params.set("dealer_code", opts.dealerCode);
    if (opts.detailState) params.set("detail_state", opts.detailState);
    if (opts.detailMonth) params.set("detail_month", opts.detailMonth);
    params.set("page", String(opts.page ?? 1));
    params.set("page_size", String(opts.pageSize ?? 50));

    const res = await fetch(`${API_BASE}/api/pm/dashboard?${params}`, { headers: authHeaders(token) });
    return handle<PmDashboardResponse>(res);
}

export async function getPmFilterOptions(token: string, company?: string): Promise<PmFilterOptions> {
    const params = new URLSearchParams();
    if (company) params.set("company", company);
    const res = await fetch(`${API_BASE}/api/pm/filters?${params}`, { headers: authHeaders(token) });
    return handle<PmFilterOptions>(res);
}

export async function getCompanies(token: string): Promise<{ companies: string[] }> {
    const res = await fetch(`${API_BASE}/api/companies`, { headers: authHeaders(token) });
    return handle<{ companies: string[] }>(res);
}

export async function deleteAllPmData(token: string, company?: string): Promise<{ company: string; deleted: boolean }> {
    const params = new URLSearchParams();
    if (company) params.set("company", company);
    const res = await fetch(`${API_BASE}/api/pm/data?${params}`, {
        method: "DELETE",
        headers: authHeaders(token),
    });
    return handle(res);
}

export function pmPdfUrl(ticketNo: string): string {
    const safeName = ticketNo.replace(/\//g, "_");
    return `/pm-pdfs/${encodeURIComponent(safeName)}.pdf`;
}

export async function getReviewNext(token: string, company?: string, skip: string[] = []): Promise<ReviewQuestion> {
    const params = new URLSearchParams();
    if (company) params.set("company", company);
    if (skip.length) params.set("skip", skip.join("|"));
    const res = await fetch(`${API_BASE}/api/pm/review/next?${params}`, { headers: authHeaders(token) });
    return handle<ReviewQuestion>(res);
}

export async function answerReview(token: string, phrase: string, label: "PM Done" | "Dispute") {
    const res = await fetch(`${API_BASE}/api/pm/review/answer`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ phrase, label }),
    });
    return handle<{ saved: boolean }>(res);
}

export async function getReviewHistory(token: string, company?: string, scope: "mine" | "all" = "mine") {
    const params = new URLSearchParams({ scope });
    if (company) params.set("company", company);
    const res = await fetch(`${API_BASE}/api/pm/review/history?${params}`, { headers: authHeaders(token) });
    return handle<{ rules: ReviewHistoryRow[] }>(res);
}

export async function changeReviewLabel(token: string, id: number, label: "PM Done" | "Dispute") {
    const res = await fetch(`${API_BASE}/api/pm/review/rules/${id}/label`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
    });
    return handle<{ changed: boolean }>(res);
}

export async function removeReviewRule(token: string, id: number) {
    const res = await fetch(`${API_BASE}/api/pm/review/rules/${id}`, { method: "DELETE", headers: authHeaders(token) });
    return handle<{ removed: boolean }>(res);
}

export async function restoreReviewRule(token: string, id: number) {
    const res = await fetch(`${API_BASE}/api/pm/review/rules/${id}/restore`, { method: "POST", headers: authHeaders(token) });
    return handle<{ restored: boolean }>(res);
}

export async function getPrintOptions(token: string, company?: string): Promise<PmPrintOptions> {
    const params = new URLSearchParams();
    if (company) params.set("company", company);
    const res = await fetch(`${API_BASE}/api/pm/print/options?${params}`, { headers: authHeaders(token) });
    return handle<PmPrintOptions>(res);
}

export async function downloadPmReport(
    token: string,
    opts: { company?: string; model?: string; year: number; month: number }
): Promise<void> {
    const params = new URLSearchParams({ year: String(opts.year), month: String(opts.month) });
    if (opts.company) params.set("company", opts.company);
    if (opts.model) params.set("model", opts.model);

    const res = await fetch(`${API_BASE}/api/pm/print/pdf?${params}`, { headers: authHeaders(token) });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw body?.detail ?? body ?? { message: "Could not generate the PDF." };
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PM Report ${opts.year}-${String(opts.month).padStart(2, "0")}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}