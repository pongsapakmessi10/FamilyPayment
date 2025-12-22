import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Plus, CheckCircle, Calendar as CalendarIcon, X } from 'lucide-react-native';

interface Bill {
    _id: string;
    title: string;
    amount?: number;
    category?: string;
    dueDate: string;
    status: 'active' | 'paid' | 'overdue';
    isRecurring: boolean;
    frequency: string;
    createdBy?: { _id: string; name: string };
}

export default function BillsScreen() {
    const { user } = useAuth();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState('monthly');

    useEffect(() => {
        fetchBills();
    }, []);

    const fetchBills = async () => {
        try {
            const res = await api.get('/bills');
            setBills(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBill = async () => {
        if (!title || !dueDate) {
            Alert.alert('Error', 'Please fill in title and due date');
            return;
        }

        try {
            await api.post('/bills', {
                title,
                amount: amount ? parseFloat(amount) : undefined,
                category,
                dueDate: new Date(dueDate).toISOString(),
                isRecurring,
                frequency: isRecurring ? frequency : 'none'
            });
            setModalVisible(false);
            resetForm();
            fetchBills();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to create bill');
        }
    };

    const handlePayBill = async (bill: Bill) => {
        if (bill.createdBy?._id !== user?.id) {
            Alert.alert('Info', `This bill was created by ${bill.createdBy?.name || 'someone else'}`);
            return;
        }

        Alert.alert(
            'Pay Bill',
            `Mark ${bill.title} as paid? This will create an expense record.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            await api.put(`/bills/${bill._id}/pay`);
                            fetchBills();
                        } catch (err: any) {
                            Alert.alert('Error', 'Failed to pay bill');
                        }
                    }
                }
            ]
        );
    };

    const resetForm = () => {
        setTitle('');
        setAmount('');
        setCategory('');
        setDueDate(new Date().toISOString().split('T')[0]);
        setIsRecurring(false);
    };

    const renderItem = ({ item }: { item: Bill }) => {
        const isOverdue = item.status === 'overdue';
        const isPaid = item.status === 'paid';
        const date = new Date(item.dueDate).toLocaleDateString();

        return (
            <TouchableOpacity
                style={[styles.card, isPaid && styles.cardPaid, isOverdue && styles.cardOverdue]}
                onPress={() => item.status !== 'paid' && handlePayBill(item)}
            >
                <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, isPaid && styles.textPaid]}>{item.title}</Text>
                    {item.amount && <Text style={[styles.amount, isPaid && styles.textPaid]}>฿{item.amount.toLocaleString()}</Text>}
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.dateContainer}>
                        <CalendarIcon size={14} color={isPaid ? '#999' : '#666'} />
                        <Text style={[styles.dateText, isPaid && styles.textPaid]}>{date}</Text>
                    </View>
                    <View style={[styles.badge, isPaid ? styles.badgePaid : isOverdue ? styles.badgeOverdue : styles.badgeActive]}>
                        <Text style={[styles.badgeText, isPaid ? styles.badgeTextPaid : isOverdue ? styles.badgeTextOverdue : styles.badgeTextActive]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Bills & Reminders</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                    <Plus color="white" size={24} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator style={styles.center} />
            ) : (
                <FlatList
                    data={bills}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>No bills found</Text>}
                />
            )}

            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>New Bill</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <X size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Title</Text>
                            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Electricity Bill" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Amount (Optional)</Text>
                            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                            <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="2024-01-01" />
                        </View>

                        <View style={styles.row}>
                            <Text style={styles.label}>Recurring?</Text>
                            <Switch value={isRecurring} onValueChange={setIsRecurring} />
                        </View>

                        {isRecurring && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Frequency</Text>
                                <View style={styles.freqRow}>
                                    {['monthly', 'weekly', 'yearly'].map(f => (
                                        <TouchableOpacity
                                            key={f}
                                            style={[styles.freqChip, frequency === f && styles.freqChipSelected]}
                                            onPress={() => setFrequency(f)}
                                        >
                                            <Text style={[styles.freqText, frequency === f && styles.freqTextSelected]}>{f}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        <TouchableOpacity style={styles.submitBtn} onPress={handleCreateBill}>
                            <Text style={styles.submitBtnText}>Create Bill</Text>
                        </TouchableOpacity>
                    </ScrollView>
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
    empty: { textAlign: 'center', marginTop: 40, color: '#999' },
    card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
    cardPaid: { backgroundColor: '#f3f4f6', elevation: 0 },
    cardOverdue: { borderLeftWidth: 4, borderLeftColor: '#ef4444' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
    amount: { fontSize: 16, fontWeight: 'bold', color: '#4f46e5' },
    textPaid: { color: '#999', textDecorationLine: 'line-through' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateText: { color: '#666', fontSize: 12 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeActive: { backgroundColor: '#fff7ed' },
    badgePaid: { backgroundColor: '#ecfdf5' },
    badgeOverdue: { backgroundColor: '#fef2f2' },
    badgeText: { fontSize: 10, fontWeight: '600' },
    badgeTextActive: { color: '#c2410c' },
    badgeTextPaid: { color: '#059669' },
    badgeTextOverdue: { color: '#dc2626' },

    // Modal styles
    modalContainer: { flex: 1, backgroundColor: '#f6f7f9' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'white' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    form: { padding: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#444' },
    input: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    freqRow: { flexDirection: 'row', gap: 10 },
    freqChip: { padding: 8, borderRadius: 6, backgroundColor: '#e5e7eb' },
    freqChipSelected: { backgroundColor: '#4f46e5' },
    freqText: { color: '#4b5563' },
    freqTextSelected: { color: 'white', fontWeight: 'bold' },
    submitBtn: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
