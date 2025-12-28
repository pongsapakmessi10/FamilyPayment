import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react-native';

interface ShoppingItem {
    _id: string;
    name: string;
    category: string;
    completed: boolean;
    createdBy: { name: string };
}

export default function ShoppingScreen() {
    const { user } = useAuth();
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState('');

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const res = await api.get('/shopping');
            setItems(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!newItem.trim()) return;
        try {
            const res = await api.post('/shopping', {
                name: newItem,
                category: 'general'
            });
            setNewItem('');
            fetchItems();
        } catch (err) {
            Alert.alert('Error', 'Failed to add item');
        }
    };

    const toggleComplete = async (id: string, currentStatus: boolean) => {
        try {
            setItems(items.map(i => i._id === id ? { ...i, completed: !currentStatus } : i));
            await api.put(`/shopping/${id}`, { completed: !currentStatus });
        } catch (err) {
            console.error(err);
            fetchItems();
        }
    };

    const deleteItem = async (id: string) => {
        try {
            setItems(items.filter(i => i._id !== id));
            await api.delete(`/shopping/${id}`);
        } catch (err) {
            console.error(err);
            fetchItems();
        }
    };

    const renderItem = ({ item }: { item: ShoppingItem }) => {
        if (!item) return null;
        return (
            <View style={[styles.itemRow, item.completed && styles.itemRowCompleted]}>
                <TouchableOpacity onPress={() => toggleComplete(item._id, item.completed)} style={styles.checkBtn}>
                    {item.completed ?
                        <CheckSquare size={26} color="#10b981" strokeWidth={2.5} /> :
                        <Square size={26} color="#94a3b8" strokeWidth={2} />
                    }
                </TouchableOpacity>

                <View style={styles.itemInfo}>
                    <Text style={[styles.itemText, item.completed && styles.completedText]}>{item.name}</Text>
                    <Text style={styles.addedBy}>Added by {item.createdBy?.name || 'Unknown'}</Text>
                </View>

                <TouchableOpacity onPress={() => deleteItem(item._id)} style={styles.deleteBtn}>
                    <Trash2 size={22} color="#ef4444" strokeWidth={2} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>

                <Text style={styles.subtitle}>{items.filter(i => !i.completed).length} items to buy</Text>
            </View>

            <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="What do you need?"
                        placeholderTextColor="#94a3b8"
                        value={newItem}
                        onChangeText={setNewItem}
                        onSubmitEditing={handleAddItem}
                    />
                    <TouchableOpacity onPress={handleAddItem} style={styles.addBtn}>
                        <Plus color="white" size={22} strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator style={styles.center} size="large" color="#6366f1" />
            ) : (
                <FlatList
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>🛒</Text>
                            <Text style={styles.empty}>ตะกร้าว่างเปล่า</Text>
                            <Text style={styles.emptySubtext}>เพิ่มสิ่งที่ต้องการซื้อ</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#f8fafc' 
    },
    center: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    header: { 
        padding: 24, 
        paddingBottom: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1, 
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    title: { 
        fontSize: 28, 
        fontWeight: '700',
        color: '#0f172a',
        letterSpacing: -0.5
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
        fontWeight: '500'
    },
    inputWrapper: {
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    inputContainer: { 
        flexDirection: 'row', 
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        paddingRight: 6,
        borderWidth: 2,
        borderColor: '#e2e8f0'
    },
    input: { 
        flex: 1, 
        backgroundColor: 'transparent',
        padding: 16,
        fontSize: 16,
        color: '#0f172a',
        fontWeight: '500'
    },
    addBtn: { 
        backgroundColor: 'brown',
        width: 44, 
        height: 44, 
        borderRadius: 12, 
        alignItems: 'center', 
        justifyContent: 'center',
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    list: { 
        padding: 20,
        paddingTop: 16
    },
    itemRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: 'white', 
        padding: 18,
        borderRadius: 16, 
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f1f5f9'
    },
    itemRowCompleted: {
        backgroundColor: '#f8fafc',
        opacity: 0.7
    },
    checkBtn: { 
        marginRight: 14,
        padding: 4
    },
    itemInfo: { 
        flex: 1 
    },
    itemText: { 
        fontSize: 17, 
        color: '#0f172a',
        fontWeight: '600',
        lineHeight: 24
    },
    completedText: { 
        textDecorationLine: 'line-through', 
        color: '#94a3b8',
        fontWeight: '500'
    },
    addedBy: { 
        fontSize: 13, 
        color: '#94a3b8', 
        marginTop: 4,
        fontWeight: '500'
    },
    deleteBtn: { 
        padding: 10,
        marginLeft: 8
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 80,
        paddingHorizontal: 40
    },
    emptyIcon: {
        fontSize: 56,
        marginBottom: 16
    },
    empty: { 
        textAlign: 'center',
        fontSize: 20,
        color: '#475569',
        fontWeight: '600',
        marginBottom: 8
    },
    emptySubtext: {
        textAlign: 'center',
        fontSize: 15,
        color: '#94a3b8',
        fontWeight: '500'
    }
});