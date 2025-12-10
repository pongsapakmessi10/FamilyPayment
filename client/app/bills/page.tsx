'use client';
import { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import api from '@/lib/api';
import { socket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, CheckCircle } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import BillsSkeleton from '@/components/BillsSkeleton';

const localizer = momentLocalizer(moment);

interface BillReminder {
    _id: string;
    title: string;
    amount?: number;
    category?: string;
    dueDate: string;
    isRecurring: boolean;
    frequency: string;
    status: 'active' | 'paid' | 'overdue';
    createdBy?: {
        _id: string;
        name: string;
        email: string;
    };
}

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: BillReminder;
}

export default function BillsPage() {
    const { user, isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const [bills, setBills] = useState<BillReminder[]>([]);
    const [selectedBill, setSelectedBill] = useState<BillReminder | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showNewBillForm, setShowNewBillForm] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: '',
        dueDate: '',
        dueTime: '12:00',
        isRecurring: false,
        frequency: 'none',
        recurrenceDate: ''
    });

    const [recurrenceDateError, setRecurrenceDateError] = useState('');

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/');
            return;
        }

        if (user) {
            fetchBills();

            socket.on('bill-created', () => fetchBills());
            socket.on('bill-paid', () => fetchBills());
            socket.on('bill-updated', () => fetchBills());
            socket.on('bill-deleted', () => fetchBills());
            socket.on('bill-due-today', (data: any) => {
                alert(`Reminder: ${data.bill.title} is due today!`);
                fetchBills();
            });
            socket.on('bill-overdue', (data: any) => {
                alert(`${data.bill.title} เกินกำหนดชำระแล้ว!`);
                fetchBills();
            });

            return () => {
                socket.off('bill-created');
                socket.off('bill-paid');
                socket.off('bill-updated');
                socket.off('bill-deleted');
                socket.off('bill-due-today');
                socket.off('bill-overdue');
            };
        }
    }, [user, loading, isAuthenticated, router]);

    const fetchBills = async () => {
        try {
            const res = await api.get('/bills');
            setBills(res.data);
        } catch (err) {
            console.error('Error fetching bills:', err);
        } finally {
            setLoadingData(false);
        }
    };

    const handleRecurrenceDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const numValue = parseInt(value);

        if (value === '') {
            setFormData({ ...formData, recurrenceDate: '' });
            setRecurrenceDateError('');
            return;
        }

        if (numValue < 1 || numValue > 31) {
            setRecurrenceDateError('กรอกวันได้แค่ 1 ถึง 31 เท่านั้น');
        } else {
            setRecurrenceDateError('');
        }

        setFormData({ ...formData, recurrenceDate: value });
    };

    const handleCreateBill = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.isRecurring && formData.frequency === 'monthly' && formData.recurrenceDate) {
            const numValue = parseInt(formData.recurrenceDate);
            if (numValue < 1 || numValue > 31) {
                setRecurrenceDateError('กรอกวันได้แค่ 1 ถึง 31 เท่านั้น');
                return;
            }
        }

        try {
            // Combine date and time
            const combinedDateTime = new Date(`${formData.dueDate}T${formData.dueTime}`);

            await api.post('/bills', {
                ...formData,
                dueDate: combinedDateTime.toISOString(),
                amount: formData.amount ? parseFloat(formData.amount) : undefined,
                recurrenceDate: formData.recurrenceDate ? parseInt(formData.recurrenceDate) : undefined
            });
            setFormData({
                title: '',
                amount: '',
                category: '',
                dueDate: '',
                dueTime: '12:00',
                isRecurring: false,
                frequency: 'none',
                recurrenceDate: ''
            });
            setShowNewBillForm(false);
            fetchBills();
        } catch (err: any) {
            console.error('Error creating bill:', err);
            alert(err.response?.data?.message || 'ไม่สามารถสร้างบิลได้');
        }
    };

    const handlePayNow = async () => {
        if (!selectedBill) return;
        if (!user || !selectedBill.createdBy || selectedBill.createdBy._id !== user.id) return;

        try {
            await api.put(`/bills/${selectedBill._id}/pay`);
            setShowModal(false);
            setSelectedBill(null);
            fetchBills();
            alert('บิลถูกระบุว่าจ่ายแล้วและสร้างรายการค่าใช้จ่ายเรียบร้อย!');
        } catch (err: any) {
            console.error('Error paying bill:', err);
            if (err.response?.status !== 403) {
                alert(err.response?.data?.message || 'ไม่สามารถจ่ายบิลได้');
            }
        }
    };

    const events: CalendarEvent[] = bills.map((bill) => ({
        id: bill._id,
        title: bill.createdBy ? `${bill.title} (${bill.createdBy.name})` : bill.title,
        start: new Date(bill.dueDate),
        end: new Date(bill.dueDate),
        resource: bill
    }));

    const eventStyleGetter = (event: CalendarEvent) => {
        const { status } = event.resource;
        let backgroundColor = '#FCD34D';

        if (status === 'paid') {
            backgroundColor = '#10B981';
        } else if (status === 'overdue') {
            backgroundColor = '#EF4444';
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    if (loading || loadingData) {
        return <BillsSkeleton />;
    }

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">ปฏิทินบิล</h1>
                    <p className="text-sm md:text-base text-brown-600">ติดตามและจัดการบิลของครอบครัว</p>
                </div>
                <button
                    onClick={() => setShowNewBillForm(true)}
                    className="bg-brown-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brown-700 transition-colors w-full sm:w-auto justify-center"
                >
                    <Plus className="w-5 h-5" />
                    สร้างบิลใหม่
                </button>
            </header>

            <div className="flex gap-3 md:gap-4 items-center text-xs md:text-sm flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#FCD34D] rounded"></div>
                    <span>เร็วๆ นี้</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#EF4444] rounded"></div>
                    <span>เกินกำหนด</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#10B981] rounded"></div>
                    <span>จ่ายแล้ว</span>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-3 md:p-6" style={{ height: '500px', minHeight: '400px' }}>
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    date={currentDate}
                    onNavigate={(date) => setCurrentDate(date)}
                    style={{ height: '100%' }}
                    eventPropGetter={eventStyleGetter}
                    onSelectEvent={(event: any) => {
                        setSelectedBill(event.resource);
                        setShowModal(true);
                    }}
                    views={['month', 'week', 'day']}
                    defaultView="month"
                />
            </div>

            {showNewBillForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowNewBillForm(false)}>
                    <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-700 mb-4">สร้างบิลใหม่</h3>
                        <form onSubmit={handleCreateBill} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อรายการ</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="เช่น ค่าไฟ"
                                    className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-brown-500 text-black"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน (฿) - ไม่ระบุได้</label>
                                <input
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="0.00"
                                    className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-brown-500 text-black"
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="เช่น สาธารณูปโภค"
                                    className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-brown-500 text-black"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">วันครบกำหนด</label>
                                    <input
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-brown-500 text-black"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เวลา</label>
                                    <input
                                        type="time"
                                        value={formData.dueTime}
                                        onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                                        className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-brown-500 text-black"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isRecurring"
                                    checked={formData.isRecurring}
                                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">บิลที่ต้องจ่ายประจำ</label>
                            </div>

                            {formData.isRecurring && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ความถี่</label>
                                        <select
                                            value={formData.frequency}
                                            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                            className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-brown-500 text-black"
                                        >
                                            <option value="none">ไม่ระบุ</option>
                                            <option value="monthly">รายเดือน</option>
                                            <option value="weekly">รายสัปดาห์</option>
                                            <option value="yearly">รายปี</option>
                                        </select>
                                    </div>

                                    {formData.frequency === 'monthly' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ของเดือน (1-31)</label>
                                            <input
                                                type="number"
                                                value={formData.recurrenceDate}
                                                onChange={handleRecurrenceDateChange}
                                                placeholder="เช่น 25"
                                                className={`border p-3 rounded-lg w-full focus:ring-2 focus:ring-brown-500 text-black ${recurrenceDateError ? 'border-red-500' : 'border-gray-300'
                                                    }`}
                                                min="1"
                                                max="31"
                                            />
                                            {recurrenceDateError && (
                                                <p className="text-red-500 text-sm mt-1">{recurrenceDateError}</p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    className="bg-brown-600 text-white px-6 py-2 rounded-lg hover:bg-brown-700 transition-colors flex-1"
                                >
                                    สร้างบิล
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowNewBillForm(false)}
                                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showModal && selectedBill && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
                    <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-700 mb-4">{selectedBill.title}</h3>

                        <div className="space-y-3">
                            {selectedBill.amount && (
                                <div>
                                    <p className="text-sm text-gray-500">จำนวนเงิน</p>
                                    <p className="text-2xl font-bold text-brown-600">฿{selectedBill.amount.toLocaleString()}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm text-gray-500">วันครบกำหนด</p>
                                <p className="font-semibold">{new Date(selectedBill.dueDate).toLocaleDateString()}</p>
                            </div>

                            {selectedBill.category && (
                                <div>
                                    <p className="text-sm text-gray-500">หมวดหมู่</p>
                                    <p className="font-semibold">{selectedBill.category}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm text-gray-500">สถานะ</p>
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${selectedBill.status === 'paid' ? 'bg-green-100 text-green-700' :
                                    selectedBill.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {selectedBill.status.toUpperCase()}
                                </span>
                            </div>

                            {selectedBill.isRecurring && (
                                <div>
                                    <p className="text-sm text-gray-500">ทำซ้ำ</p>
                                    <p className="font-semibold capitalize">{selectedBill.frequency}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6 items-center">
                            {selectedBill.status !== 'paid' && selectedBill.createdBy?._id === user?.id ? (
                                <button
                                    onClick={handlePayNow}
                                    className="bg-brown-600 text-white px-6 py-2 rounded-lg hover:bg-brown-700 transition-colors flex-1 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    จ่ายเลย
                                </button>
                            ) : selectedBill.status !== 'paid' && (
                                <div className="flex-1 text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
                                    บิลของ {selectedBill.createdBy?.name || 'สมาชิกในครอบครัว'}
                                </div>
                            )}
                            <button
                                onClick={() => setShowModal(false)}
                                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
