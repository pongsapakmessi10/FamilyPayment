import Skeleton from './Skeleton';

export default function TransactionListSkeleton() {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Desktop Table View */}
            <table className="hidden md:table w-full">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left"><Skeleton className="h-4 w-20" /></th>
                        <th className="px-6 py-3 text-left"><Skeleton className="h-4 w-24" /></th>
                        <th className="px-6 py-3 text-left"><Skeleton className="h-4 w-24" /></th>
                        <th className="px-6 py-3 text-left"><Skeleton className="h-4 w-20" /></th>
                        <th className="px-6 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {[...Array(5)].map((_, i) => (
                        <tr key={i}>
                            <td className="px-6 py-4"><Skeleton className="h-5 w-48" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-5 w-20 ml-auto" /></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Mobile List View */}
            <div className="md:hidden divide-y divide-gray-100">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="h-5 w-20" />
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
