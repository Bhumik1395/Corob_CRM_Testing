import { useState } from "react";
import { Gauge, Hammer, PhoneCall, Printer, UploadCloud, Wrench } from "lucide-react";
import { deleteAllPmData } from "../../api/pm";
import { FocusFilterProvider } from "../../context/FocusFilterContext";
import { useAuth } from "../../auth/AuthContext";
import { ConfirmModal } from "../ConfirmModal";
import AppLayout from "./AppLayout";
import type { NavItem } from "./AppLayout";

const navItems: NavItem[] = [
    { to: "/dashboard/focus", label: "Service Calls", icon: PhoneCall },
    { to: "/dashboard/pm", label: "Preventive Measure", icon: Wrench, end: true },
    { to: "/dashboard/installation", label: "Installation", icon: Hammer },
    { to: "/dashboard/utilization", label: "Engineer Utilization", icon: Gauge },
    { to: "/dashboard/pm/print", label: "Print Docs", icon: Printer },
];

const pinnedItems: NavItem[] = [{ to: "/dashboard/upload", label: "Upload Data", icon: UploadCloud }];

function DashboardShellInner() {
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const { username, roles, token, logout } = useAuth();

    const roleLabel = roles.includes("corob_employee") ? "Corob Employee" : roles.includes("customer") ? "Customer" : "";

    const handleSignOut = async () => {
        setSigningOut(true);
        try {
            if (token) await deleteAllPmData(token, "__all__");
        } catch {

        }
        try {
            await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/session`, {
                method: "DELETE",
                credentials: "include",
            });
        } catch {

        }
        logout();
    };

    return (
        <>
            <AppLayout
                navItems={navItems}
                pinnedItems={pinnedItems}
                username={username}
                roleLabel={roleLabel}
                onSignOut={() => setShowSignOutConfirm(true)}
            />

            {showSignOutConfirm && (
                <ConfirmModal
                    title="Sign out and delete all PM data?"
                    message="Signing out permanently deletes the uploaded PM data for every company, plus your Service Calls session. You'll need to re-upload the Excel file(s) next time."
                    confirmLabel="Sign out & delete"
                    confirming={signingOut}
                    onConfirm={handleSignOut}
                    onCancel={() => setShowSignOutConfirm(false)}
                />
            )}
        </>
    );
}

export default function DashboardShell() {
    return (
        <FocusFilterProvider>
            <DashboardShellInner />
        </FocusFilterProvider>
    );
}