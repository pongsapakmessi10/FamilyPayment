import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Plus, ArrowLeft, CheckCircle, AlertCircle, X } from 'lucide-react-native';

interface EventBudget {
    _id: string;
    name: string;
    description?: string;
    budget: number;
    spent: number;
    remaining: number;
    progress: number;
    createdAt?: string;
    createdBy?: { name: string };
}

interface EventExpense {
    _id: string;
    description: string;
    amount: number;
    date: string;
    payer?: { _id: string; name: string };
}

interface User {
    _id: string;
    name: string;
}

export default function EventsScreen() {
    const { user } = useAuth();

    // Data State
    const [events, setEvents] = useState<EventBudget[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<EventBudget | null>(null);
    const [expenses, setExpenses] = useState<EventExpense[]>([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [loadingExpenses, setLoadingExpenses] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Modals
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [expenseModalVisible, setExpenseModalVisible] = useState(false);

    // Custom Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ type: 'success', title: '', message: '' });

    // Forms
    const [eventName, setEventName] = useState('');
    const [eventBudget, setEventBudget] = useState('');
    const [eventDesc, setEventDesc] = useState('');

    const [expDesc, setExpDesc] = useState('');
    const [expAmount, setExpAmount] = useState('');
    const [expPayer, setExpPayer] = useState('');

    useEffect(() => {
        fetchEvents();
        fetchUsers();
    }, []);

    const showNotification = (type: 'success' | 'error', title: string, message: string) => {
        setAlertConfig({ type, title, message });
        setAlertVisible(true);
        // Auto hide success alerts after 2 seconds
        if (type === 'success') {
            setTimeout(() => setAlertVisible(false), 2000);
        }
    };

    const fetchEvents = async () => {
        try {
            const res = await api.get('/event-budgets');
            setEvents(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
            if (res.data.length > 0) {
                setExpPayer(res.data[0]._id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchExpenses = async (eventId: string) => {
        setLoadingExpenses(true);
        try {
            const res = await api.get(`/event-budgets/${eventId}/expenses`);
            setExpenses(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingExpenses(false);
        }
    };

    const handleCreateEvent = async () => {
        if (!eventName || !eventBudget) {
            showNotification('error', 'ข้อมูลไม่ครบ', 'กรุณาระบุชื่อทริปและงบประมาณ');
            return;
        }

        try {
            await api.post('/event-budgets', {
                name: eventName,
                budget: parseFloat(eventBudget),
                description: eventDesc
            });
            setCreateModalVisible(false);
            setEventName('');
            setEventBudget('');
            setEventDesc('');
            fetchEvents();
            showNotification('success', 'สำเร็จ!', 'สร้างกระเป๋าทริปเรียบร้อยแล้ว');
        } catch (err: any) {
            showNotification('error', 'ล้มเหลว', err.response?.data?.message || 'สร้างไม่สำเร็จ');
        }
    };

    const handleAddExpense = async () => {
        if (!selectedEvent) return;
        if (!expDesc || !expAmount) {
            showNotification('error', 'ข้อมูลไม่ครบ', 'กรุณาระบุรายละเอียดและจำนวนเงิน');
            return;
        }

        try {
            const res = await api.post(`/event-budgets/${selectedEvent._id}/expenses`, {
                description: expDesc,
                amount: parseFloat(expAmount),
                payer: expPayer
            });

            // Update local event stats
            const updatedTotals = res.data.totals;
            setSelectedEvent(prev => prev ? {
                ...prev,
                spent: updatedTotals.spent,
                remaining: updatedTotals.remaining,
                progress: updatedTotals.progress
            } : null);

            // Refresh lists
            fetchExpenses(selectedEvent._id);
            fetchEvents(); // Update main list too

            setExpenseModalVisible(false);
            setExpDesc('');
            setExpAmount('');
            showNotification('success', 'บันทึกแล้ว!', 'เพิ่มรายการใช้จ่ายเรียบร้อย');
        } catch (err: any) {
            showNotification('error', 'ข้อผิดพลาด', err.response?.data?.message || 'บันทึกไม่สำเร็จ');
        }
    };

    const openEventDetails = (event: EventBudget) => {
        setSelectedEvent(event);
        fetchExpenses(event._id);
    };

    const closeEventDetails = () => {
        setSelectedEvent(null);
        setExpenses([]);
    };

    const renderEventCard = ({ item }: { item: EventBudget }) => (
        <TouchableOpacity style={styles.card} onPress={() => openEventDetails(item)}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
                </View>
                <View style={styles.budgetBadge}>
                    <Text style={styles.budgetText}>฿{item.budget.toLocaleString()}</Text>
                </View>
            </View>

            <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${item.progress || 0}%` }]} />
                </View>
                <View style={styles.progressLabels}>
                    <Text style={styles.progressText}>ใช้ไป: ฿{item.spent.toLocaleString()}</Text>
                    <Text style={[styles.progressText, { color: item.remaining < 0 ? 'red' : '#10b981' }]}>
                        เหลือ: ฿{item.remaining.toLocaleString()}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderExpenseItem = ({ item }: { item: EventExpense }) => (
        <View style={styles.expenseCard}>
            <View style={styles.expenseRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.expenseDesc}>{item.description}</Text>
                    <Text style={styles.expenseMeta}>
                        จ่ายโดย {item.payer?.name || 'ไม่ระบุ'} • {new Date(item.date).toLocaleDateString('th-TH')}
                    </Text>
                </View>
                <Text style={styles.expenseAmount}>฿{item.amount.toLocaleString()}</Text>
            </View>
        </View>
    );

    // Main Render
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {selectedEvent ? (
                    <TouchableOpacity onPress={closeEventDetails} style={styles.backBtn}>
                        <ArrowLeft color="#333" size={24} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 24 }} />
                )}
                <Text style={styles.headerTitle}>{selectedEvent ? selectedEvent.name : 'โหมดทริป'}</Text>
                {!selectedEvent ? (
                    <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
                        <Plus color="#4f46e5" size={24} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 24 }} />
                )}
            </View>

            {loading ? (
                <ActivityIndicator style={styles.center} />
            ) : selectedEvent ? (
                // DETAIL VIEW
                <View style={{ flex: 1 }}>
                    {/* Summary Banner */}
                    <View style={styles.summaryBanner}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>งบประมาณ</Text>
                            <Text style={styles.summaryValue}>฿{selectedEvent.budget.toLocaleString()}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>คงเหลือ</Text>
                            <Text style={[styles.summaryValue, { color: selectedEvent.remaining < 0 ? 'red' : '#10b981' }]}>
                                ฿{selectedEvent.remaining.toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    <FlatList
                        data={expenses}
                        renderItem={renderExpenseItem}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.list}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchExpenses(selectedEvent._id)} />}
                        ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีรายการรายจ่าย</Text>}
                    />

                    <TouchableOpacity style={styles.fab} onPress={() => setExpenseModalVisible(true)}>
                        <Plus color="white" size={24} />
                        <Text style={styles.fabText}>เพิ่มรายการจ่าย</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                // LIST VIEW
                <FlatList
                    data={events}
                    renderItem={renderEventCard}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchEvents} />}
                    ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีกระเป๋าตังค์ทริป</Text>}
                />
            )}

            {/* Create Event Modal */}
            <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => setCreateModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>สร้างกระเป๋าทริปใหม่</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}><ArrowLeft size={24} /></TouchableOpacity>
                        </View>
                        <View style={styles.form}>
                            <TextInput style={styles.input} placeholder="ชื่อทริป (เช่น ทริปญี่ปุ่น 2024)" placeholderTextColor="#B2BEB5" value={eventName} onChangeText={setEventName} />
                            <TextInput style={styles.input} placeholder="งบประมาณทั้งหมด (บาท)" placeholderTextColor="#B2BEB5" keyboardType="numeric" value={eventBudget} onChangeText={setEventBudget} />
                            <TextInput style={styles.input} placeholder="รายละเอียดเพิ่มเติม (ระบุหรือไม่ก็ได้)" placeholderTextColor="#B2BEB5" value={eventDesc} onChangeText={setEventDesc} />
                            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateEvent}>
                                <Text style={styles.btnText}>สร้างกระเป๋า</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Expense Modal */}
            <Modal visible={expenseModalVisible} animationType="slide" transparent onRequestClose={() => setExpenseModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>เพิ่มรายการจ่าย</Text>
                            <TouchableOpacity onPress={() => setExpenseModalVisible(false)}><ArrowLeft size={24} /></TouchableOpacity>
                        </View>
                        <View style={styles.form}>
                            <TextInput style={styles.input} placeholder="รายละเอียด (เช่น ค่าอาหาร, ค่ารถ)" placeholderTextColor="#B2BEB5" value={expDesc} onChangeText={setExpDesc} />
                            <TextInput style={styles.input} placeholder="จำนวนเงิน (บาท)" placeholderTextColor="#B2BEB5" keyboardType="numeric" value={expAmount} onChangeText={setExpAmount} />

                            <Text style={styles.label}>คนจ่าย:</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.userScroll}>
                                {users.map(u => (
                                    <TouchableOpacity
                                        key={u._id}
                                        style={[styles.userChip, expPayer === u._id && styles.userChipSelected]}
                                        onPress={() => setExpPayer(u._id)}
                                    >
                                        <Text style={[styles.userChipText, expPayer === u._id && styles.textWhite]}>{u.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity style={styles.submitBtn} onPress={handleAddExpense}>
                                <Text style={styles.btnText}>บันทึกรายการ</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Custom Notification Modal */}
            <Modal visible={alertVisible} transparent animationType="fade" onRequestClose={() => setAlertVisible(false)}>
                <View style={styles.alertOverlay}>
                    <View style={styles.alertContent}>
                        <View style={[styles.alertIcon, alertConfig.type === 'success' ? styles.bgSuccess : styles.bgError]}>
                            {alertConfig.type === 'success' ? <CheckCircle color="white" size={32} /> : <AlertCircle color="white" size={32} />}
                        </View>
                        <Text style={styles.alertTitle}>{alertConfig.title}</Text>
                        <Text style={styles.alertMessage}>{alertConfig.message}</Text>

                        {alertConfig.type === 'error' && (
                            <TouchableOpacity style={styles.alertBtn} onPress={() => setAlertVisible(false)}>
                                <Text style={styles.alertBtnText}>ปิด</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f6f7f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    backBtn: { padding: 4 },
    list: { padding: 16, paddingBottom: 100 },
    empty: { textAlign: 'center', color: '#999', marginTop: 50 },

    // Cards
    card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    cardDesc: { color: '#666', fontSize: 12 },
    budgetBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    budgetText: { color: '#4f46e5', fontWeight: 'bold', fontSize: 12 },

    progressContainer: { marginTop: 8 },
    progressBarBg: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#4f46e5' },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    progressText: { fontSize: 12, color: '#666' },

    // Details View
    summaryBanner: { flexDirection: 'row', backgroundColor: 'white', margin: 16, padding: 16, borderRadius: 12, elevation: 2 },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryLabel: { fontSize: 12, color: '#666', textTransform: 'uppercase' },
    summaryValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    divider: { width: 1, backgroundColor: '#eee' },

    expenseCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
    expenseRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    expenseDesc: { fontSize: 16, fontWeight: '600', color: '#333' },
    expenseMeta: { fontSize: 12, color: '#999', marginTop: 2 },
    expenseAmount: { fontSize: 16, fontWeight: 'bold', color: '#ef4444' },

    fab: {
        position: 'absolute', bottom: 24, right: 24,
        backgroundColor: '#4f46e5', flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, elevation: 4
    },
    fabText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 16, overflow: 'hidden' },
    modalHeader: { padding: 16, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    form: { padding: 20 },
    input: { backgroundColor: '#f6f7f9', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 16 },
    label: { fontWeight: '600', marginBottom: 8, color: '#444' },
    submitBtn: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    userScroll: { flexDirection: 'row', marginBottom: 20, height: 50 },
    userChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f3f4f6', borderRadius: 20, marginRight: 8, justifyContent: 'center' },
    userChipSelected: { backgroundColor: '#4f46e5' },
    userChipText: { color: '#333', fontWeight: '500' },
    textWhite: { color: 'white' },

    // Custom Alert
    alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 40 },
    alertContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, alignItems: 'center', width: '100%', maxWidth: 320, elevation: 5 },
    alertIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    bgSuccess: { backgroundColor: '#10b981' },
    bgError: { backgroundColor: '#ef4444' },
    alertTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: '#333' },
    alertMessage: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    alertBtn: { backgroundColor: '#f3f4f6', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 30 },
    alertBtnText: { color: '#444', fontWeight: 'bold' }
});
