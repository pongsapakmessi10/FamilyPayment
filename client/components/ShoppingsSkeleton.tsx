import Skeleton from './Skeleton';

export default function ShoppingsSkeleton() {
    return (
        <div className="space-y-6 pb-24 md:pb-0">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-9 w-48" />
                </div>
            </div>

            {/* Form Skeleton */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100">
                <div className="flex justify-between items-center mb-4">
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                    <div className="w-full md:w-32">
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                    <div className="w-full md:w-48">
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-12 w-24 rounded-xl" />
                </div>
            </div>

            {/* Filters Skeleton */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/50 p-4 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                    <Skeleton className="w-5 h-5" />
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-9 w-20 rounded-full" />
                    ))}
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Skeleton className="w-5 h-5" />
                    <Skeleton className="h-9 w-32 rounded-lg" />
                </div>
            </div>

            {/* Items List Skeleton */}
            <div className="grid gap-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-blue-100 bg-white">
                        <div className="flex items-center gap-4 flex-1">
                            <Skeleton className="w-6 h-6 rounded-full" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Skeleton */}
            <div className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-72 md:right-8 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-blue-100 flex justify-between items-center z-40">
                <div className="flex gap-6">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-24" />
                </div>
                <div className="text-right">
                    <Skeleton className="h-3 w-24 mb-1 ml-auto" />
                    <Skeleton className="h-7 w-32 ml-auto" />
                </div>
            </div>
        </div>
    );
}
