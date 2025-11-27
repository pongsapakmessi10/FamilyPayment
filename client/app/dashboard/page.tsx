'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import SummaryCard from '@/components/SummaryCard';
import MonthlyBarChart from '@/components/MonthlyBarChart';
import TransactionModal from '@/components/TransactionModal';
import ExportControls from '@/components/ExportControls';
import MemberBalances from '@/components/MemberBalances';
import { socket } from '@/lib/socket';
import { Wallet, TrendingDown, PiggyBank } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface MonthlyData {
    month: string;
    year: number;
    monthNum: number;
    total: number;
}

export default function Dashboard() {
    const [data, setData] = useState<any>(null);
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
    const [balanceData, setBalanceData] = useState<any>(null);
    const [selectedMonthTransactions, setSelectedMonthTransactions] = useState<any[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [savingsSummary, setSavingsSummary] = useState<{ current: number, target: number }>({ current: 0, target: 0 });
    const { t } = useLanguage();
    const { isAuthenticated, loading: authLoading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.push('/');
            return;
        }

        fetchData();
        fetchMonthlyData();
        fetchBalances();

        const handleGoalUpdate = () => fetchSavingsSummary();
        socket.on('update-goal', handleGoalUpdate);

        return () => {
            socket.off('update-goal', handleGoalUpdate);
        };
    }, [isAuthenticated, authLoading, router]);

    const fetchData = async () => {
        try {
            const res = await api.get('/dashboard');
            setData(res.data);
            setSavingsSummary(res.data?.savingsSummary || { current: 0, target: 0 });
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    };

    const fetchMonthlyData = async () => {
        try {
            const res = await api.get('/dashboard/monthly');
            setMonthlyData(res.data);
        } catch (err) {
            console.error('Error fetching monthly data:', err);
        }
    };

    const fetchSavingsSummary = async () => {
        try {
            const res = await api.get('/dashboard');
            setSavingsSummary(res.data?.savingsSummary || { current: 0, target: 0 });
        } catch (err) {
            console.error('Error fetching savings summary:', err);
        }
    };

    const fetchBalances = async () => {
        try {
            const res = await api.get('/balances');
            setBalanceData(res.data);
        } catch (err) {
            console.error('Error fetching balances:', err);
        }
    };

    const handleBarClick = async (monthData: MonthlyData) => {
        try {
            const res = await api.get('/transactions/by-period', {
                params: {
                    type: 'month',
                    month: monthData.monthNum,
                    year: monthData.year
                }
            });
            setSelectedMonthTransactions(res.data);
            setModalTitle(`${monthData.month} ${monthData.year} - Transactions`);
            setModalOpen(true);
        } catch (err) {
            console.error('Error fetching month transactions:', err);
        }
    };

    if (authLoading || loadingData) return <div className="p-4 md:p-8 text-center text-brown-600">{t('common.loading')}</div>;

    return (
        <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
            {/* Header - Mobile Optimized */}
            <header className="px-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
                <p className="text-sm md:text-base text-brown-600 mt-1">{t('dashboard.welcome')}</p>
            </header>

            {/* Summary Cards - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <SummaryCard
                    title={t('dashboard.totalExpenses')}
                    amount={data?.totalBalance || 0}
                    icon={TrendingDown}
                    color="bg-gradient-to-br from-brown-500 via-brown-600 to-brown-700"
                />
                <SummaryCard
                    title={t('dashboard.savingsGoal')}
                    amount={savingsSummary.current}
                    icon={PiggyBank}
                    color="bg-gradient-to-br from-brown-500 via-brown-600 to-brown-700"
                />
                <SummaryCard
                    title="ยอดเงินคงเหลือ"
                    amount={balanceData?.totalBalance || 0}
                    icon={Wallet}
                    color="bg-gradient-to-br from-brown-500 via-brown-600 to-brown-700"
                />
            </div>

            {/* Member Balances */}
            {balanceData && (
                <MemberBalances
                    balances={balanceData.balances}
                    onBalanceUpdate={fetchBalances}
                />
            )}

            {/* Monthly Bar Chart - Mobile Optimized */}
            <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-gray-100">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-6">ภาพรวมค่าใช้จ่ายรายเดือน</h2>
                <p className="text-xs md:text-sm text-brown-600 mb-4">คลิกที่แท่งกราฟเพื่อดูรายละเอียดรายการของเดือนนั้น</p>
                <div className="overflow-x-auto">
                    <MonthlyBarChart data={monthlyData} onBarClick={handleBarClick} />
                </div>
            </div>

            {/* Export Controls */}
            <ExportControls familyName={user?.name || 'Family'} />

            {/* Transaction Modal */}
            <TransactionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                transactions={selectedMonthTransactions}
                title={modalTitle}
            />
        </div>
    );
}
