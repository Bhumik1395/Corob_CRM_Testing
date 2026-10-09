import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className={`relative inline-block ${className}`}>
            <select
                {...rest}
                className="h-9 w-full appearance-none rounded-full border border-border bg-surface pl-4 pr-9 text-sm text-ink outline-none transition-colors hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-lime"
            >
                {children}
            </select>
            <ChevronDown
                size={14}
                aria-hidden
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
        </div>
    );
}