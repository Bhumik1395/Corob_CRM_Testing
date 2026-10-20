const API_BASE = import.meta.env.VITE_API_BASE_URL;

export interface InstallationKpis {
    totalInstallations: number;
    companies: number;
    dealers: number;
    engineers: number;
    models: number;
    upsAttachPct: number;
    upcountryRemotePct: number;
    /** % of named-engineer rows that could not be matched to an engineer code. */
    unlinkedEngineerPct: number;
}

// type alias (not interface) so it is assignable to SimpleBarChart's Record<string, string | number>
export type InstallationCount = { name: string; count: number };

export interface InstallationSplit {
    total: number;
    local: number;
    upcountry: number;
    remote: number;
}

export interface InstallationStateRow extends InstallationSplit {
    state: string;
}

export interface InstallationZoneRow extends InstallationSplit {
    zone: string;
    states: InstallationStateRow[];
}

export interface InstallationDealerRow {
    dealer_code: string;
    dealer_name: string;
    company: string;
    state: string;
    count: number;
}

export interface InstallationEngineerRow {
    eng_code: string;
    eng_name: string;
    supervisor: string;
    installs: number;
    local: number;
    upcountry: number;
    remote: number;
    dealers: number;
    days_active: number;
}

export interface InstallationSupervisorRow {
    supervisor: string;
    installs: number;
    engineers: number;
    dealers: number;
    upcountry_remote: number;
}

export interface InstallationDetailRow {
    company: string;
    dealer_code: string;
    dealer_name: string;
    master_model: string;
    machine_no: string;
    install_date: string;
    ups_model: string;
    ups_sn: string;
    loc_up_rem: string;
    zone: string;
    state: string;
    location: string;
    eng_name: string;
    supervisor: string;
}

export interface InstallationDashboardResponse {
    kpis: InstallationKpis;
    monthlyTrend: { year_month: string; count: number }[];
    byCompany: InstallationCount[];
    byModel: InstallationCount[];
    locSplit: InstallationCount[];
    upsModels: InstallationCount[];
    zoneBreakdown: InstallationZoneRow[];
    topDealers: InstallationDealerRow[];
    engineers: InstallationEngineerRow[];
    supervisors: InstallationSupervisorRow[];
    detailTable: {
        rows: InstallationDetailRow[];
        page: number;
        pageSize: number;
        totalRows: number;
    };
}

export interface InstallationFilterOptions {
    companies: string[];
    zones: string[];
    states: string[];
    models: string[];
    locTypes: string[];
    supervisors: string[];
    years: number[];
}

async function get<T>(path: string, params: URLSearchParams, token: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw body?.detail ?? body ?? { message: "Request failed" };
    }
    return res.json();
}

export function getInstallationDashboard(
    token: string,
    filters: Record<string, string>,
    search: string,
    page: number,
    pageSize = 50
) {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    if (search) params.set("search", search);
    return get<InstallationDashboardResponse>("/api/installation/dashboard", params, token);
}

export function getInstallationFilters(token: string) {
    return get<InstallationFilterOptions>("/api/installation/filters", new URLSearchParams(), token);
}

/** The `installation` block of the /api/upload/combined response. */
export interface InstallationUploadResult {
    files: { filename: string; row_count: number }[];
    row_count: number;
    total_rows_stored: number;
}