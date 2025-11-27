'use client';
import { useState } from 'react';
import { User, Edit2, Check, X } from 'lucide-react';
import api from '@/lib/api';

interface Balance {
    _id: string;
    name: string;
    balance: number;
    email?: string;
    isCurrentUser?: boolean;
}

interface MemberBalancesProps {
    balances: Balance[];
    onBalanceUpdate: () => void;
}

export default function MemberBalances({ balances, onBalanceUpdate }: MemberBalancesProps) {
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [updating, setUpdating] = useState(false);

    const handleEditClick = (userId: string, currentBalance: number) => {
        setEditingUserId(userId);
        setEditValue(currentBalance.toString());
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
        setEditValue('');
    };

    const handleSaveBalance = async () => {
        const newBalance = parseFloat(editValue);

        if (isNaN(newBalance) || newBalance < 0) {
            alert('กรุณาระบุจำนวนเงินที่ถูกต้อง');
            return;
        }

        setUpdating(true);
        try {
            await api.put('/balance', { balance: newBalance });
            onBalanceUpdate(); // Refresh data
            setEditingUserId(null);
            setEditValue('');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'ไม่สามารถอัปเดตยอดเงินได้');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-blue-100">
            <h2 className="text-lg md:text-xl font-bold text-brown-600 mb-4 md:mb-6 flex items-center gap-2">
                <User className="w-5 h-5 md:w-6 md:h-6" />
                ยอดเงินสมาชิก
            </h2>

            <div className="space-y-3">
                {balances.map((member) => (
                    <div
                        key={member._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 bg-gray-50 rounded-xl border border-blue-100 hover:shadow-md transition-all gap-3 sm:gap-0"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-brown-400 via-brown-500 to-brown-600 flex items-center justify-center text-white font-bold text-base md:text-lg shadow-sm">
                                {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm md:text-base">
                                    {member.name}
                                    {member.isCurrentUser && (
                                        <span className="ml-2 text-[10px] md:text-xs bg-blue-100 text-brown-600 px-2 py-0.5 rounded-full font-medium">
                                            คุณ
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pl-12 sm:pl-0">
                            {editingUserId === member._id ? (
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-semibold focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="จำนวนเงิน"
                                        min="0"
                                        step="0.01"
                                        disabled={updating}
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleSaveBalance}
                                        disabled={updating}
                                        className="p-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors disabled:opacity-50 shrink-0 shadow-sm"
                                        title="บันทึก"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={updating}
                                        className="p-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50 shrink-0 shadow-sm"
                                        title="ยกเลิก"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-lg md:text-xl font-bold text-brown-600">
                                        ฿{member.balance.toLocaleString()}
                                    </span>
                                    {member.isCurrentUser && (
                                        <button
                                            onClick={() => handleEditClick(member._id, member.balance)}
                                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
                                            title="แก้ไขยอดเงิน"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
