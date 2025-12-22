import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Modal, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useFocusEffect } from '@react-navigation/native';
import { CircleDollarSign, PiggyBank, Wallet, ShoppingBag, FileText, CreditCard, Target, MessageCircle, Users, Plus, Edit2, X, Backpack } from 'lucide-react-native';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { COLORS } from '../lib/theme';

export default function DashboardScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();

    // Dynamic Footer Height
    const FOOTER_BASE_HEIGHT = 64;
    const footerHeight = FOOTER_BASE_HEIGHT + insets.bottom;

    const { user, logout, socket } = useAuth();
    const { expoPushToken, notificationResponse, registerForPushNotificationsAsync } = usePushNotifications();
    const [data, setData] = useState<any>(null);
    const [savingsSummary, setSavingsSummary] = useState({ current: 0, target: 0 });
    const [balances, setBalances] = useState<any[]>([]);
    const [totalBalance, setTotalBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Chat Notification State
    const [unreadCount, setUnreadCount] = useState(0);

    // Edit Balance State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [newBalance, setNewBalance] = useState('');
    const [updatingBalance, setUpdatingBalance] = useState(false);

    // Deep Linking Listener
    useEffect(() => {
        if (notificationResponse) {
            const data = notificationResponse.notification.request.content.data;
            if (data?.type === 'dm') {
                navigation.navigate('Chat', { mode: 'dm', recipientId: data.senderId, recipientName: data.senderName });
            } else if (data?.type === 'group') {
                navigation.navigate('Chat', { mode: 'group' });
            }
        }
    }, [notificationResponse]);

    // Helper to fetch unread count (Server Authoritative)
    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await api.get('/chat/unread-count');
            setUnreadCount(res.data.total || 0);
        } catch (err) {
            console.error('Error fetching unread count:', err);
        }
    }, []);

    // Socket Listener for Unread Count
    useEffect(() => {
        if (!user || !socket) return;

        const joinRoom = () => {
            console.log('Joining user room:', user.id);
            socket.emit('join-user-room', user.id);
        };

        // If socket exists, check connection status
        if (socket.connected) {
            joinRoom();
        }

        socket.on('connect', joinRoom);

        // Handler for any event that should update unread count
        const updateBadge = () => {
            console.log('🔔 Real-time event received. Refreshing badge...');
            fetchUnreadCount();
        };

        socket.on('dm-notification', updateBadge);
        socket.on('messages-read', updateBadge);

        // Fetch immediately on mount/user load
        fetchUnreadCount();

        return () => {
            socket.off('connect', joinRoom);
            socket.off('dm-notification', updateBadge);
            socket.off('messages-read', updateBadge);
        };
    }, [user, socket, fetchUnreadCount]);

    useEffect(() => {
        registerForPushNotificationsAsync();
    }, []);

    useEffect(() => {
        const sendToken = async () => {
            if (expoPushToken && user) {
                try {
                    console.log('📤 Registering push token:', expoPushToken);
                    await api.post('/user/push-token', { token: expoPushToken });
                    console.log('✅ Push token registered successfully');
                } catch (err) {
                    console.error('❌ Error sending push token:', err);
                }
            } else {
                if (!expoPushToken) console.log('⚠️ No push token yet');
                if (!user) console.log('⚠️ No user logged in');
            }
        };
        sendToken();
    }, [expoPushToken, user]);

    const fetchData = async () => {
        try {
            const [dashboardRes, balancesRes] = await Promise.all([
                api.get('/dashboard'),
                api.get('/balances')
            ]);
            setData(dashboardRes.data);
            setSavingsSummary(dashboardRes.data?.savingsSummary || { current: 0, target: 0 });
            if (balancesRes.data?.balances) {
                setBalances(balancesRes.data.balances);
                setTotalBalance(balancesRes.data.totalBalance || 0);
            }

            // Fetch unread chat count
            await fetchUnreadCount();

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleEditBalance = (currentBalance: number) => {
        setNewBalance(currentBalance.toString());
        setEditModalVisible(true);
    };

    const submitBalanceUpdate = async () => {
        const balanceNum = parseFloat(newBalance);
        if (isNaN(balanceNum) || balanceNum < 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        setUpdatingBalance(true);
        try {
            await api.put('/balance', { balance: balanceNum });
            Alert.alert('Success', 'Balance updated successfully');
            setEditModalVisible(false);
            fetchData();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to update balance');
        } finally {
            setUpdatingBalance(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.appName}>Family Payment</Text>
                    <Text style={styles.welcome}>Hi, {user?.name}</Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: footerHeight + 20 }
                ]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {/* Summary Cards */}
                <View style={styles.grid}>
                    <View style={[styles.card, { backgroundColor: COLORS.primary }]}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Total Expenses</Text>
                            <CircleDollarSign color="white" size={24} />
                        </View>
                        <Text style={styles.amount}>฿{data?.totalBalance?.toLocaleString() || '0'}</Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: COLORS.primaryDark }]}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Remaining Balance</Text>
                            <Wallet color="white" size={24} />
                        </View>
                        <Text style={styles.amount}>฿{totalBalance.toLocaleString()}</Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: COLORS.primaryLight }]}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Total Savings</Text>
                            <PiggyBank color={COLORS.text} size={24} />
                        </View>
                        <Text style={[styles.amount, { color: COLORS.text }]}>฿{savingsSummary.current?.toLocaleString()}</Text>
                        <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>Target: ฿{savingsSummary.target?.toLocaleString()}</Text>
                    </View>
                </View>

                {/* Member Balances Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Member Wallets</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.balanceScroll}>
                        {balances.map((member) => (
                            <View key={member._id} style={styles.balanceCard}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{member.name[0]}</Text>
                                </View>
                                <View>
                                    <Text style={styles.memberName}>
                                        {member.name} {member.isCurrentUser && '(You)'}
                                    </Text>
                                    <View style={styles.balanceRow}>
                                        <Text style={styles.memberBalance}>฿{member.balance?.toLocaleString()}</Text>
                                        {(member.isCurrentUser || member._id === user?.id) && (
                                            <TouchableOpacity
                                                onPress={() => handleEditBalance(member.balance || 0)}
                                                style={styles.editBtn}
                                            >
                                                <Edit2 size={14} color={COLORS.textSecondary} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Actions Grid (Remaining Items) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.gridContainer}>
                        {[
                            { id: 'Debts', name: 'Debts', icon: CreditCard },
                            { id: 'Dreams', name: 'Dreams', icon: Target },
                            { id: 'Events', name: 'Trips', icon: Backpack },
                        ].map((feature) => (
                            <TouchableOpacity
                                key={feature.id}
                                style={styles.gridItem}
                                onPress={() => navigation.navigate(feature.id)}
                            >
                                <View style={styles.iconContainer}>
                                    <feature.icon size={24} color={COLORS.primary} />
                                </View>
                                <Text style={styles.gridLabel}>{feature.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Footer Navigation */}
            <View style={[styles.footerNav, { paddingBottom: insets.bottom || 12 }]}>
                {[
                    { id: 'Members', icon: Users },
                    { id: 'AddExpense', icon: Plus },
                    { id: 'Chat', icon: MessageCircle },
                    { id: 'Bills', icon: FileText },
                    { id: 'Shopping', icon: ShoppingBag },
                ].map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.footerNavItem}
                        onPress={() => navigation.navigate(item.id)}
                    >
                        <View>
                            <item.icon size={28} color={COLORS.primary} />
                            {/* Render Badge for Chat */}
                            {item.id === 'Chat' && unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Edit Balance Modal */}
            <Modal visible={editModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Update Balance</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <X size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.label}>Current Balance (฿)</Text>
                        <TextInput
                            style={styles.input}
                            value={newBalance}
                            onChangeText={setNewBalance}
                            keyboardType="numeric"
                            placeholder="0.00"
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.cancelBtn]}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.confirmBtn]}
                                onPress={submitBalanceUpdate}
                                disabled={updatingBalance}
                            >
                                {updatingBalance ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
        padding: 24,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    appName: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    welcome: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    logoutButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 20,
    },
    logoutText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 12,
    },
    content: {
        padding: 20,
    },
    grid: {
        gap: 16,
        marginBottom: 32,
    },
    card: {
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '600',
    },
    amount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 4,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 16,
    },
    balanceScroll: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    balanceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: 12,
        borderRadius: 12,
        marginRight: 12,
        minWidth: 140,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    memberName: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 2,
    },
    memberBalance: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    editBtn: {
        padding: 4,
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 12,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 10,
    },
    gridItem: {
        width: '31%',
        backgroundColor: COLORS.surface,
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.surfaceVariant,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    gridLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text,
    },
    // Footer Navigation
    footerNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    footerNavItem: {
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        width: 60, // Ensure decent touch target
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.surfaceVariant,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        color: COLORS.text,
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: {
        backgroundColor: COLORS.surfaceVariant,
    },
    confirmBtn: {
        backgroundColor: COLORS.primary,
    },
    cancelBtnText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    confirmBtnText: {
        color: 'white',
        fontWeight: 'bold',
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: COLORS.error, // Red like badge
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: COLORS.surface, // Outline to separate from icon
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    }
});