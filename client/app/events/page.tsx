'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Plus, Plane, Wallet, Loader2, Users, CalendarRange, Target } from 'lucide-react';

interface EventBudget {
    _id: string;
    name: string;
    description?: string;
    budget: number;
    spent: number;
    remaining: number;
    progress: number;
    startDate?: string;
    endDate?: string;
    createdAt?: string;
}

interface EventExpense {
    _id: string;
    description: string;
    amount: number;
    date: string;
    payer?: { _id: string; name: string };
}

export default function EventBudgetsPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading, user } = useAuth();

    const [events, setEvents] = useState<EventBudget[]>([]);
    const [expenses, setExpenses] = useState<EventExpense[]>([]);
    const [users, setUsers] = useState<{ _id: string; name: string }[]>([]);

    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [loadingExpenses, setLoadingExpenses] = useState(false);
    const [creatingEvent, setCreatingEvent] = useState(false);
    const [creatingExpense, setCreatingExpense] = useState(false);

    const [eventForm, setEventForm] = useState({
        name: '',
        budget: '',
        description: ''
    });

    const [expenseForm, setExpenseForm] = useState({
        description: '',
        amount: '',
        payer: ''
    });

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.push('/');
            return;
        }
        loadEvents();
        loadUsers();
    }, [isAuthenticated, authLoading]);

    useEffect(() => {
        if (selectedEventId) {
            loadExpenses(selectedEventId);
        } else {
            setExpenses([]);
        }
    }, [selectedEventId]);

    const loadEvents = async () => {
        try {
            setLoadingEvents(true);
            const res = await api.get('/event-budgets');
            setEvents(res.data);
            if (!selectedEventId && res.data.length) {
                setSelectedEventId(res.data[0]._id);
            }
        } catch (err) {
            console.error('Error loading events', err);
        } finally {
            setLoadingEvents(false);
        }
    };

    const loadUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
            if (res.data.length) {
                setExpenseForm(prev => ({ ...prev, payer: res.data[0]._id }));
            }
        } catch (err) {
            console.error('Error loading users', err);
        }
    };

    const loadExpenses = async (eventId: string) => {
        try {
            setLoadingExpenses(true);
            const res = await api.get(`/event-budgets/${eventId}/expenses`);
            setExpenses(res.data);
        } catch (err) {
            console.error('Error loading event expenses', err);
        } finally {
            setLoadingExpenses(false);
        }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventForm.name || !eventForm.budget) return;
        try {
            setCreatingEvent(true);
            const res = await api.post('/event-budgets', {
                name: eventForm.name,
                description: eventForm.description,
                budget: Number(eventForm.budget)
            });
            setEvents(prev => [res.data, ...prev]);
            setSelectedEventId(res.data._id);
            setEventForm({ name: '', budget: '', description: '' });
        } catch (err) {
            console.error('Error creating event', err);
            alert('สร้างกระเป๋า Trip Mode ไม่สำเร็จ');
        } finally {
            setCreatingEvent(false);
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEventId) return;
        if (!expenseForm.description || !expenseForm.amount) return;

        try {
            setCreatingExpense(true);
            const res = await api.post(`/event-budgets/${selectedEventId}/expenses`, {
                description: expenseForm.description,
                amount: Number(expenseForm.amount),
                payer: expenseForm.payer
            });

            // Update totals for selected event
            setEvents(prev => prev.map(ev => {
                if (ev._id !== selectedEventId) return ev;
                return {
                    ...ev,
                    spent: res.data.totals.spent,
                    remaining: res.data.totals.remaining,
                    progress: res.data.totals.progress
                };
            }));

            // Prepend expense
            await loadExpenses(selectedEventId);

            setExpenseForm(prev => ({ ...prev, description: '', amount: '' }));
        } catch (err) {
            console.error('Error adding event expense', err);
            alert('บันทึกรายจ่ายทริปไม่สำเร็จ');
        } finally {
            setCreatingExpense(false);
        }
    };

    const selectedEvent = useMemo(
        () => events.find(ev => ev._id === selectedEventId) || null,
        [events, selectedEventId]
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brown-600 to-brown-900 flex items-center justify-center shadow-lg">
                            <Plane className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">กระเป๋าตังค์เฉพาะกิจ</h1>
                            <p className="text-gray-500">Trip Mode / Event Budget - แยกค่าใช้จ่ายทริปไม่ให้ปนงบเดือน</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-100">
                    <Target className="w-4 h-4 text-brown-600" />
                    <div>
                        <p className="font-semibold">โฟกัสทริป</p>
                        <p className="text-gray-500">ตั้งงบ แยกจ่าย คุมหลุด</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create Event */}
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-brown-700" />
                            <h2 className="text-lg font-semibold text-gray-900">สร้างกระเป๋าทริป</h2>
                        </div>
                        <span className="text-xs text-gray-400 uppercase tracking-wide">Step 1</span>
                    </div>
                    <form onSubmit={handleCreateEvent} className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-sm text-gray-600">ชื่อทริป / อีเวนต์</label>
                            <input
                                type="text"
                                value={eventForm.name}
                                onChange={e => setEventForm({ ...eventForm, name: e.target.value })}
                                placeholder="เช่น ทริปญี่ปุ่น 2024"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-gray-600">งบสำหรับทริปนี้ (บาท)</label>
                            <input
                                type="number"
                                min="0"
                                value={eventForm.budget}
                                onChange={e => setEventForm({ ...eventForm, budget: e.target.value })}
                                placeholder="50,000"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:border-brown-500 focus:ring-2 focus:ring-brown-100 outline-none transition"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-gray-600">รายละเอียดเพิ่มเติม (ไม่บังคับ)</label>
                            <textarea
                                value={eventForm.description}
                                onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                                rows={2}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:border-brown-500 focus:ring-2 focus:ring-brown-100 outline-none transition resize-none"
                                placeholder="ที่พัก/เมือง/ธีมทริป"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={creatingEvent}
                            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brown-600 to-brown-800 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-60"
                        >
                            {creatingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            สร้างกระเป๋า Trip Mode
                        </button>
                    </form>
                </div>

                {/* Event list */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <CalendarRange className="w-5 h-5 text-brown-700" />
                            กระเป๋าที่สร้างไว้
                        </h2>
                        {loadingEvents && (
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                กำลังโหลด...
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {events.map(event => (
                            <button
                                key={event._id}
                                onClick={() => setSelectedEventId(event._id)}
                                className={`w-full text-left p-4 rounded-2xl border transition shadow-sm ${
                                    selectedEventId === event._id
                                        ? 'border-brown-500 bg-brown-50'
                                        : 'border-gray-100 bg-white hover:border-brown-200'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-500 uppercase tracking-wide">Event</p>
                                        <h3 className="text-xl font-semibold text-gray-900">{event.name}</h3>
                                        {event.description && (
                                            <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">งบ</p>
                                        <p className="text-lg font-bold text-gray-900">฿{event.budget.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-2">
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-brown-600 to-brown-800"
                                            style={{ width: `${event.progress || 0}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-700">
                                        <span>ใช้ไป ฿{event.spent.toLocaleString()}</span>
                                        <span>เหลือ ฿{event.remaining.toLocaleString()}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                        {!events.length && !loadingEvents && (
                            <div className="col-span-full border border-dashed border-gray-200 rounded-2xl p-6 text-center text-gray-500">
                                ยังไม่มีกระเป๋าทริป เริ่มต้นสร้างด้านซ้าย
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Selected event details + expense form/list */}
            {selectedEvent && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-brown-700" />
                                เติมรายจ่ายลงทริปนี้
                            </h3>
                            <span className="text-xs text-gray-500">Step 2</span>
                        </div>
                        <div className="bg-brown-50 border border-brown-100 rounded-xl p-3 text-sm text-brown-800">
                            <p className="font-semibold">{selectedEvent.name}</p>
                            <p>งบ ฿{selectedEvent.budget.toLocaleString()} | ใช้ไป ฿{selectedEvent.spent.toLocaleString()} | เหลือ ฿{selectedEvent.remaining.toLocaleString()}</p>
                        </div>
                        <form onSubmit={handleAddExpense} className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-sm text-gray-600">รายละเอียด</label>
                                <input
                                    type="text"
                                    value={expenseForm.description}
                                    onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    placeholder="เช่น ตั๋วเครื่องบิน ที่พัก ร้านอาหาร"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm text-gray-600">จำนวนเงิน (บาท)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={expenseForm.amount}
                                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:border-brown-500 focus:ring-2 focus:ring-brown-100 outline-none transition"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm text-gray-600">คนจ่าย</label>
                                <select
                                    value={expenseForm.payer}
                                    onChange={e => setExpenseForm({ ...expenseForm, payer: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:border-brown-500 focus:ring-2 focus:ring-brown-100 outline-none transition"
                                >
                                    {users.map(u => (
                                        <option key={u._id} value={u._id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={creatingExpense}
                                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brown-600 to-brown-800 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-60"
                            >
                                {creatingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                เพิ่มรายจ่ายทริปนี้
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-2 bg-white border border-gray-100 shadow-sm rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">รายจ่ายล่าสุดของทริปนี้</h3>
                            {loadingExpenses && (
                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    กำลังโหลด...
                                </div>
                            )}
                        </div>
                        {expenses.length === 0 && !loadingExpenses ? (
                            <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-500">
                                ยังไม่มีรายการรายจ่ายสำหรับทริปนี้
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {expenses.map(exp => (
                                    <div key={exp._id} className="py-3 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">{exp.description}</p>
                                            <p className="text-sm text-gray-500">
                                                {exp.payer?.name ? `โดย ${exp.payer.name}` : 'ไม่ระบุผู้จ่าย'} • {new Date(exp.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <p className="font-semibold text-gray-900">฿{exp.amount.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
