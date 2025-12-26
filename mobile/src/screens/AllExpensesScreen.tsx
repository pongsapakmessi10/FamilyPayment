import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import api from '../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, X } from 'lucide-react-native';
import { COLORS } from '../lib/theme';

interface Transaction {
    _id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
    payer: { name: string };
}

export default function AllExpensesScreen() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            // Using the same endpoint for now, can be customized later
            const res = await api.get('/transactions');
            setTransactions(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (event: any, date?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (date) {
            setSelectedDate(date);
        }
    };

    const clearFilter = () => {
        setSelectedDate(null);
    };

    const filteredTransactions = selectedDate
        ? transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getDate() === selectedDate.getDate() &&
                tDate.getMonth() === selectedDate.getMonth() &&
                tDate.getFullYear() === selectedDate.getFullYear();
        })
        : transactions;

    const renderItem = ({ item }: { item: Transaction }) => (
        <View style={styles.item}>
            <View style={styles.itemLeft}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.payer?.name?.[0] || '?'}</Text>
                </View>
                <View>
                    <Text style={styles.description}>{item.description}</Text>
                    <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>

                    <Text style={styles.category}>หมวดหมู่ : {item.category}</Text>
                    <Text style={styles.payer}>ผู้จ่าย : {item.payer.name}</Text>
                </View>
            </View>
            <Text style={styles.itemAmount}>฿{item.amount.toLocaleString()}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.title}>All Expenses</Text>
                    {selectedDate ? (
                        <TouchableOpacity onPress={clearFilter} style={styles.filterButtonActive}>
                            <Text style={styles.filterTextActive}>{selectedDate.toLocaleDateString()}</Text>
                            <X size={16} color="white" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.filterButton}>
                            <Calendar size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={filteredTransactions}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No transactions found for this date</Text>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f6f7f9',
    },
    header: {
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    filterButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    filterButtonActive: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
    },
    filterTextActive: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#999',
        fontSize: 16,
    },
    list: {
        padding: 20,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e0e7ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#4f46e5',
        fontWeight: 'bold',
        fontSize: 16,
    },
    description: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    date: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    itemAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ef4444',
    },
    category: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
        marginTop: 2,
    },
    payer: {
        fontSize: 12,
        color: 'brown',
        fontWeight: '600',
        marginTop: 2,
    },
});
