import { BarChart2, Printer } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import AppLayout from "./AppLayout";
import type { NavItem } from "./AppLayout";

const navItems: NavItem[] = [
    { to: "/customer/pm", label: "PM Overview", icon: BarChart2, end: true },
    { to: "/customer/pm/print", label: "Print Docs", icon: Printer },
];

export default function CustomerDashboardShell() {
    const { username, company, logout } = useAuth();

    return (
        <AppLayout
            navItems={navItems}
            username={username}
            roleLabel={company ?? "Customer"}
            onSignOut={logout}
        />
    );
}
