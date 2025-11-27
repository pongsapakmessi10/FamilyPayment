interface DreamJarProps {
    title: string;
    target: number;
    current: number;
}

export default function DreamJar({ title, target, current }: DreamJarProps) {
    const percentage = Math.min(100, Math.round((current / target) * 100));

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    <p className="text-gray-500 text-sm">เป้าหมาย: ฿{target.toLocaleString()}</p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold text-brown-600">${current.toLocaleString()}</span>
                    <span className="text-gray-400 text-sm ml-1">/ ${target.toLocaleString()}</span>
                </div>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                    className="bg-gradient-to-r from-brown-500 via-brown-600 to-brown-700 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="mt-2 text-right text-sm font-medium text-gray-600">{percentage}%</div>
        </div>
    );
}
