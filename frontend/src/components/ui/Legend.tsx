export function Legend({ items }: { items: { label: string; color: string }[] }) {
    return (
        <ul className="flex items-center gap-4 text-xs text-muted">
            {items.map((i) => (
                <li key={i.label} className="flex items-center gap-1.5">
                    <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
                    {i.label}
                </li>
            ))}
        </ul>
    );
}