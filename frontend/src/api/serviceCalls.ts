const API_BASE = import.meta.env.VITE_API_BASE_URL;

export interface StateRow {
    state: string;
    total_calls: number;
    repeat_calls: number;
    under_norm_calls: number;
    under_norm_pct: number;
    over_norm_calls: number;
    over_norm_pct: number;
}

export interface RegionBreakdownRow extends Omit<StateRow, "state"> {
    region: string;
    states: StateRow[];
}

export interface RegionVisitTypeRow {
    region: string;
    Physical: number;
    Online: number;
    Unknown: number;
}

export interface MonthlyTrendRow {
    year_month: string;
    calls: number;
    repeat_calls: number;
    under_norm_pct: number;
}

export interface RepeatMachineCall {
    call_date: string;
    customer: string;
    state: string;
    status: string;
    visit_type: string;
    service_type: string;
    employee_name: string;
    dealer_code: string;
    dealer_name: string;
    city: string;
    remarks: string;
}

export interface RepeatMachineRow {
    machine_no: string;
    repeat_count: number;
    calls: RepeatMachineCall[];
}

export interface FocusDashboardResponse {
    kpis: {
        totalMachines: number;
        totalCalls: number;
        underNormPct: number;
        repeatCalls: number;
        avgLocalClosureHours: number | null;
        avgUpcountryClosureHours: number | null;
    };
    regionBreakdown: RegionBreakdownRow[];
    monthlyTrend: MonthlyTrendRow[];
    charts: {
        regionVisitType: RegionVisitTypeRow[];
        repeatMachines: { machine: string; calls: number }[];
    };
    repeatMachinesTable: {
        rows: RepeatMachineRow[];
        page: number;
        pageSize: number;
        totalRows: number;
    };
}

export interface FilterOptions {
    customers: string[];
    states: string[];
    machines: string[];
    statuses: string[];
    serviceTypes: string[];
}

export interface EmployeeRow {
    eng_code: string;
    employee_name: string;
    total_calls: number;
    under_norm_calls: number;
    under_norm_pct: number;
    physical: number;
    online: number;
}

export interface EmployeeDashboardResponse {
    rows: EmployeeRow[];
    page: number;
    pageSize: number;
    totalRows: number;
}

export interface EngineerUtilizationRow {
    eng_code: string;
    employee_name: string;
    supervisor: string;
    total_calls: number;
    days_quota_met: number;
    utilization_pct: number;
    under_norm_pct: number;
}

export interface SupervisorRow {
    supervisor: string;
    num_engineers: number;
    avg_utilization_pct: number;
    avg_under_norm_pct: number;
    total_calls: number;
}

export interface UtilizationResponse {
    distinctMonths: number;
    totalWorkingDays: number;
    engineers: EngineerUtilizationRow[];
    supervisors: SupervisorRow[];
}

export interface CombinedUploadResponse {
    serviceCalls: {
        session_id: string;
        row_count: number;
        files: { filename: string; row_count: number }[];
    } | null;
    pm: {
        files: { filename: string; row_count: number }[];
        companies: { company: string; total_rows_stored: number }[];
    } | null;
}

export function uploadCombined(
    files: File[],
    token: string,
    onProgress?: (pct: number) => void
): Promise<CombinedUploadResponse> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const form = new FormData();
        files.forEach((f) => form.append("files", f));

        xhr.open("POST", `${API_BASE}/api/upload/combined`);
        xhr.withCredentials = true; // still needed so the Service Calls session cookie gets stored
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                const pct = Math.round((event.loaded / event.total) * 100);
                onProgress(pct);
            }
        };

        xhr.onload = () => {
            let body: any = {};
            try {
                body = JSON.parse(xhr.responseText);
            } catch { }

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(body);
            } else {
                reject(body.detail ?? body ?? { message: "Upload failed" });
            }
        };

        xhr.onerror = () => reject({ message: "Network error during upload" });

        xhr.send(form);
    });
}

export async function getFilterOptions(): Promise<FilterOptions> {
    const res = await fetch(`${API_BASE}/api/filters`, { credentials: "include" });
    if (res.status === 401) throw { error: "session_expired" };
    if (!res.ok) throw await res.json();
    return res.json();
}

export async function getFocusDashboard(
    filters: Record<string, string>,
    page: number = 1,
    pageSize: number = 50
): Promise<FocusDashboardResponse> {
    const params = new URLSearchParams({ ...filters, page: String(page), page_size: String(pageSize) });
    const res = await fetch(`${API_BASE}/api/dashboard/focus?${params}`, {
        credentials: "include",
    });
    if (res.status === 401) throw { error: "session_expired" };
    if (!res.ok) throw await res.json();
    return res.json();
}

export async function getEmployeeDashboard(
    page: number = 1,
    pageSize: number = 50,
    search?: string
): Promise<EmployeeDashboardResponse> {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (search) params.set("search", search);

    const res = await fetch(`${API_BASE}/api/dashboard/employees?${params}`, {
        credentials: "include",
    });
    if (res.status === 401) throw { error: "session_expired" };
    if (!res.ok) throw await res.json();
    return res.json();
}

export async function getUtilizationDashboard(customer?: string): Promise<UtilizationResponse> {
    const params = new URLSearchParams();
    if (customer) params.set("customer", customer);

    const res = await fetch(`${API_BASE}/api/dashboard/utilization?${params}`, {
        credentials: "include",
    });
    if (res.status === 401) throw { error: "session_expired" };
    if (!res.ok) throw await res.json();
    return res.json();
}

export async function downloadPdfReport(customer?: string): Promise<void> {
    const params = new URLSearchParams();
    if (customer) params.set("customer", customer);

    const res = await fetch(`${API_BASE}/api/reports/pdf?${params}`, {
        method: "POST",
        credentials: "include",
    });
    if (res.status === 401) throw { error: "session_expired" };
    if (!res.ok) throw await res.json();

    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="(.+)"/);
    const filename = match ? match[1] : "service_call_report.pdf";

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}