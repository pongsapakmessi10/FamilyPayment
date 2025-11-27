'use client';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface Transaction {
    _id: string;
    description: string;
    amount: number;
    date: string;
    category?: string;
    type: string;
    payer?: { name: string };
}

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    title: string;
}

export default function TransactionModal({ isOpen, onClose, transactions, title }: TransactionModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{title}</h2>
                        <p className="text-blue-50 mt-1">{transactions.length} รายการ</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Transactions List */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
                    {transactions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            ไม่พบรายการในช่วงเวลานี้
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((transaction) => (
                                <div
                                    key={transaction._id}
                                    className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{transaction.description}</h3>
                                            <div className="flex gap-4 mt-2 text-sm text-blue-600">
                                                <span>{new Date(transaction.date).toLocaleDateString()}</span>
                                                <span className="px-2 py-0.5 bg-blue-100 rounded text-blue-700 capitalize">
                                                    {transaction.category || transaction.type}
                                                </span>
                                                {transaction.payer && (
                                                    <span>โดย: {transaction.payer.name}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-blue-700">
                                                ฿{transaction.amount.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer with Total */}
                <div className="bg-gray-50 p-6 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-blue-700">รวม</span>
                        <span className="text-2xl font-bold text-gray-900">
                            ฿{total.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
