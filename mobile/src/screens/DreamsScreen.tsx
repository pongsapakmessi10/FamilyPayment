import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Target, X, Trophy } from 'lucide-react-native';

interface Dream {
    _id: string;
    title: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    description?: string;
    status: 'active' | 'completed' | 'cancelled';
}

export default function DreamsScreen() {
    const { user } = useAuth();
    const [dreams, setDreams] = useState<Dream[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [currentAmount, setCurrentAmount] = useState('0');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState('');

    useEffect(() => {
        fetchDreams();
    }, []);

    const fetchDreams = async () => {
        try {
            const res = await api.get('/goals');
            setDreams(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDream = async () => {
        if (!title.trim() || !targetAmount.trim()) {
            Alert.alert('Error', 'Please fill in title and target amount');
            return;
        }

        const target = parseFloat(targetAmount);
        const current = parseFloat(currentAmount) || 0;

        if (isNaN(target) || target <= 0) {
            Alert.alert('Error', 'Please enter a valid target amount');
            return;
        }

        try {
            await api.post('/goals', {
                title: title.trim(),
                targetAmount: target,
                currentAmount: current,
                description: description.trim(),
                deadline: deadline ? new Date(deadline).toISOString() : undefined
            });
            setModalVisible(false);
            resetForm();
            fetchDreams();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to create dream');
        }
    };

    const handleUpdateProgress = (dream: Dream) => {
        Alert.prompt(
            'Update Progress',
            `Current: ฿${dream.currentAmount.toLocaleString()}. Enter new total amount:`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Update',
                    onPress: async (val) => {
                        const newAmount = parseFloat(val || '0');
                        if (isNaN(newAmount)) return;

                        try {
                            await api.put(`/goals/${dream._id}/add`, {
                                amount: newAmount - dream.currentAmount
                            });
                            fetchDreams();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to update progress');
                        }
                    }
                }
            ],
            'plain-text',
            dream.currentAmount.toString()
        );
    };

    const resetForm = () => {
        setTitle('');
        setTargetAmount('');
        setCurrentAmount('0');
        setDescription('');
        setDeadline('');
    };

    const renderItem = ({ item }: { item: Dream }) => {
        const progress = Math.min((item.currentAmount / item.targetAmount) * 100, 100);
        const isCompleted = item.status === 'completed';

        return (
            <TouchableOpacity
                style={[styles.card, isCompleted && styles.cardCompleted]}
                onPress={() => handleUpdateProgress(item)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        {isCompleted ? <Trophy color="#ca8a04" size={24} /> : <Target color="#4f46e5" size={24} />}
                        <Text style={styles.cardTitle}>{item.title}</Text>
                    </View>
                    <View style={[styles.badge, isCompleted ? styles.badgeCompleted : styles.badgeActive]}>
                        <Text style={[styles.badgeText, isCompleted ? styles.textCompleted : styles.textActive]}>
                            {item.status?.toUpperCase() || 'ACTIVE'}
                        </Text>
                    </View>
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: isCompleted ? '#ca8a04' : '#4f46e5' }]} />
                    </View>
                    <View style={styles.statsRow}>
                        <Text style={styles.currentAmount}>฿{item.currentAmount.toLocaleString()}</Text>
                        <Text style={styles.targetAmount}>of ฿{item.targetAmount.toLocaleString()}</Text>
                    </View>
                </View>

                {item.deadline && (
                    <Text style={styles.deadline}>Target: {new Date(item.deadline).toLocaleDateString()}</Text>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Savings Goals</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                    <Plus color="white" size={24} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator style={styles.center} />
            ) : (
                <FlatList
                    data={dreams}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>No saving goals yet</Text>}
                />
            )}

            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>New Goal</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <X size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Goal Name</Text>
                            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="New House" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Target Amount (฿)</Text>
                            <TextInput style={styles.input} value={targetAmount} onChangeText={setTargetAmount} keyboardType="numeric" placeholder="100000" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Starting Amount (฿)</Text>
                            <TextInput style={styles.input} value={currentAmount} onChangeText={setCurrentAmount} keyboardType="numeric" placeholder="0" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Target Date (Optional)</Text>
                            <TextInput style={styles.input} value={deadline} onChangeText={setDeadline} placeholder="YYYY-MM-DD" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Description</Text>
                            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline numberOfLines={3} placeholder="Details..." />
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleCreateDream}>
                            <Text style={styles.submitBtnText}>Create Goal</Text>
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
    card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2 },
    cardCompleted: { backgroundColor: '#fefce8', borderColor: '#eab308', borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeActive: { backgroundColor: '#e0e7ff' },
    badgeCompleted: { backgroundColor: '#fef08a' },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    textActive: { color: '#4f46e5' },
    textCompleted: { color: '#854d0e' },
    progressContainer: { marginBottom: 8 },
    progressBarBg: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
    progressBarFill: { height: '100%', borderRadius: 4 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    currentAmount: { fontSize: 16, fontWeight: 'bold', color: '#111' },
    targetAmount: { fontSize: 14, color: '#666' },
    deadline: { fontSize: 12, color: '#999', marginTop: 8 },

    // Modal
    modalContainer: { flex: 1, backgroundColor: '#f6f7f9' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'white' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    form: { padding: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#444' },
    input: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
    textArea: { height: 80, textAlignVertical: 'top' },
    submitBtn: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
