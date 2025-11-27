import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
    title: string;
    amount: number;
    icon: LucideIcon;
    color?: string;
}

export default function SummaryCard({ title, amount, icon: Icon, color }: SummaryCardProps) {
    const accent = color || 'bg-gradient-to-br from-brown-500 via-brown-600 to-brown-700';

    return (
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-transform hover:scale-[1.02] duration-200">
            <div className={`p-3 md:p-4 rounded-xl ${accent} mr-4 shadow-sm text-white`}>
                <Icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="flex-1">
                <p className="text-xs md:text-sm text-gray-500 font-medium">{title}</p>
                <h3 className="text-xl md:text-2xl font-bold text-brown-700">฿{amount.toLocaleString()}</h3>
            </div>
        </div>
    );
}
