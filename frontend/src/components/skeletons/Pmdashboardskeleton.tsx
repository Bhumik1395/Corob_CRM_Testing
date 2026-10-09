import { SkeletonCard, SkeletonPanel } from "../Skeleton";

/** Content-only skeleton: the filter row above it is real and stays interactive. */
export function PmDashboardSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>
            <div className="grid grid-cols-5 gap-4">
                <SkeletonPanel className="col-span-3" titleWidth="w-48" height={250} />
                <SkeletonPanel className="col-span-2" titleWidth="w-40" height={250} />
            </div>
            <SkeletonPanel titleWidth="w-32" height={300} />
        </div>
    );
}