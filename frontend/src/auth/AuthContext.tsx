import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const TOKEN_STORAGE_KEY = "corob_token";

interface AuthContextValue {
    initialized: boolean;
    authenticated: boolean;
    username: string | null;
    roles: string[];
    company: string | null;
    token: string | null;
    signIn: (email: string, password: string) => Promise<string | null>;
    logout: () => void;
    authError: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [initialized, setInitialized] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [roles, setRoles] = useState<string[]>([]);
    const [company, setCompany] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);

    const clearIdentity = useCallback(() => {
        setToken(null);
        setUsername(null);
        setRoles([]);
        setCompany(null);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        queryClient.cancelQueries();
        queryClient.clear();
    }, [queryClient]);

    const resolveIdentity = useCallback(async (accessToken: string): Promise<boolean> => {
        const res = await fetch(`${API_BASE}/api/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            setAuthError(body?.detail?.message ?? "Your account isn't authorized yet.");
            clearIdentity();
            return false;
        }
        const data = await res.json();
        setToken(accessToken);
        setUsername(data.username);
        setRoles(data.roles);
        setCompany(data.company);
        setAuthError(null);
        localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
        return true;
    }, [clearIdentity]);

    useEffect(() => {
        const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
        (saved ? resolveIdentity(saved) : Promise.resolve(false)).finally(() => setInitialized(true));
    }, [resolveIdentity]);

    const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
        setAuthError(null);
        queryClient.clear();
        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                return body?.detail?.message ?? "Incorrect email or password.";
            }
            const { access_token } = await res.json();
            const ok = await resolveIdentity(access_token);
            if (!ok) {
                return authError ?? "Your account isn't authorized for this app yet.";
            }
            return null;
        } catch {
            return "Couldn't reach the server. Please try again.";
        }
    }, [resolveIdentity, authError, queryClient]);

    const logout = useCallback(() => {
        clearIdentity();
    }, [clearIdentity]);

    const value: AuthContextValue = {
        initialized,
        authenticated: !!token,
        username,
        roles,
        company,
        token,
        signIn,
        logout,
        authError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}