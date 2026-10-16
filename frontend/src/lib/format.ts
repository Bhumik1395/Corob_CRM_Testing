const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];


export function formatMonthShort(yearMonth: string): string {
    const [year, month] = yearMonth.split("-");
    return `${MONTHS_SHORT[parseInt(month, 10) - 1] ?? month}/${year.slice(-2)}`;
}


export function formatMonthFull(yearMonth: string): string {
    if (!yearMonth) return "";
    const [year, month] = yearMonth.split("-");
    return `${MONTHS_FULL[parseInt(month, 10) - 1] ?? month} ${year}`;
}


export function percentOf(part: number, total: number): number {
    return total ? Math.round((part / total) * 1000) / 10 : 0;
}

export function formatHours(hours: number | null): string {
    return hours === null ? "—" : `${hours} hrs`;
}


export function monthName(mm: string): string {
    return MONTHS_FULL[parseInt(mm, 10) - 1] ?? mm;
}
