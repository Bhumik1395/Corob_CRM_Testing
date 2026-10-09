import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface FocusFilterContextValue {
    customer: string;
    setCustomer: (customer: string) => void;
}

const FocusFilterContext = createContext<FocusFilterContextValue | undefined>(undefined);

export function FocusFilterProvider({ children }: { children: ReactNode }) {
    const [customer, setCustomer] = useState("");
    return (
        <FocusFilterContext.Provider value={{ customer, setCustomer }}>
            {children}
        </FocusFilterContext.Provider>
    );
}

export function useFocusFilter() {
    const ctx = useContext(FocusFilterContext);
    if (!ctx) throw new Error("useFocusFilter must be used within FocusFilterProvider");
    return ctx;
}