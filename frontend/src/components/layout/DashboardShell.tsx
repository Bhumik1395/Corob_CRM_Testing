import { Gauge, Hammer, PhoneCall, Printer, UploadCloud, Wrench } from "lucide-react";
import { FocusFilterProvider } from "../../context/FocusFilterContext";
import { useAuth } from "../../auth/AuthContext";
import AppLayout from "./AppLayout";
import type { NavItem } from "./AppLayout";

const employeeNavItems: NavItem[] = [
    { to: "/dashboard/focus", label: "Service Calls", icon: PhoneCall },
    { to: "/dashboard/pm", label: "Preventive Measure", icon: Wrench, end: true },
    { to: "/dashboard/installation", label: "Installation", icon: Hammer },
    { to: "/dashboard/utilization", label: "Engineer Utilization", icon: Gauge },
    { to: "/dashboard/pm/print", label: "Print Docs", icon: Printer },
];

const adminNavItems: NavItem[] = [
    ...employeeNavItems,
    { to: "/dashboard/upload", label: "Upload Data", icon: UploadCloud },
];

function DashboardShellInner() {
    const { username, roles, logout } = useAuth();
    const isAdmin = roles.includes("admin");
    // ponytail: label falls back gracefully for any future role
    const roleLabel = isAdmin ? "Admin" : roles.includes("corob_employee") ? "Corob Employee" : "";
    const navItems = isAdmin ? adminNavItems : employeeNavItems;

    return (
        <AppLayout
            navItems={navItems}
            username={username}
            roleLabel={roleLabel}
            onSignOut={logout}
        />
    );
}

export default function DashboardShell() {
    return (
        <FocusFilterProvider>
            <DashboardShellInner />
        </FocusFilterProvider>
    );
}
