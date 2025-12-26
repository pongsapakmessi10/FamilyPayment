import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ChevronDown, Check, User as UserIcon } from 'lucide-react-native';
import { COLORS } from '../lib/theme';

const CATEGORIES = [
    { id: 'Food', name: 'Food', icon: '🍔' },
    { id: 'Transport', name: 'Transport', icon: '🚗' },
    { id: 'Utilities', name: 'Utilities', icon: '💡' },
    { id: 'Entertainment', name: 'Entertainment', icon: '🎬' },
    { id: 'Shopping', name: 'Shopping', icon: '🛍️' },
    { id: 'Health', name: 'Health', icon: '🏥' },
    { id: 'Other', name: 'Other', icon: '📝' },
];

export default function AddExpenseScreen({ navigation }: any) {
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0].id);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedPayer, setSelectedPayer] = useState<string>('');
    const [modalVisible, setModalVisible] = useState(false);

    const [isSplit, setIsSplit] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [splitDetails, setSplitDetails] = useState<any[]>([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    // Auto-select all members when enabling split
    useEffect(() => {
        if (isSplit && selectedMembers.length === 0 && users.length > 0) {
            setSelectedMembers(users.map(u => u._id));
        }
    }, [isSplit, users]);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
            if (res.data.length > 0) {
                const currentUser = res.data.find((u: any) => u._id === user?.id || u.email === user?.email);
                setSelectedPayer(currentUser ? currentUser._id : res.data[0]._id);
            }
        } catch (err) {
            console.error('Error fetching users:', err);
            Alert.alert('Error', 'Failed to load family members');
        }
    };

    const toggleMemberSelection = (memberId: string) => {
        if (selectedMembers.includes(memberId)) {
            setSelectedMembers(selectedMembers.filter(id => id !== memberId));
        } else {
            setSelectedMembers([...selectedMembers, memberId]);
        }
    };

    const handleSubmit = async () => {
        if (!amount || !description) {
            Alert.alert('Error', 'Please fill in amount and description');
            return;
        }

        if (!selectedPayer) {
            Alert.alert('Error', 'Please select who paid');
            return;
        }

        if (isSplit && selectedMembers.length === 0) {
            Alert.alert('Error', 'Please select at least one person to split with');
            return;
        }

        setLoading(true);
        try {
            const expenseAmount = parseFloat(amount);
            let finalSplitDetails: { userId: string; amount: number }[] = [];

            if (isSplit) {
                const splitCount = selectedMembers.length;
                const amountPerPerson = expenseAmount / splitCount;

                finalSplitDetails = selectedMembers.map(memberId => ({
                    userId: memberId,
                    amount: amountPerPerson
                }));
            }

            const payload = {
                type: 'expense',
                amount: expenseAmount,
                description,
                category,
                payer: selectedPayer,
                date: new Date().toISOString(),
                splitDetails: isSplit ? finalSplitDetails : []
            };

            await api.post('/transactions', payload);

            navigation.goBack();
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', err.response?.data?.message || 'Failed to add expense');
        } finally {
            setLoading(false);
        }
    };

    const getPayerName = () => {
        const payer = users.find(u => u._id === selectedPayer);
        return payer ? payer.name : 'Select Payer';
    };

    const getSplitText = () => {
        if (!amount || selectedMembers.length === 0) return '฿0.00 / person';
        const val = parseFloat(amount);
        if (isNaN(val)) return '฿0.00 / person';
        return `฿${(val / selectedMembers.length).toFixed(2)} / person`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Add Expense</Text>
                <View style={{ width: 50 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Amount Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Amount (฿)</Text>
                        <TextInput
                            style={styles.amountInput}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor={COLORS.textSecondary}
                            autoFocus
                        />
                    </View>

                    {/* Description Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={styles.input}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="What is this for?"
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>

                    {/* Category Selection */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryChip,
                                        category === cat.id && styles.categoryChipSelected
                                    ]}
                                    onPress={() => setCategory(cat.id)}
                                >
                                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                                    <Text style={[
                                        styles.categoryText,
                                        category === cat.id && styles.categoryTextSelected
                                    ]}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Payer Dropdown */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Who Paid?</Text>
                        <TouchableOpacity
                            style={[
                                styles.dropdownButton,
                                isSplit && styles.dropdownButtonDisabled
                            ]}
                            onPress={() => !isSplit && setModalVisible(true)}
                            disabled={isSplit}
                        >
                            <View style={styles.dropdownContent}>
                                <UserIcon size={20} color={isSplit ? COLORS.textSecondary : COLORS.textSecondary} style={{ marginRight: 10 }} />
                                <Text style={styles.dropdownText}>{isSplit ? 'Everyone (Split)' : getPayerName()}</Text>
                            </View>
                            {!isSplit && <ChevronDown size={20} color={COLORS.textSecondary} />}
                        </TouchableOpacity>
                    </View>

                    {/* Split Bill Toggle */}
                    <View style={styles.splitSection}>
                        <View style={styles.splitHeader}>
                            <Text style={styles.label}>Split Bill</Text>
                            <TouchableOpacity
                                style={[styles.switch, isSplit && styles.switchActive]}
                                onPress={() => setIsSplit(!isSplit)}
                            >
                                <View style={[styles.switchKnob, isSplit && styles.switchKnobActive]} />
                            </TouchableOpacity>
                        </View>

                        {isSplit && (
                            <View style={styles.splitMembersContainer}>
                                <Text style={styles.splitSummaryText}>
                                    Split equally: <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>{getSplitText()}</Text>
                                </Text>
                                {users.map((member) => (
                                    <TouchableOpacity
                                        key={member._id}
                                        style={styles.memberRow}
                                        onPress={() => toggleMemberSelection(member._id)}
                                    >
                                        <View style={styles.memberInfo}>
                                            <View style={[styles.avatarSmall, { backgroundColor: COLORS.surfaceVariant }]}>
                                                <Text style={styles.avatarTextSmall}>{member.name ? member.name[0] : '?'}</Text>
                                            </View>
                                            <Text style={styles.memberName}>{member.name}</Text>
                                        </View>
                                        <View style={[styles.checkbox, selectedMembers.includes(member._id) && styles.checkboxSelected]}>
                                            {selectedMembers.includes(member._id) && <Check size={16} color="white" />}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.submitButtonText}>Save Expense</Text>
                        )}
                    </TouchableOpacity>

                    {/* Bottom Padding for scroll */}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Payer Selection Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Payer</Text>
                        {users.map((member) => (
                            <TouchableOpacity
                                key={member._id}
                                style={[
                                    styles.modalItem,
                                    selectedPayer === member._id && styles.modalItemSelected
                                ]}
                                onPress={() => {
                                    setSelectedPayer(member._id);
                                    setModalVisible(false);
                                }}
                            >
                                <View style={styles.modalItemContent}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{member.name ? member.name[0].toUpperCase() : '?'}</Text>
                                    </View>
                                    <Text style={[
                                        styles.memberText,
                                        selectedPayer === member._id && styles.memberTextSelected
                                    ]}>{member.name}</Text>
                                </View>
                                {selectedPayer === member._id && <Check size={20} color={COLORS.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    cancelText: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    content: {
        padding: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    amountInput: {
        fontSize: 48,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        paddingVertical: 20,
    },
    input: {
        backgroundColor: COLORS.surfaceVariant,
        padding: 16,
        borderRadius: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        color: COLORS.text,
    },
    categoryScroll: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 24,
        marginRight: 12,
        gap: 8,
    },
    categoryChipSelected: {
        backgroundColor: COLORS.primary,
    },
    categoryIcon: {
        fontSize: 20,
    },
    categoryText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
        fontSize: 14,
    },
    categoryTextSelected: {
        color: 'white',
    },
    dropdownButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceVariant,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dropdownButtonDisabled: {
        backgroundColor: '#e0e0e0', // Gray shade
        borderColor: '#ccc',
        opacity: 0.6,
    },
    dropdownContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        maxHeight: '60%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: COLORS.text,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    modalItemSelected: {
        backgroundColor: COLORS.surfaceVariant,
    },
    modalItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    memberText: {
        color: COLORS.text,
        fontWeight: '600',
        fontSize: 16,
    },
    memberTextSelected: {
        color: COLORS.primary,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    splitSection: {
        marginTop: 20,
        marginBottom: 20,
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 16,
        padding: 16,
    },
    splitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    switch: {
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        padding: 2,
    },
    switchActive: {
        backgroundColor: COLORS.primary,
    },
    switchKnob: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'white',
    },
    switchKnobActive: {
        alignSelf: 'flex-end',
    },
    splitMembersContainer: {
        marginTop: 10,
    },
    splitSummaryText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 10,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    avatarTextSmall: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    memberName: {
        fontSize: 16,
        color: COLORS.text,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.textSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
});
