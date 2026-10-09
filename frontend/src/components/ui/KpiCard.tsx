import type { ReactNode } from "react";

export type KpiTone = "neutral" | "green" | "red";

const TONES: Record<KpiTone, { box: string; label: string; chip: string; caption: string }> = {
    neutral: {
        box: "bg-surface border-border text-ink",
        label: "text-muted",
        chip: "bg-gray-100 text-muted",
        caption: "text-muted",
    },
    green: {
        box: "bg-forest border-forest text-white",
        label: "text-white/75",
        chip: "bg-lime text-forest-deep",
        caption: "text-white/70",
    },
    red: {
        box: "bg-red border-red text-white",
        label: "text-white/90",
        chip: "bg-white text-red",
        caption: "text-white/85",
    },
};

export function KpiCard({
    label,
    value,
    chip,
    caption,
    tone = "neutral",
}: {
    label: string;
    value: string | number;
    chip?: ReactNode;
    caption?: ReactNode;
    tone?: KpiTone;
}) {
    const t = TONES[tone];
    return (
        <div className={`relative flex min-h-[112px] flex-col justify-between gap-3 overflow-hidden rounded-2xl border p-4 ${t.box}`}>
            {tone !== "neutral" && (
                <>
                    <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border border-white/10" />
                    <span aria-hidden className="pointer-events-none absolute -right-2 -top-2 h-20 w-20 rounded-full border border-white/10" />
                </>
            )}
            <p className={`relative text-sm leading-snug ${t.label}`}>{label}</p>
            <div className="relative">
                <p className="text-[28px] font-semibold leading-none tabular-nums">{value}</p>
                {(chip || caption) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {chip && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.chip}`}>{chip}</span>}
                        {caption && <span className={`text-xs ${t.caption}`}>{caption}</span>}
                    </div>
                )}
            </div>
        </div>
    );
}