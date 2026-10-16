import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { deleteAllPmData } from "../api/pm";

const SESSION_DURATION_MS = 10 * 60 * 1000;
const PROMPT_DURATION_MS = 30 * 1000;

export default function SessionTimeoutGuard() {
    const { authenticated, token, roles, logout } = useAuth();
    const [showPrompt, setShowPrompt] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(PROMPT_DURATION_MS / 1000);

    const sessionTimerRef = useRef<number | null>(null);
    const countdownIntervalRef = useRef<number | null>(null);
    const logoutTimerRef = useRef<number | null>(null);

    const tokenRef = useRef(token);
    const rolesRef = useRef(roles);
    tokenRef.current = token;
    rolesRef.current = roles;

    const clearAllTimers = () => {
        if (sessionTimerRef.current) window.clearTimeout(sessionTimerRef.current);
        if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
        if (logoutTimerRef.current) window.clearTimeout(logoutTimerRef.current);
    };

    const signOutForInactivity = async () => {
        if (tokenRef.current) {
            try {
                const isEmployee = rolesRef.current.includes("corob_employee");
                await deleteAllPmData(tokenRef.current, isEmployee ? "__all__" : undefined);
            } catch {
            }
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

    const startSessionTimer = () => {
        clearAllTimers();
        setShowPrompt(false);

        sessionTimerRef.current = window.setTimeout(() => {
            setShowPrompt(true);
            setSecondsLeft(PROMPT_DURATION_MS / 1000);

            countdownIntervalRef.current = window.setInterval(() => {
                setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
            }, 1000);

            logoutTimerRef.current = window.setTimeout(() => {
                void signOutForInactivity();
            }, PROMPT_DURATION_MS);
        }, SESSION_DURATION_MS);
    };

    useEffect(() => {
        if (authenticated) {
            startSessionTimer();
        } else {
            clearAllTimers();
            setShowPrompt(false);
        }
        return clearAllTimers;
    }, [authenticated]);

    const handleStayLoggedIn = () => {
        startSessionTimer();
    };

    if (!authenticated || !showPrompt) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-6">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
                <h3 className="mb-2 text-lg font-semibold">Still there?</h3>
                <p className="mb-1 text-sm text-gray-600">Your session will end in {secondsLeft}s.</p>
                <p className="mb-6 text-xs text-gray-400">
                    You'll be signed out and returned to the login page if you don't respond.
                </p>
                <button
                    onClick={handleStayLoggedIn}
                    className="w-full rounded-full bg-forest px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-forest-deep"
                >
                    Stay signed in — give me 10 more minutes
                </button>
            </div>
        </div>
    );
}