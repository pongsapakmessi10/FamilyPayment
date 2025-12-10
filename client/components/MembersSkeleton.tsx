import Skeleton from './Skeleton';

export default function MembersSkeleton() {
    return (
        <div className="space-y-4 md:space-y-8">
            {/* Header Skeleton */}
            <header className="bg-white/90 backdrop-blur card-mobile px-4 py-4 md:px-6 md:py-5 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </header>

            {/* Members Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4 md:gap-6 max-w-6xl mx-auto">
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className="card-mobile bg-white/90 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-blue-100"
                    >
                        <div className="flex items-start justify-between mb-3 md:mb-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-12 h-12 md:w-14 md:h-14 rounded-full" />
                                <div>
                                    <Skeleton className="h-6 w-32 mb-2" />
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="w-4 h-4 rounded-full" />
                                        <Skeleton className="h-3 w-40" />
                                    </div>
                                </div>
                            </div>
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
