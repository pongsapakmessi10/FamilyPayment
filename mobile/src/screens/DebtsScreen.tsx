import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { CircleDollarSign, Check, X, Plus, Clock, AlertCircle } from 'lucide-react-native';

interface Debt {
    _id: string;
    description: string;
    amount: number;
    paidAmount: number;
    payer: { _id: string; name: string };
    borrower: { _id: string; name: string };
    date: string;
    paymentStatus: 'pending' | 'paid' | 'partial';
    pendingPayment: number;
}

interface Request {
    _id: string;
    description: string;
    amount: number;
    borrower?: { _id: string; name: string };
    lender?: { _id: string; name: string };
    payer?: { _id: string; name: string }; // For sent requests mapping (consistent with web)
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    rejectionReason?: string;
}

export default function DebtsScreen() {
    const { user } = useAuth();
    const [debts, setDebts] = useState<Debt[]>([]);
    const [receivedRequests, setReceivedRequests] = useState<Request[]>([]);
    const [sentRequests, setSentRequests] = useState<Request[]>([]);
    const [balances, setBalances] = useState<any[]>([]); // List of family members
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [lenderId, setLenderId] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    // Payment Modal State
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [debtsRes, receivedRes, sentRes, balancesRes] = await Promise.all([
                api.get('/transactions', { params: { type: 'debt' } }),
                api.get('/borrow-requests/received'),
                api.get('/borrow-requests/sent'),
                api.get('/balances')
            ]);
            setDebts(debtsRes.data);
            setReceivedRequests(receivedRes.data);
            setSentRequests(sentRes.data);
            if (balancesRes.data?.balances) {
                setBalances(balancesRes.data.balances);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCreateRequest = async () => {
        if (!amount || !description || !lenderId) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            Alert.alert('Error', 'Invalid amount');
            return;
        }

        const lender = balances.find(b => b._id === lenderId);
        if (lender && amountNum > (lender.balance || 0)) {
            Alert.alert('Error', `${lender.name} has insufficient balance (฿${lender.balance})`);
            return;
        }

        try {
            await api.post('/borrow-request', {
                lenderId,
                amount: amountNum,
                description
            });
            Alert.alert('Success', 'Borrow request sent');
            setModalVisible(false);
            resetForm();
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to send request');
        }
    };

    const handleApproveRequest = async (id: string) => {
        try {
            await api.put(`/borrow-request/${id}/approve`);
            Alert.alert('Success', 'Request approved');
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to approve');
        }
    };

    const handleRejectRequest = async (id: string) => {
        Alert.alert(
            'Reject Request',
            'Are you sure you want to reject this request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    onPress: async () => {
                        try {
                            await api.put(`/borrow-request/${id}/reject`, { reason: 'No reason provided' });
                            fetchData();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to reject');
                        }
                    }
                }
            ]
        );
    };

    const handleClearDebt = (debt: Debt) => {
        console.log('💰 [Debts] Opening Pay Debt Modal for:', debt._id);
        const remaining = debt.amount - (debt.paidAmount || 0);
        setSelectedDebt(debt);
        setPaymentAmount(remaining.toString());
        setPaymentModalVisible(true);
    };

    const handleSubmitPayment = async () => {
        if (!selectedDebt || !paymentAmount) return;

        const payAmount = parseFloat(paymentAmount);
        const remaining = selectedDebt.amount - (selectedDebt.paidAmount || 0);

        if (isNaN(payAmount) || payAmount <= 0 || payAmount > remaining) {
            Alert.alert('Error', `Invalid amount. Max: ${remaining}`);
            return;
        }

        try {
            await api.post(`/debt/${selectedDebt._id}/submit-payment`, { amount: payAmount });
            Alert.alert('Success', 'Payment submitted for approval');
            setPaymentModalVisible(false);
            setSelectedDebt(null);
            setPaymentAmount('');
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to submit payment');
        }
    };

    const handleApprovePayment = async (debtId: string) => {
        try {
            await api.put(`/debt/${debtId}/approve-payment`);
            Alert.alert('Success', 'Payment approved');
            fetchData();
        } catch (err) {
            Alert.alert('Error', 'Failed to approve payment');
        }
    };

    const resetForm = () => {
        setAmount('');
        setDescription('');
        setLenderId('');
    };

    const renderRequest = (item: Request, type: 'received' | 'sent') => {
        const isReceived = type === 'received';
        const partnerName = isReceived ? item.borrower?.name : item.payer?.name; // 'payer' for sent mapped requests

        return (
            <View key={item._id} style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{isReceived ? `Request from ${partnerName}` : `To ${partnerName}`}</Text>
                    {item.status === 'pending' ? (
                        <View style={styles.badgePending}><Text style={styles.badgeTextPending}>Pending</Text></View>
                    ) : (
                        <View style={item.status === 'approved' ? styles.badgeSuccess : styles.badgeError}>
                            <Text style={styles.badgeTextWhite}>{item.status}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.amount}>฿{item.amount.toLocaleString()}</Text>
                <Text style={styles.description}>{item.description}</Text>

                {isReceived && item.status === 'pending' && (
                    <View style={styles.actions}>
                        <TouchableOpacity onPress={() => handleApproveRequest(item._id)} style={styles.approveBtn}>
                            <Text style={styles.btnText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleRejectRequest(item._id)} style={styles.rejectBtn}>
                            <Text style={styles.btnText}>Reject</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {type === 'sent' && item.rejectionReason && (
                    <Text style={styles.reason}>Reason: {item.rejectionReason}</Text>
                )}
            </View>
        );
    };

    const renderDebt = (item: Debt) => {
        const isBorrower = item.borrower._id === user?.id;
        const isLender = item.payer._id === user?.id;
        const remaining = item.amount - (item.paidAmount || 0);

        if (item.paymentStatus === 'paid') return null;

        return (
            <View key={item._id} style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{isBorrower ? `Owe ${item.payer.name}` : `${item.borrower.name} Owes`}</Text>
                    <Text style={styles.amount}>฿{remaining.toLocaleString()}</Text>
                </View>
                <Text style={styles.description}>{item.description}</Text>

                {/* Progress Bar */}
                <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${Math.min((item.paidAmount / item.amount) * 100, 100)}%` }]} />
                </View>
                <Text style={styles.progressText}>{Math.round((item.paidAmount / item.amount) * 100)}% Paid</Text>

                {item.pendingPayment > 0 && (
                    <View style={styles.pendingBadge}>
                        <Text style={styles.pendingText}>Waiting Approval: ฿{item.pendingPayment.toLocaleString()}</Text>
                        {isLender && (
                            <View style={styles.actions}>
                                <TouchableOpacity onPress={() => handleApprovePayment(item._id)} style={styles.approveBtn}>
                                    <Text style={styles.btnText}>Approve</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {isBorrower && item.pendingPayment === 0 && (
                    <TouchableOpacity onPress={() => handleClearDebt(item)} style={styles.payBtn}>
                        <Text style={styles.btnText}>Pay Debt</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Debts & Requests</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                    <Plus color="white" size={24} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator style={styles.center} />
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
                >
                    {/* Received Requests */}
                    {receivedRequests.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Requests to Review</Text>
                            {receivedRequests.map(req => renderRequest(req, 'received'))}
                        </View>
                    )}

                    {/* Active Debts (Transactions) */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Active Debts</Text>
                        {debts.filter(d => d.paymentStatus !== 'paid').length === 0 ? (
                            <Text style={styles.empty}>No active debts</Text>
                        ) : (
                            debts.map(renderDebt)
                        )}
                    </View>

                    {/* Sent Requests */}
                    {sentRequests.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>My Sent Requests</Text>
                            {sentRequests.map(req => renderRequest(req, 'sent'))}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Create Request Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Borrow Money</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <X size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.form}>
                        <Text style={styles.label}>Borrow From</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lenderScroll}>
                            {balances.filter(b => b._id !== user?.id).map((member) => (
                                <TouchableOpacity
                                    key={member._id}
                                    style={[styles.lenderChip, lenderId === member._id && styles.lenderChipSelected]}
                                    onPress={() => setLenderId(member._id)}
                                >
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{member.name[0]}</Text>
                                    </View>
                                    <View>
                                        <Text style={[styles.lenderName, lenderId === member._id && styles.textWhite]}>{member.name}</Text>
                                        <Text style={[styles.lenderBalance, lenderId === member._id && styles.textWhite]}>฿{member.balance?.toLocaleString()}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Amount (฿)</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            placeholder="0"
                        />

                        <Text style={styles.label}>Reason</Text>
                        <TextInput
                            style={styles.input}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Lunch, Bus fare..."
                        />

                        <TouchableOpacity style={styles.submitBtn} onPress={handleCreateRequest}>
                            <Text style={styles.submitBtnText}>Send Request</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            {/* Pay Debt Modal */}
            <Modal
                visible={paymentModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setPaymentModalVisible(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Pay Debt</Text>
                            <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                                <X size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.form}>
                            <Text style={styles.label}>Amount to pay (Max: ฿{selectedDebt ? (selectedDebt.amount - (selectedDebt.paidAmount || 0)).toLocaleString() : 0})</Text>
                            <TextInput
                                style={styles.input}
                                value={paymentAmount}
                                onChangeText={setPaymentAmount}
                                keyboardType="numeric"
                                placeholder="0"
                                autoFocus
                            />

                            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitPayment}>
                                <Text style={styles.submitBtnText}>Submit Payment</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f6f7f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
    title: { fontSize: 20, fontWeight: 'bold' },
    addBtn: { backgroundColor: '#4f46e5', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#666', marginBottom: 12, marginLeft: 4 },
    empty: { textAlign: 'center', color: '#999', fontStyle: 'italic' },

    card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    cardTitle: { fontWeight: '600', fontSize: 16, color: '#333' },
    amount: { fontWeight: 'bold', fontSize: 18, color: '#111', marginBottom: 4 },
    description: { color: '#666', marginBottom: 12 },
    reason: { color: '#ef4444', fontSize: 12, marginTop: 8, fontStyle: 'italic' },

    actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
    payBtn: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
    approveBtn: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
    rejectBtn: { backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
    btnText: { color: 'white', fontWeight: 'bold' },

    badgePending: { backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeSuccess: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeError: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeTextPending: { color: '#c2410c', fontSize: 12, fontWeight: '600' },
    badgeTextWhite: { color: '#333', fontSize: 12, fontWeight: '600' },

    pendingBadge: { backgroundColor: '#fff7ed', padding: 12, borderRadius: 8, marginTop: 8 },
    pendingText: { color: '#c2410c', fontWeight: '500' },

    progressBg: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
    progressFill: { height: '100%', backgroundColor: '#4f46e5' },
    progressText: { fontSize: 12, color: '#666', textAlign: 'right' },

    // Modal
    modalContainer: { flex: 1, backgroundColor: '#f6f7f9' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'white' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    form: { padding: 20 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#444' },
    input: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 20, fontSize: 16 },
    submitBtn: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    lenderScroll: { flexDirection: 'row', marginBottom: 20 },
    lenderChip: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'white', borderRadius: 12, marginRight: 12, borderWidth: 1, borderColor: 'transparent', minWidth: 140 },
    lenderChipSelected: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText: { fontSize: 16, fontWeight: 'bold', color: '#4f46e5' },
    lenderName: { fontWeight: '600', color: '#333' },
    lenderBalance: { fontSize: 12, color: '#666' },
    textWhite: { color: 'white' },

    // Payment Modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#f6f7f9', borderRadius: 16, padding: 0, overflow: 'hidden' },
});
