import { useState } from "react";
import { FileText, Gauge, PhoneCall, UploadCloud, Wrench } from "lucide-react";
import { downloadPdfReport } from "../../api/serviceCalls";
import { FocusFilterProvider, useFocusFilter } from "../../context/FocusFilterContext";
import { useAuth } from "../../auth/AuthContext";
import AppLayout from "./AppLayout";
import type { NavItem } from "./AppLayout";

const navItems: NavItem[] = [
    { to: "/dashboard/focus", label: "Service Calls", icon: PhoneCall },
    { to: "/dashboard/pm", label: "Preventive Measure", icon: Wrench },
    { to: "/dashboard/utilization", label: "Engineer Utilization", icon: Gauge },
];

const pinnedItems: NavItem[] = [{ to: "/dashboard/upload", label: "Upload Data", icon: UploadCloud }];

function DashboardShellInner() {
    const [generating, setGenerating] = useState(false);
    const { customer } = useFocusFilter();
    const { username, roles, logout } = useAuth();

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
        try {
            await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/session`, {
                method: "DELETE",
                credentials: "include",
            });
        } catch {
            // Sign-out proceeds even if the session cleanup call fails.
        }
        logout();
    };

    return (
        <AppLayout
            navItems={navItems}
            pinnedItems={pinnedItems}
            username={username}
            roleLabel={roleLabel}
            onSignOut={handleSignOut}
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
    );
}

export default function DashboardShell() {
    return (
        <FocusFilterProvider>
            <DashboardShellInner />
        </FocusFilterProvider>
    );
}