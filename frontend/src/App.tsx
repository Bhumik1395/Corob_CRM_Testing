import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";
import { Agentation } from "agentation";

import DashboardShell from "./components/layout/DashboardShell";
import FocusMode from "./pages/FocusMode";
import EngineerUtilization from "./pages/EngineerUtilization";
import UploadPage from "./pages/UploadPage";

import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import SessionTimeoutGuard from "./auth/SessionTimeoutGuard";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import CustomerDashboardShell from "./components/layout/CustomerDashboardShell";
import PmDashboard from "./pages/customer/PmDashboard";
import PmUploadPage from "./pages/customer/PmUploadPage";
import PmPrintPage from "./pages/customer/PmPrintPage";
import InstallationDashboard from "./pages/InstallationDashboard";

const queryClient = new QueryClient();

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <SessionTimeoutGuard />
                {import.meta.env.DEV && <Agentation />}
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />

                    {/* Dashboard for Employee & Admin */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute allowedRoles={["corob_employee", "admin"]}>
                                <DashboardShell />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="focus" replace />} />
                        <Route path="focus" element={<FocusMode />} />
                        <Route path="pm" element={<PmDashboard />} />
                        <Route path="utilization" element={<EngineerUtilization />} />
                        <Route path="installation" element={<InstallationDashboard />} />
                        <Route
                            path="upload"
                            element={
                                <ProtectedRoute allowedRoles={["admin"]}>
                                    <UploadPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="pm/print" element={<PmPrintPage />} />
                    </Route>

                    {/* Customer dashboard — no upload route */}
                    <Route
                        path="/customer"
                        element={
                            <ProtectedRoute allowedRoles={["customer"]}>
                                <CustomerDashboardShell />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="pm" replace />} />
                        <Route path="pm" element={<PmDashboard />} />
                        <Route path="pm/print" element={<PmPrintPage />} />
                    </Route>

                    {/* Admin PM upload */}
                    <Route
                        path="/admin/upload"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <DashboardShell />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<PmUploadPage />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </QueryClientProvider>
    );
}
