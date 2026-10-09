export function Segmented<T extends string>({
    options,
    value,
    onChange,
    label,
}: {
    options: { value: T; label: string; disabled?: boolean }[];
    value: T;
    onChange: (v: T) => void;
    label?: string;
}) {
    return (
        <div role="group" aria-label={label} className="inline-flex rounded-full bg-gray-100 p-1">
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        aria-pressed={active}
                        disabled={o.disabled}
                        onClick={() => onChange(o.value)}
                        className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${active ? "bg-forest text-white" : o.disabled ? "cursor-not-allowed text-gray-400" : "text-muted hover:text-ink"
                            }`}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}