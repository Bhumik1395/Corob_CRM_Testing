import { useState } from "react";
import { BarChart2, Printer, UploadCloud } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { deleteAllPmData } from "../../api/pm";
import { ConfirmModal } from "../ConfirmModal";
import AppLayout from "./AppLayout";
import type { NavItem } from "./AppLayout";

const navItems: NavItem[] = [
    { to: "/customer/pm", label: "PM Overview", icon: BarChart2, end: true },
    { to: "/customer/pm/print", label: "Print Docs", icon: Printer },
    { to: "/customer/pm/upload", label: "Upload Data", icon: UploadCloud },
];

export default function CustomerDashboardShell() {
    const { username, company, token, logout } = useAuth();
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    const handleSignOut = async () => {
        setSigningOut(true);
        try {
            await deleteAllPmData(token!);
        } catch {

        } finally {
            logout();
        }
    };

    return (
        <>
            <AppLayout
                navItems={navItems}
                username={username}
                roleLabel={company ?? "Customer"}
                onSignOut={() => setShowSignOutConfirm(true)}

            />

            {showSignOutConfirm && (
                <ConfirmModal
                    title="Sign out and delete all PM data?"
                    message={`Signing out permanently deletes every uploaded PM record for ${company}. This can't be undone — you'll need to re-upload the Excel file(s) next time you log in.`}
                    confirmLabel="Sign out & delete"
                    confirming={signingOut}
                    onConfirm={handleSignOut}
                    onCancel={() => setShowSignOutConfirm(false)}
                />
            )}
        </>
    );
}
