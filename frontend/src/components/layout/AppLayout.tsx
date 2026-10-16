import { useState } from "react";
import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import corobLogo from "../../assets/corob-logo.png";

export interface NavItem {
    to: string;
    label: string;
    icon: LucideIcon;

    end?: boolean;
}

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
    const Icon = item.icon;
    return (
        <NavLink
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${collapsed ? "justify-center" : ""
                } ${isActive ? "bg-lime font-medium text-forest-deep" : "text-muted hover:bg-gray-50 hover:text-ink"}`
            }
        >
            <Icon size={18} aria-hidden />
            <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
        </NavLink>
    );
}

export default function AppLayout({
    navItems,
    pinnedItems = [],
    username,
    roleLabel,
    onSignOut,
    footer,
}: {
    navItems: NavItem[];

    pinnedItems?: NavItem[];
    username: string | null;
    roleLabel: string;
    onSignOut: () => void;
    footer?: (collapsed: boolean) => ReactNode;
}) {
    const [collapsed, setCollapsed] = useState(false);
    const { pathname } = useLocation();

    const active = [...navItems, ...pinnedItems]
        .filter((i) => pathname === i.to || pathname.startsWith(i.to + "/"))
        .sort((a, b) => b.to.length - a.to.length)[0];

    return (
        <div className="flex h-screen overflow-hidden bg-bg">
            <aside
                className={`flex shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ${collapsed ? "w-[76px]" : "w-64"
                    }`}
            >
                <div className={`flex h-16 shrink-0 items-center ${collapsed ? "justify-center" : "justify-between px-5"}`}>
                    {!collapsed && <img src={corobLogo} alt="Corob" className="h-7 w-auto" />}
                    <button
                        onClick={() => setCollapsed((c) => !c)}
                        aria-label={collapsed ? "Expand menu" : "Collapse menu"}
                        title={collapsed ? "Expand menu" : "Collapse menu"}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-gray-50 hover:text-ink"
                    >
                        <Menu size={18} />
                    </button>
                </div>

                <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-2" aria-label="Main">
                    {navItems.map((item) => (
                        <NavRow key={item.to} item={item} collapsed={collapsed} />
                    ))}

                    {pinnedItems.length > 0 && (
                        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
                            {pinnedItems.map((item) => (
                                <NavRow key={item.to} item={item} collapsed={collapsed} />
                            ))}
                        </div>
                    )}
                </nav>

                {footer && <div className="shrink-0 p-3">{footer(collapsed)}</div>}
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-16 shrink-0 items-center justify-between px-6">
                    <h1 className="text-xl font-semibold">{active?.label ?? "Dashboard"}</h1>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 rounded-full border border-border bg-surface py-1.5 pl-1.5 pr-4">
                            <span
                                aria-hidden
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-lime text-sm font-semibold text-forest-deep"
                            >
                                {(username ?? "?").charAt(0).toUpperCase()}
                            </span>
                            <div className="leading-tight">
                                <p className="max-w-[220px] truncate text-sm font-medium">{username}</p>
                                <p className="max-w-[220px] truncate text-xs text-muted">{roleLabel}</p>
                            </div>
                        </div>
                        <button
                            onClick={onSignOut}
                            aria-label="Sign out"
                            title="Sign out"
                            className="rounded-full p-2 text-muted transition-colors hover:bg-surface hover:text-red"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
