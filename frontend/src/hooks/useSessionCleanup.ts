import { useEffect } from "react";
export function useSessionCleanup() {
    useEffect(() => {
        const handler = () => {
            navigator.sendBeacon(
                `${import.meta.env.VITE_API_BASE_URL}/api/session`,
                new Blob([], { type: "application/json" })
            );
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, []);
}
