import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";

const SESSION_DURATION_MS = 10 * 60 * 1000;
const PROMPT_DURATION_MS = 30 * 1000;

export default function SessionTimeoutGuard() {
    const { authenticated, logout, refresh } = useAuth();
    const [showPrompt, setShowPrompt] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(PROMPT_DURATION_MS / 1000);

    const sessionTimerRef = useRef<number | null>(null);
    const countdownIntervalRef = useRef<number | null>(null);
    const logoutTimerRef = useRef<number | null>(null);

    const clearAllTimers = () => {
        if (sessionTimerRef.current) window.clearTimeout(sessionTimerRef.current);
        if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
        if (logoutTimerRef.current) window.clearTimeout(logoutTimerRef.current);
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
                logout();
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

    const handleStayLoggedIn = async () => {
        if (await refresh()) startSessionTimer();
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
