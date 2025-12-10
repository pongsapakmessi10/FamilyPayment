'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { socket } from '@/lib/socket';
import DreamJar from '@/components/DreamJar';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function DreamsPage() {
    const [goals, setGoals] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const { t } = useLanguage();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [formData, setFormData] = useState({
        title: '',
        targetAmount: ''
    });

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.push('/');
            return;
        }

        fetchGoals();

        socket.on('update-goal', (updatedGoal) => {
            setGoals((prev: any) => prev.map((g: any) => g._id === updatedGoal._id ? updatedGoal : g));
        });

        return () => {
            socket.off('update-goal');
        };
    }, [isAuthenticated, authLoading]);

    const fetchGoals = async () => {
        try {
            const res = await api.get('/goals');
            setGoals(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/goals', formData);
            setShowForm(false);
            setFormData({ title: '', targetAmount: '' });
            fetchGoals(); // Refresh list
        } catch (err) {
            console.error(err);
        }
    };

    const addFunds = async (id: string) => {
        const amount = prompt(t('dreams.enterAmount'));
        if (amount) {
            try {
                await api.post(`/goals/${id}/add`, { amount });
            } catch (err) {
                console.error(err);
            }
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">{t('dreams.title')}</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-brown-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-brown-700 transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    {t('dreams.newGoal')}
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <form onSubmit={handleSubmit} className="space-y-4 text-black">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder={t('dreams.goalTitle')}
                                className="border p-2 rounded-lg w-full"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                            <input
                                type="number"
                                placeholder={t('dreams.targetAmount')}
                                className="border p-2 rounded-lg w-full"
                                value={formData.targetAmount}
                                onChange={e => setFormData({ ...formData, targetAmount: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" className="bg-brown-600 text-white px-6 py-2 rounded-lg hover:bg-brown-700">
                            {t('dreams.createGoal')}
                        </button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {goals.map((goal: any) => (
                    <div
                        key={goal._id}
                        className="relative group cursor-pointer hover:scale-[1.02] transition-transform"
                        onClick={() => addFunds(goal._id)}
                    >
                        <DreamJar
                            title={goal.title}
                            target={goal.targetAmount}
                            current={goal.currentAmount}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
