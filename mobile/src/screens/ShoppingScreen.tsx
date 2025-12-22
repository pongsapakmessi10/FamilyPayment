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
                category: 'general' // simplified for mobile
            });
            setNewItem('');
            fetchItems();
        } catch (err) {
            Alert.alert('Error', 'Failed to add item');
        }
    };

    const toggleComplete = async (id: string, currentStatus: boolean) => {
        try {
            // Optimistic update
            setItems(items.map(i => i._id === id ? { ...i, completed: !currentStatus } : i));
            await api.put(`/shopping/${id}`, { completed: !currentStatus });
        } catch (err) {
            console.error(err);
            fetchItems(); // Revert on error
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
            <View style={styles.itemRow}>
                <TouchableOpacity onPress={() => toggleComplete(item._id, item.completed)} style={styles.checkBtn}>
                    {item.completed ?
                        <CheckSquare size={24} color="#10b981" /> :
                        <Square size={24} color="#666" />
                    }
                </TouchableOpacity>

                <View style={styles.itemInfo}>
                    <Text style={[styles.itemText, item.completed && styles.completedText]}>{item.name}</Text>
                    <Text style={styles.addedBy}>Added by {item.createdBy?.name || 'Unknown'}</Text>
                </View>

                <TouchableOpacity onPress={() => deleteItem(item._id)} style={styles.deleteBtn}>
                    <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Shopping List</Text>
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Add new item..."
                    value={newItem}
                    onChangeText={setNewItem}
                    onSubmitEditing={handleAddItem}
                />
                <TouchableOpacity onPress={handleAddItem} style={styles.addBtn}>
                    <Plus color="white" size={24} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator style={styles.center} />
            ) : (
                <FlatList
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>No items needed</Text>}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f6f7f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
    title: { fontSize: 20, fontWeight: 'bold' },
    inputContainer: { flexDirection: 'row', padding: 16, gap: 12 },
    input: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
    addBtn: { backgroundColor: '#4f46e5', width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16 },
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 8 },
    checkBtn: { marginRight: 12 },
    itemInfo: { flex: 1 },
    itemText: { fontSize: 16, color: '#333' },
    completedText: { textDecorationLine: 'line-through', color: '#999' },
    addedBy: { fontSize: 12, color: '#999', marginTop: 2 },
    deleteBtn: { padding: 8 },
    empty: { textAlign: 'center', marginTop: 40, color: '#999' }
});
