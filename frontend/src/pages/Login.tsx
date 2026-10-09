import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, ImageIcon } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { AuthInitSkeleton } from "../components/skeletons/Authinitskeleton";
import corobLogo from "../assets/corob-logo.png";

/**
 * Image shown on the right, under the logo.
 * To add it: put the file in frontend/public (for example public/login-image.jpg)
 * and set this to "/login-image.jpg". While it is null a placeholder is shown.
 */
const LOGIN_IMAGE: string | null = null;

/**
 * Wavy left edge, in 0-1 coordinates so it scales with the box.
 * It is used three times, shifted left each time, to build the stacked "paper" layers.
 */
const WAVE =
    "M0.26,0 C0.15,0.14 0.34,0.24 0.23,0.38 C0.13,0.51 0.27,0.60 0.18,0.74 C0.12,0.84 0.20,0.93 0.15,1 L1,1 L1,0 Z";

const field =
    "h-11 w-full rounded-full border border-gray-300 bg-surface px-5 text-sm text-[#3F4D47] outline-none transition-colors placeholder:text-gray-400 hover:border-gray-400 focus-visible:border-[#4B6454] focus-visible:ring-2 focus-visible:ring-[#4B6454]/25";

export default function Login() {
    const { initialized, authenticated, roles, signIn } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        document.title = "Sign in — Corob Service";
    }, []);

    if (!initialized) {
        return <AuthInitSkeleton />;
    }

    if (authenticated) {
        if (roles.includes("corob_employee")) return <Navigate to="/dashboard/focus" replace />;
        if (roles.includes("customer")) return <Navigate to="/customer/pm" replace />;
        return <Navigate to="/unauthorized" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        const errMsg = await signIn(email, password);
        setSubmitting(false);
        if (errMsg) setError(errMsg);
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-4 sm:p-8">
            {/* Soft blurred green blobs behind the card */}
            <div aria-hidden className="pointer-events-none absolute -left-24 top-8 h-80 w-80 rounded-full bg-green/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-forest/15 blur-3xl" />

            {/* Clip paths for the wavy image edge (invisible, referenced by id) */}
            <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
                <defs>
                    <clipPath id="login-wave-1" clipPathUnits="objectBoundingBox">
                        <path d={WAVE} />
                    </clipPath>
                    <clipPath id="login-wave-2" clipPathUnits="objectBoundingBox">
                        <path d={WAVE} transform="translate(-0.045 0)" />
                    </clipPath>
                    <clipPath id="login-wave-3" clipPathUnits="objectBoundingBox">
                        <path d={WAVE} transform="translate(-0.09 0)" />
                    </clipPath>
                </defs>
            </svg>

            <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-surface shadow-[0_20px_60px_rgba(20,40,30,0.14)] lg:min-h-[600px] lg:grid-cols-2">
                {/* Left: sign-in */}
                <div className="flex items-center justify-center px-8 py-12 sm:px-14">
                    <form onSubmit={handleSubmit} className="w-full max-w-xs">
                        {/* The right-hand panel is hidden on small screens, so show the logo here instead. */}
                        <img src={corobLogo} alt="Corob" className="mx-auto mb-8 h-8 w-auto lg:hidden" />

                        <h1 className="mb-8 text-center text-2xl font-medium text-[#3F4D47]">Sign in</h1>

                        {error && (
                            <div
                                role="alert"
                                className="mb-5 flex items-start gap-2 rounded-2xl border border-red/20 bg-red-soft p-3 text-sm text-red"
                            >
                                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
                                <span>{error}</span>
                            </div>
                        )}

                        <label htmlFor="email" className="mb-1.5 ml-4 block text-xs text-muted">
                            Work email
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            autoComplete="username"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@corob.com"
                            className={`${field} mb-5`}
                        />

                        <label htmlFor="password" className="mb-1.5 ml-4 block text-xs text-muted">
                            Password
                        </label>
                        <div className="relative mb-7">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`${field} pr-12`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((s) => !s)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 transition-colors hover:text-muted"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="h-11 w-full rounded-full bg-[#4B6454] text-sm font-medium text-white transition-colors hover:bg-[#3C5345] disabled:opacity-60"
                        >
                            {submitting ? "Signing in…" : "Sign in"}
                        </button>
                    </form>
                </div>

                {/* Right: logo, then the image with a layered wavy edge */}
                <aside className="hidden flex-col lg:flex">
                    <div className="flex h-28 shrink-0 items-center justify-center">
                        <img src={corobLogo} alt="Corob" className="h-10 w-auto" />
                    </div>

                    {/* drop-shadow on the wrapper gives the stacked layers their depth */}
                    <div
                        className="relative min-h-[360px] flex-1"
                        style={{ filter: "drop-shadow(-4px 2px 8px rgba(20,40,30,0.14))" }}
                    >
                        <div className="absolute inset-0 bg-[#E4E8E6]" style={{ clipPath: "url(#login-wave-3)" }} />
                        <div className="absolute inset-0 bg-[#F0F2F1]" style={{ clipPath: "url(#login-wave-2)" }} />
                        <div className="absolute inset-0 bg-[#CFDAD3]" style={{ clipPath: "url(#login-wave-1)" }}>
                            {LOGIN_IMAGE ? (
                                <img src={LOGIN_IMAGE} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-2 pl-[20%] text-[#4B6454]">
                                    <ImageIcon size={28} aria-hidden />
                                    <span className="text-sm">Image goes here</span>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}