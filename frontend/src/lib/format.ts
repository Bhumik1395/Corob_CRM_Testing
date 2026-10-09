const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

/** "2025-08" -> "Aug/25" */
export function formatMonthShort(yearMonth: string): string {
    const [year, month] = yearMonth.split("-");
    return `${MONTHS_SHORT[parseInt(month, 10) - 1] ?? month}/${year.slice(-2)}`;
}

/** "2025-08" -> "August 2025" */
export function formatMonthFull(yearMonth: string): string {
    if (!yearMonth) return "";
    const [year, month] = yearMonth.split("-");
    return `${MONTHS_FULL[parseInt(month, 10) - 1] ?? month} ${year}`;
}

/** part / total as a percentage with one decimal; 0 when total is 0. */
export function percentOf(part: number, total: number): number {
    return total ? Math.round((part / total) * 1000) / 10 : 0;
}

export function formatHours(hours: number | null): string {
    return hours === null ? "—" : `${hours} hrs`;
}