import { useAuth } from "../auth/AuthContext";

export default function Unauthorized() {
    const { logout } = useAuth();
    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
            <div className="bg-white rounded-xl border p-10 w-[440px] text-center" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="text-xl font-semibold mb-2">No access</h2>
                <p className="text-sm text-gray-500 mb-6">
                    Your account doesn't have the "customer" or "corob_employee" role assigned yet.
                    Contact your admin to get access.
                </p>
                <button
                    onClick={() => logout()}
                    className="w-full border text-sm font-medium px-4 py-2.5 rounded-md hover:bg-gray-50"
                >
                    Sign out
                </button>
            </div>
        </div>
    );
}
