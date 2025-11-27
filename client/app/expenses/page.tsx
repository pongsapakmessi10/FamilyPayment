'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { socket } from '@/lib/socket';
import TransactionList from '@/components/TransactionList';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function ExpensesPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const { t } = useLanguage();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: 'Food',
        payer: '',
        type: 'expense'
    });
    const [users, setUsers] = useState([]);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.push('/');
            return;
        }

        fetchTransactions();
        fetchUsers();

        socket.on('new-transaction', (newTx) => {
            if (newTx.type === 'expense') {
                setTransactions((prev: any) => [newTx, ...prev]);
            }
        });

        return () => {
            socket.off('new-transaction');
        };
    }, [isAuthenticated, authLoading]);

    const fetchTransactions = async () => {
        try {
            const res = await api.get('/transactions');
            setTransactions(res.data.filter((t: any) => t.type === 'expense'));
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
            if (res.data.length > 0) {
                setFormData(prev => ({ ...prev, payer: res.data[0]._id }));
            }
        } catch (err) {
            console.error(err);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.payer) {
            alert(t('expenses.selectPayer')); // Or use a better UI notification
            return;
        }
        try {
            await api.post('/transactions', {
                ...formData,
                amount: Number(formData.amount)
            });
            setShowForm(false);
            setFormData(prev => ({ ...prev, description: '', amount: '' }));
        } catch (err) {
            console.error(err);
            alert('บันทึกค่าใช้จ่ายไม่สำเร็จ');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">{t('expenses.title')}</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    {t('expenses.addExpense')}
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-black">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder={t('common.description')}
                                className="border p-2 rounded-lg w-full"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                            <input
                                type="number"
                                placeholder={t('common.amount')}
                                className="border p-2 rounded-lg w-full"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                            <select
                                className="border p-2 rounded-lg w-full"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option>อาหาร</option>
                                <option>สาธารณูปโภค</option>
                                <option>บันเทิง</option>
                                <option>เดินทาง</option>
                                <option>อื่นๆ</option>
                            </select>
                            <select
                                className="border p-2 rounded-lg w-full"
                                value={formData.payer}
                                onChange={e => setFormData({ ...formData, payer: e.target.value })}
                                required
                            >
                                <option value="" disabled>{t('expenses.selectPayer') || 'เลือกคนจ่าย'}</option>
                                {users.map((u: any) => (
                                    <option key={u._id} value={u._id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                            {t('expenses.saveExpense')}
                        </button>
                    </form>
                </div>
            )}

            {authLoading || loadingData ? (
                <div>{t('expenses.loading')}</div>
            ) : (
                <TransactionList transactions={transactions} />
            )}
        </div>
    );
}
