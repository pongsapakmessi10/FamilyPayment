import Skeleton from './Skeleton';

export default function DebtsSkeleton() {
    return (
        <div className="space-y-8">
            {/* Balances Skeleton */}
            <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-blue-100">
                <Skeleton className="h-7 w-48 mb-6" />
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 bg-gray-50 rounded-xl border border-blue-100 gap-3 sm:gap-0">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-10 h-10 md:w-12 md:h-12 rounded-full" />
                                <div>
                                    <Skeleton className="h-4 w-32 mb-1" />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 pl-12 sm:pl-0">
                                <Skeleton className="h-6 w-24" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Header Skeleton */}
            <header className="flex justify-between items-center">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-10 w-32 rounded-lg" />
            </header>

            {/* Active Debts Skeleton */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200">
                <Skeleton className="h-7 w-48 mb-4" />
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-4 rounded-xl border bg-gray-50 border-gray-300">
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <Skeleton className="h-5 w-48 mb-2" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Skeleton className="h-4 w-20 mb-1" />
                                        <Skeleton className="h-6 w-24" />
                                    </div>
                                    <div>
                                        <Skeleton className="h-4 w-20 mb-1" />
                                        <Skeleton className="h-6 w-24" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
