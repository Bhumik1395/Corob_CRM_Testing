import { useState } from "react";
import { FileText, Gauge, Hammer, PhoneCall, Printer, UploadCloud, Wrench } from "lucide-react";
import { downloadPdfReport } from "../../api/serviceCalls";
import { deleteAllPmData } from "../../api/pm";
import { FocusFilterProvider, useFocusFilter } from "../../context/FocusFilterContext";
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
    const [generating, setGenerating] = useState(false);
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const { customer } = useFocusFilter();
    const { username, roles, token, logout } = useAuth();

    const roleLabel = roles.includes("corob_employee") ? "Corob Employee" : roles.includes("customer") ? "Customer" : "";

    const handleGeneratePdf = async () => {
        setGenerating(true);
        try {
            await downloadPdfReport(customer);
        } catch {
            alert("Failed to generate PDF report. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

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
                footer={(collapsed) =>
                    collapsed ? (
                        <button
                            onClick={handleGeneratePdf}
                            disabled={generating}
                            aria-label="Generate PDF Report"
                            title="Generate PDF Report"
                            className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-lime disabled:opacity-60"
                        >
                            <FileText size={18} />
                        </button>
                    ) : (
                        <div className="relative overflow-hidden rounded-2xl bg-forest p-4 text-white">
                            <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10" />
                            <span aria-hidden className="pointer-events-none absolute -right-2 -top-2 h-16 w-16 rounded-full border border-white/10" />
                            <p className="relative text-sm leading-snug">Need a snapshot to share? Export this view as a PDF.</p>
                            {customer && (
                                <p className="relative mt-2 text-xs text-white/70">
                                    For: <span className="font-medium text-white">{customer}</span>
                                </p>
                            )}
                            <button
                                onClick={handleGeneratePdf}
                                disabled={generating}
                                className="relative mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-lime py-2 text-sm font-medium text-forest-deep transition-opacity disabled:opacity-60"
                            >
                                <FileText size={14} /> {generating ? "Generating…" : "Generate PDF Report"}
                            </button>
                        </div>
                    )
                }
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