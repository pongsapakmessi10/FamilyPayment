import { useLanguage } from '@/context/LanguageContext';

interface Transaction {
    _id: string;
    description: string;
    amount: number;
    date: string;
    payer: { name: string };
    category: string;
}

export default function TransactionList({ transactions }: { transactions: Transaction[] }) {
    const { t } = useLanguage();

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Desktop Table View */}
            <table className="hidden md:table w-full">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.description')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.category')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.payer')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.date')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.amount')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {transactions.map((tx) => (
                        <tr key={tx._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tx.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                    {tx.category}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.payer?.name || 'ไม่ระบุ'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(tx.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">฿{tx.amount.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Mobile List View */}
            <div className="md:hidden divide-y divide-gray-100">
                {transactions.map((tx) => (
                    <div key={tx._id} className="p-4 flex flex-col gap-2 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-gray-900">{tx.description}</h3>
                                <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                            </div>
                            <span className="font-bold text-gray-900">฿{tx.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                {tx.category}
                            </span>
                            <span className="text-gray-500 text-xs">
                                จ่ายโดย <span className="font-medium text-gray-700">{tx.payer?.name || 'ไม่ระบุ'}</span>
                            </span>
                        </div>
                    </div>
                ))}
                {transactions.length === 0 && (
                    <div className="p-8 text-center text-gray-500 text-sm">
                        ไม่พบรายการ
                    </div>
                )}
            </div>
        </div>
    );
}
