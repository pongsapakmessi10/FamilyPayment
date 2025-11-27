'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useState } from 'react';

interface MonthlyData {
    month: string;
    year: number;
    monthNum: number;
    total: number;
}

interface MonthlyBarChartProps {
    data: MonthlyData[];
    onBarClick: (monthData: MonthlyData) => void;
}

export default function MonthlyBarChart({ data, onBarClick }: MonthlyBarChartProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const handleClick = (data: any, index: number) => {
        onBarClick(data);
    };

    const handleMouseEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    const handleMouseLeave = () => {
        setActiveIndex(null);
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-blue-100">
                    <p className="text-sm font-semibold text-blue-600">
                        {payload[0].payload.month} {payload[0].payload.year}
                    </p>
                    <p className="text-lg font-bold text-blue-700">
                        ฿{payload[0].value.toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-500 mt-1">คลิกเพื่อดูรายละเอียด</p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#eaddd7" /> {/* brown-200 */}
                <XAxis
                    dataKey="month"
                    stroke="#3b82f6" // brown-600
                    style={{ fontSize: '12px', fontWeight: 500 }}
                />
                <YAxis
                    stroke="#3b82f6" // brown-600
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    tickFormatter={(value) => `฿${value.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f2e8e5' }} /> {/* brown-100 */}
                <Bar
                    dataKey="total"
                    radius={[8, 8, 0, 0]}
                    onClick={handleClick}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    style={{ cursor: 'pointer' }}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={activeIndex === index ? '#6d4c41' : '#a1887f'} // brown-800 : brown-500
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
