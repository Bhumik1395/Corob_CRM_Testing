import type { ReactNode } from "react";

export function Card({
    title,
    subtitle,
    actions,
    children,
    className = "",
    bodyClassName = "px-5 pb-4 pt-3",
}: {
    title?: string;
    subtitle?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
}) {
    return (
        <section className={`flex min-w-0 flex-col rounded-2xl border border-border bg-surface ${className}`}>
            {(title || actions) && (
                <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
                    <div className="min-w-0">
                        {title && <h2 className="text-[15px] font-semibold leading-tight">{title}</h2>}
                        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
                    </div>
                    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                </header>
            )}
            <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
        </section>
    );
}