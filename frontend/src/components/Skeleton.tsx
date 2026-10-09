export function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
    return (
        <div className={`min-h-[112px] rounded-2xl border border-border bg-surface p-4 ${className}`}>
            <Skeleton className="mb-6 h-3.5 w-24" />
            <Skeleton className="h-7 w-20" />
        </div>
    );
}

export function SkeletonPanel({
    titleWidth = "w-40",
    height = 240,
    className = "",
}: {
    titleWidth?: string;
    height?: number;
    className?: string;
}) {
    return (
        <div className={`rounded-2xl border border-border bg-surface p-5 ${className}`}>
            <Skeleton className={`mb-3 h-4 ${titleWidth}`} />
            <div className="w-full animate-pulse rounded-xl bg-gray-100" style={{ height }} />
        </div>
    );
}

export function SkeletonTableRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, r) => (
                <tr key={r} className="border-t border-border">
                    {Array.from({ length: cols }).map((_, c) => (
                        <td key={c} className="p-3">
                            <Skeleton className="h-4 w-full max-w-[10rem]" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}

export function SkeletonPaginationBar() {
    return (
        <div className="flex items-center justify-between border-t border-border p-3 text-sm">
            <Skeleton className="h-4 w-28" />
            <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-7 w-14" />
            </div>
        </div>
    );
}