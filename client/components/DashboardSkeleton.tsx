import Skeleton from './Skeleton';

export default function DashboardSkeleton() {
    return (
        <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
            {/* Header */}
            <header className="px-1">
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                        <Skeleton className="h-12 w-12 rounded-full" />
                    </div>
                ))}
            </div>

            {/* Member Balances Skeleton */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div>
                                    <Skeleton className="h-4 w-24 mb-1" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                            <Skeleton className="h-5 w-20" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Monthly Bar Chart Skeleton */}
            <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-gray-100">
                <Skeleton className="h-6 w-48 mb-3" />
                <Skeleton className="h-4 w-64 mb-6" />
                <div className="flex items-end justify-between h-64 gap-2">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="w-full flex flex-col items-center gap-2">
                            <Skeleton className="w-full rounded-t-lg" style={{ height: `${[45, 72, 35, 88, 55, 63, 92, 48, 76, 38, 82, 58][i]}%` }} />
                            <Skeleton className="h-3 w-8" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
