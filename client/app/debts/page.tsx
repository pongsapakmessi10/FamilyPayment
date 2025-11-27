'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { socket } from '@/lib/socket';
import { Plus, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function DebtsPage() {
    const [debts, setDebts] = useState<any[]>([]);
    const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
    const [sentRequests, setSentRequests] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [balances, setBalances] = useState<{ totalBalance: number, balances: any[] } | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [selectedDebt, setSelectedDebt] = useState<any | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const { t } = useLanguage();
    const { isAuthenticated, loading: authLoading, user } = useAuth();
    const router = useRouter();

    const [formData, setFormData] = useState({
        amount: '',
        lenderId: '',
        description: ''
    });

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.push('/');
            return;
        }

        fetchData();

        // Real-time WebSocket listeners for all events
        socket.on('new-borrow-request', () => {
            console.log('📩 New borrow request received');
            fetchData();
        });

        socket.on('borrow-request-approved', () => {
            console.log('✅ Borrow request approved');
            fetchData();
        });

        socket.on('borrow-request-rejected', () => {
            console.log('❌ Borrow request rejected');
            fetchData();
        });

        socket.on('payment-submitted', () => {
            console.log('💰 Payment submitted');
            fetchData();
        });

        socket.on('payment-approved', () => {
            console.log('✅ Payment approved');
            fetchData();
        });

        socket.on('payment-rejected', () => {
            console.log('❌ Payment rejected');
            fetchData();
        });

        return () => {
            socket.off('new-borrow-request');
            socket.off('borrow-request-approved');
            socket.off('borrow-request-rejected');
            socket.off('payment-submitted');
            socket.off('payment-approved');
            socket.off('payment-rejected');
        };
    }, [isAuthenticated, authLoading, router]);

    const fetchData = async () => {
        try {
            const [debtsRes, receivedRes, sentRes, usersRes, balancesRes] = await Promise.all([
                api.get('/transactions'),
                api.get('/borrow-requests/received'),
                api.get('/borrow-requests/sent'),
                api.get('/users'),
                api.get('/balances')
            ]);

            setDebts(debtsRes.data.filter((t: any) => t.type === 'debt'));
            setReceivedRequests(receivedRes.data);
            setSentRequests(sentRes.data);
            setUsers(usersRes.data);
            setBalances(balancesRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/borrow-request', {
                lenderId: formData.lenderId,
                description: formData.description,
                amount: parseFloat(formData.amount)
            });

            setFormData({ amount: '', lenderId: '', description: '' });
            setShowForm(false);
            fetchData();
            alert('ส่งคำขอยืมเงินเรียบร้อยแล้ว!');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'ส่งคำขอไม่สำเร็จ');
        }
    };

    const handleApprove = async (requestId: string) => {
        if (!confirm('อนุมัติคำขอยืมเงินนี้หรือไม่?')) return;

        try {
            await api.put(`/borrow-request/${requestId}/approve`);
            fetchData();
            alert('อนุมัติคำขอเรียบร้อย!');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'อนุมัติไม่สำเร็จ');
        }
    };

    const handleReject = async () => {
        if (!selectedRequestId) return;

        try {
            await api.put(`/borrow-request/${selectedRequestId}/reject`, {
                reason: rejectionReason
            });
            setShowRejectModal(false);
            setSelectedRequestId(null);
            setRejectionReason('');
            fetchData();
            alert('ปฏิเสธคำขอเรียบร้อย');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'ปฏิเสธไม่สำเร็จ');
        }
    };

    const handleSubmitPayment = async () => {
        if (!selectedDebt || !paymentAmount) return;

        const amount = parseFloat(paymentAmount);
        const remainingDebt = selectedDebt.amount - (selectedDebt.paidAmount || 0);

        // Client-side validation
        if (isNaN(amount) || amount <= 0) {
            alert('กรุณาระบุจำนวนเงินที่ถูกต้องและมากกว่า 0');
            return;
        }

        if (amount > remainingDebt) {
            alert(`ยอดชำระ (฿${amount.toLocaleString()}) ต้องไม่เกินยอดหนี้คงเหลือ ฿${remainingDebt.toLocaleString()}`);
            return;
        }

        try {
            await api.post(`/debt/${selectedDebt._id}/submit-payment`, {
                amount: amount
            });

            setShowPaymentModal(false);
            setPaymentAmount('');
            setSelectedDebt(null);
            fetchData();
            alert('ส่งยอดชำระให้ผู้ให้ยืมตรวจสอบแล้ว!');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'ส่งยอดชำระไม่สำเร็จ');
        }
    };

    const handleApprovePayment = async (debtId: string) => {
        if (!confirm('อนุมัติยอดชำระนี้หรือไม่?')) return;

        try {
            await api.put(`/debt/${debtId}/approve-payment`);
            fetchData();
            alert('อนุมัติยอดชำระเรียบร้อย!');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'อนุมัติยอดชำระไม่สำเร็จ');
        }
    };

    const handleRejectPayment = async (debtId: string) => {
        if (!confirm('ปฏิเสธยอดชำระนี้หรือไม่?')) return;

        try {
            await api.put(`/debt/${debtId}/reject-payment`, { reason: 'Payment rejected' });
            fetchData();
            alert('ปฏิเสธยอดชำระเรียบร้อย');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'ปฏิเสธยอดชำระไม่สำเร็จ');
        }
    };

    const openRejectModal = (requestId: string) => {
        setSelectedRequestId(requestId);
        setShowRejectModal(true);
    };

    const getStatusBadge = (status: string) => {
        const badges: any = {
            pending: <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold flex items-center gap-1"><Clock className="w-3 h-3" />รออนุมัติ</span>,
            approved: <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" />อนุมัติแล้ว</span>,
            rejected: <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" />ปฏิเสธแล้ว</span>
        };
        return badges[status] || null;
    };

    if (authLoading || loadingData) return <div className="p-8 text-center text-gray-600">กำลังโหลด...</div>;

    return (
        <div className="space-y-8">
            {/* Member balances snapshot */}
            {balances && (
                <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-blue-100">
                    <h2 className="text-lg md:text-xl font-bold text-brown-600 mb-4 md:mb-6 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        ยอดเงินสมาชิก
                    </h2>
                    <div className="space-y-3">
                        {balances.balances.map((m) => (
                            <div key={m._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 bg-gray-50 rounded-xl border border-blue-100 hover:shadow-md transition-all gap-3 sm:gap-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-brown-400 via-brown-500 to-brown-600 flex items-center justify-center text-white font-bold text-base md:text-lg shadow-sm">
                                        {m.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm md:text-base">
                                            {m.name}
                                            {m.isCurrentUser && (
                                                <span className="ml-2 text-[10px] md:text-xs bg-blue-100 text-brown-600 px-2 py-0.5 rounded-full font-medium">
                                                    คุณ
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-3 pl-12 sm:pl-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg md:text-xl font-bold text-brown-600">฿{(m.balance || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">คำขอยืมเงินและหนี้สิน</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-brown-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brown-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    สร้างคำขอใหม่
                </button>
            </header>

            {/* Create Borrow Request Form */}
            {showForm && (
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">สร้างคำขอยืมเงิน</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ผู้ยืม</label>
                            <input
                                type="text"
                                value={`คุณ (${user?.name || 'User'})`}
                                className="border border-gray-300 p-3 rounded-lg w-full bg-gray-50 text-gray-900 font-semibold"
                                disabled
                            />
                            <p className="text-xs text-gray-600 mt-1">คุณกำลังขอยืมเงิน</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ผู้ให้ยืม (ยืมจาก)</label>
                            <select
                                value={formData.lenderId}
                                onChange={(e) => setFormData({ ...formData, lenderId: e.target.value })}
                                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-brown-500 text-black"
                                required
                            >
                                <option value="">เลือกคนที่จะยืม</option>
                                {users.filter((u: any) => u._id !== user?.id).map((u: any) => (
                                    <option key={u._id} value={u._id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="เช่น ค่าล้างรถ"
                                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-brown-500 text-black"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน (฿)</label>
                            <input
                                type="number"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0.00"
                                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-brown-500 text-black"
                                required
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button type="submit" className="bg-brown-600 text-white px-6 py-2 rounded-lg hover:bg-brown-700 transition-colors flex-1">
                                ส่งคำขอ
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors">
                                ยกเลิก
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Requests I Received (as Lender) */}
            {receivedRequests.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-6 h-6" />
                        คำขอที่ได้รับ ({receivedRequests.length})
                    </h2>
                    <div className="space-y-4">
                        {receivedRequests.map((req: any) => (
                            <div key={req._id} className="p-4 bg-gray-50 rounded-xl border border-gray-300">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-gray-900">จาก: {req.borrower?.name}</p>
                                        <p className="text-gray-700">{req.description}</p>
                                        <p className="text-2xl font-bold text-gray-600 mt-2">฿{req.amount.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500 mt-1">วันที่ขอ: {new Date(req.requestedAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        {getStatusBadge(req.status)}
                                        {req.status === 'pending' && (
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => handleApprove(req._id)}
                                                    className="bg-brown-600 text-white px-4 py-2 rounded-lg hover:bg-brown-700 transition-colors flex items-center gap-1"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    อนุมัติ
                                                </button>
                                                <button
                                                    onClick={() => openRejectModal(req._id)}
                                                    className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors flex items-center gap-1"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    ปฏิเสธ
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Requests I Sent (as Borrower) */}
            {sentRequests.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">คำขอที่ส่งไป ({sentRequests.length})</h2>
                    <div className="space-y-4">
                        {sentRequests.map((req: any) => (
                            <div key={req._id} className="p-4 bg-gray-50 rounded-xl border border-gray-300">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-gray-900">ถึง: {req.payer?.name}</p>
                                        <p className="text-gray-700">{req.description}</p>
                                        <p className="text-2xl font-bold text-gray-600 mt-2">฿{req.amount.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500 mt-1">วันที่ขอ: {new Date(req.requestedAt).toLocaleDateString()}</p>
                                        {req.rejectionReason && (
                                            <p className="text-sm text-red-600 mt-2 italic">เหตุผล: {req.rejectionReason}</p>
                                        )}
                                    </div>
                                    <div>{getStatusBadge(req.status)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Debts */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200">
                <h2 className="text-xl font-bold text-gray-700 mb-4">หนี้สินที่ค้างอยู่ ({debts.length})</h2>
                {debts.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">ไม่มีหนี้สินค้างชำระ</p>
                ) : (
                    <div className="space-y-4">
                        {debts.map((debt: any) => {
                            const remainingDebt = debt.amount - (debt.paidAmount || 0);
                            const progressPercent = ((debt.paidAmount || 0) / debt.amount) * 100;
                            const isBorrower = debt.borrower?._id === user?.id;
                            const isLender = debt.payer?._id === user?.id;
                            const isPaid = debt.paymentStatus === 'paid';

                            return (
                                <div key={debt._id} className={`p-4 rounded-xl border ${isPaid ? 'bg-gray-50 border-gray-200' : 'bg-gray-50 border-gray-300'}`}>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900">
                                                    {debt.borrower?.name} ติดหนี้ {debt.payer?.name}
                                                </p>
                                                <p className="text-gray-700">{debt.description}</p>
                                            </div>
                                            {isPaid ? (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    ชำระหนี้แล้ว
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                                                    หนี้สินค้างชำระ
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500">ยอดเงินต้น</p>
                                                <p className="text-xl font-bold text-gray-900">฿{debt.amount.toLocaleString()}</p>
                                            </div>
                                            {!isPaid && (
                                                <div>
                                                    <p className="text-gray-500">คงเหลือ</p>
                                                    <p className="text-xl font-bold text-gray-600">฿{remainingDebt.toLocaleString()}</p>
                                                </div>
                                            )}
                                            {debt.paidAmount > 0 && (
                                                <div>
                                                    <p className="text-gray-500">จ่ายแล้ว</p>
                                                    <p className="text-lg font-semibold text-gray-600">฿{debt.paidAmount.toLocaleString()}</p>
                                                </div>
                                            )}
                                        </div>

                                        {!isPaid && (
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                    <span>ความคืบหน้าการชำระ</span>
                                                    <span className="font-semibold">{Math.round(progressPercent)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 transition-all duration-300"
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {debt.pendingPayment > 0 && (
                                            <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                                                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    รอการตรวจสอบยอดเงิน: ฿{debt.pendingPayment.toLocaleString()}
                                                </p>
                                                {isBorrower && (
                                                    <p className="text-xs text-gray-600 mt-1">รอผู้ให้ยืมอนุมัติ...</p>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-2">
                                            {isBorrower && !isPaid && debt.pendingPayment === 0 && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedDebt(debt);
                                                        setPaymentAmount('');
                                                        setShowPaymentModal(true);
                                                    }}
                                                    className="bg-brown-600 text-white px-4 py-2 rounded-lg hover:bg-brown-700 transition-colors flex items-center gap-2"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    ชำระหนี้
                                                </button>
                                            )}

                                            {isLender && debt.pendingPayment > 0 && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprovePayment(debt._id)}
                                                        className="bg-brown-600 text-white px-4 py-2 rounded-lg hover:bg-brown-700 transition-colors flex items-center gap-2"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        อนุมัติการชำระ
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectPayment(debt._id)}
                                                        className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors flex items-center gap-2"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                        ปฏิเสธ
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        <p className="text-xs text-gray-400 mt-2">วันที่สร้าง: {new Date(debt.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedDebt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowPaymentModal(false)}>
                    <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-700 mb-4">ชำระหนี้</h3>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-600">หนี้สินต่อ: {selectedDebt.payer?.name}</p>
                                <p className="text-lg font-semibold text-gray-900">{selectedDebt.description}</p>
                                <p className="text-sm text-gray-600 mt-2">
                                    คงเหลือ: <span className="text-xl font-bold text-gray-600">฿{(selectedDebt.amount - (selectedDebt.paidAmount || 0)).toLocaleString()}</span>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">จำนวนเงินที่ชำระ (฿)</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="ระบุจำนวนเงิน"
                                    className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-brown-500 text-black"
                                    max={selectedDebt.amount - (selectedDebt.paidAmount || 0)}
                                    min="0"
                                    step="0.01"
                                    autoFocus
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    สูงสุด: ฿{(selectedDebt.amount - (selectedDebt.paidAmount || 0)).toLocaleString()}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleSubmitPayment}
                                    className="bg-brown-600 text-white px-6 py-2 rounded-lg hover:bg-brown-700 transition-colors flex-1"
                                    disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                                >
                                    ยืนยันการชำระ
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPaymentModal(false);
                                        setPaymentAmount('');
                                        setSelectedDebt(null);
                                    }}
                                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowRejectModal(false)}>
                    <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-700 mb-4">ปฏิเสธคำขอยืมเงิน</h3>
                        <label className="block text-sm font-medium text-gray-700 mb-2">เหตุผลการปฏิเสธ (ไม่ระบุได้)</label>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="border border-gray-300 p-3 rounded-lg w-full h-24 focus:ring-2 focus:ring-brown-500"
                            placeholder="เช่น เงินไม่พอ..."
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={handleReject}
                                className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition-colors flex-1"
                            >
                                ยืนยันการปฏิเสธ
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectionReason('');
                                }}
                                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
