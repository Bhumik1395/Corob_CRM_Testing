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

const queryClient = new QueryClient();

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <SessionTimeoutGuard />
                {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_AGENTATION === "true") && <Agentation />}
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />

                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute allowedRoles={["corob_employee"]}>
                                <DashboardShell />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="focus" replace />} />
                        <Route path="focus" element={<FocusMode />} />
                        <Route path="pm" element={<PmDashboard />} />
                        <Route path="utilization" element={<EngineerUtilization />} />
                        <Route path="upload" element={<UploadPage />} />
                    </Route>

                    <Route
                        path="/customer"
                        element={
                            <ProtectedRoute allowedRoles={["customer", "corob_employee"]}>
                                <CustomerDashboardShell />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="pm" replace />} />
                        <Route path="pm" element={<PmDashboard />} />
                        <Route path="pm/upload" element={<PmUploadPage />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </QueryClientProvider>
    );
}