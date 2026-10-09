import { Skeleton } from "../Skeleton";

export function AuthInitSkeleton() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-bg p-4 sm:p-8">
            <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-surface shadow-[0_20px_60px_rgba(20,40,30,0.14)] lg:min-h-[600px] lg:grid-cols-2">
                <div className="flex items-center justify-center px-8 py-12 sm:px-14">
                    <div className="w-full max-w-xs">
                        <Skeleton className="mx-auto mb-8 h-7 w-24" />
                        <Skeleton className="mb-2 ml-4 h-3 w-20" />
                        <Skeleton className="mb-5 h-11 w-full rounded-full" />
                        <Skeleton className="mb-2 ml-4 h-3 w-20" />
                        <Skeleton className="mb-7 h-11 w-full rounded-full" />
                        <Skeleton className="h-11 w-full rounded-full" />
                    </div>
                </div>
                <div className="hidden flex-col lg:flex">
                    <div className="flex h-28 items-center justify-center">
                        <Skeleton className="h-10 w-36" />
                    </div>
                    <div className="flex-1 animate-pulse bg-gray-100" />
                </div>
            </div>
        </div>
    );
}