import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({
    children,
    allowedRoles,
}: {
    children: ReactNode;
    allowedRoles: string[];
}) {
    const { initialized, authenticated, roles } = useAuth();

    if (!initialized) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
                <p className="text-gray-500 text-sm">Loading…</p>
            </div>
        );
    }

    if (!authenticated) {
        return <Navigate to="/login" replace />;
    }

    const hasAccess = allowedRoles.some((r) => roles.includes(r));
    if (!hasAccess) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
}
