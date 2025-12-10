import Skeleton from './Skeleton';

export default function BillsSkeleton() {
    return (
        <div className="space-y-6 pb-20 md:pb-0">
            {/* Header Skeleton */}
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-full sm:w-32 rounded-lg" />
            </header>

            {/* Legend Skeleton */}
            <div className="flex gap-3 md:gap-4 items-center flex-wrap">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <Skeleton className="w-4 h-4 rounded" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                ))}
            </div>

            {/* Calendar Skeleton - Single Block */}
            <div className="bg-white rounded-2xl shadow-lg p-3 md:p-6" style={{ height: '500px', minHeight: '400px' }}>
                <Skeleton className="w-full h-full rounded-lg" />
            </div>
        </div>
    );
}
