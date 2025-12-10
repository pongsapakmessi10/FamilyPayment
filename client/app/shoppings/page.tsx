'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/lib/api';
import { Plus, Trash2, Check, Search, Filter, ArrowUpDown, ShoppingCart, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ShoppingsSkeleton from '@/components/ShoppingsSkeleton';

interface ShoppingItem {
    _id: string;
    name: string;
    price: number;
    completed: boolean;
    category: string;
    createdBy: {
        _id: string;
        name: string;
    };
    createdAt: string;
}

export default function ShoppingPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();

    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('Food');
    const [customCategory, setCustomCategory] = useState('');
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Filter & Sort
    const [filterCategory, setFilterCategory] = useState('All');
    const [sortBy, setSortBy] = useState<'date' | 'name' | 'price_asc' | 'price_desc'>('date');

    const categories = ['Food', 'Home', 'Personal', 'Pets', 'Other'];

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/');
            return;
        }
        if (user?.familyId) {
            fetchItems();
        }
    }, [user, authLoading]);

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

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName) return;

        const category = isCustomCategory ? customCategory : newItemCategory;

        try {
            if (editingId) {
                // Update existing item
                const res = await api.put(`/shopping/${editingId}`, {
                    name: newItemName,
                    price: parseFloat(newItemPrice) || 0,
                    category: category || 'Uncategorized'
                });
                setItems(items.map(item => item._id === editingId ? res.data : item));
                setEditingId(null);
            } else {
                // Create new item
                const res = await api.post('/shopping', {
                    name: newItemName,
                    price: parseFloat(newItemPrice) || 0,
                    category: category || 'Uncategorized'
                });
                setItems([res.data, ...items]);
            }

            // Reset form
            setNewItemName('');
            setNewItemPrice('');
            setCustomCategory('');
            setIsCustomCategory(false);
            setNewItemCategory('Food');
        } catch (err) {
            console.error(err);
            alert('บันทึกรายการไม่สำเร็จ');
        }
    };

    const handleEdit = (item: ShoppingItem) => {
        setEditingId(item._id);
        setNewItemName(item.name);
        setNewItemPrice(item.price.toString());

        if (categories.includes(item.category)) {
            setNewItemCategory(item.category);
            setIsCustomCategory(false);
        } else {
            setNewItemCategory('custom');
            setCustomCategory(item.category);
            setIsCustomCategory(true);
        }

        // Scroll to top to see form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setNewItemName('');
        setNewItemPrice('');
        setCustomCategory('');
        setIsCustomCategory(false);
        setNewItemCategory('Food');
    };

    const toggleComplete = async (id: string, currentStatus: boolean) => {
        try {
            // Optimistic update
            setItems(items.map(item =>
                item._id === id ? { ...item, completed: !currentStatus } : item
            ));

            await api.put(`/shopping/${id}`, { completed: !currentStatus });
        } catch (err) {
            console.error(err);
            fetchItems(); // Revert on error
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('ลบรายการนี้หรือไม่?')) return;
        try {
            setItems(items.filter(item => item._id !== id));
            await api.delete(`/shopping/${id}`);
            if (editingId === id) cancelEdit();
        } catch (err) {
            console.error(err);
            fetchItems();
        }
    };

    // Derived state
    const uniqueCategories = Array.from(new Set(items.map(item => item.category))).sort();

    const filteredItems = items
        .filter(item => filterCategory === 'All' || item.category === filterCategory)
        .sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'price_asc') return a.price - b.price;
            if (sortBy === 'price_desc') return b.price - a.price;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    const totalItems = filteredItems.length;
    const completedItems = filteredItems.filter(i => i.completed).length;
    const totalPrice = filteredItems.reduce((sum, item) => sum + (item.completed ? 0 : item.price), 0);
    const grandTotal = filteredItems.reduce((sum, item) => sum + item.price, 0);

    if (loading) return <ShoppingsSkeleton />;

    return (
        <div className="space-y-6 pb-24 md:pb-0">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-blue-700 flex items-center gap-2">
                    <ShoppingCart className="w-8 h-8" />
                    รายการซื้อของ
                </h1>
            </div>

            {/* Add/Edit Item Form */}
            <div className={`p-6 rounded-2xl shadow-lg border transition-colors ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-blue-100'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className={`font-semibold ${editingId ? 'text-blue-700' : 'text-gray-700'}`}>
                        {editingId ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}
                    </h2>
                    {editingId && (
                        <button onClick={cancelEdit} className="text-sm text-gray-500 hover:text-gray-700 underline">
                            ยกเลิกการแก้ไข
                        </button>
                    )}
                </div>
                <form onSubmit={handleAddItem} className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="ชื่อรายการ"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brown-500 outline-none text-black"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-32">
                        <input
                            type="number"
                            placeholder="ราคา"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brown-500 outline-none text-black"
                            value={newItemPrice}
                            onChange={(e) => setNewItemPrice(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        {isCustomCategory ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="หมวดหมู่"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brown-500 outline-none text-black"
                                    value={customCategory}
                                    onChange={(e) => setCustomCategory(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsCustomCategory(false)}
                                    className="text-gray-500 hover:text-red-500"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brown-500 outline-none text-black bg-white"
                                value={newItemCategory}
                                onChange={(e) => {
                                    if (e.target.value === 'custom') {
                                        setIsCustomCategory(true);
                                    } else {
                                        setNewItemCategory(e.target.value);
                                    }
                                }}
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                <option value="custom">+ กำหนดเอง</option>
                            </select>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={!newItemName}
                        className={`px-6 py-3 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-md flex items-center justify-center gap-2 ${editingId ? 'bg-brown-600 hover:bg-brown-700' : 'bg-brown-600 hover:bg-brown-700'
                            }`}
                    >
                        {editingId ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {editingId ? 'อัปเดต' : 'เพิ่ม'}
                    </button>
                </form>
            </div>

            {/* Filters & Sort */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/50 p-4 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                    <Filter className="w-5 h-5 text-brown-600" />
                    <button
                        onClick={() => setFilterCategory('All')}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterCategory === 'All' ? 'bg-brown-600 text-white' : 'bg-white text-gray-600 hover:bg-blue-50'
                            }`}
                    >
                        ทั้งหมด
                    </button>
                    {uniqueCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterCategory === cat ? 'bg-brown-600 text-white' : 'bg-white text-gray-600 hover:bg-blue-50'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <ArrowUpDown className="w-5 h-5 text-brown-600" />
                    <select
                        className="px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none text-black bg-white w-full md:w-auto"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                    >
                        <option value="date">วันที่เพิ่ม</option>
                        <option value="name">ชื่อ (ก-ฮ)</option>
                        <option value="price_asc">ราคา (ต่ำ-สูง)</option>
                        <option value="price_desc">ราคา (สูง-ต่ำ)</option>
                    </select>
                </div>
            </div>

            {/* Items List */}
            <div className="grid gap-3">
                {filteredItems.map((item) => (
                    <div
                        key={item._id}
                        className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${item.completed
                            ? 'bg-gray-50 border-gray-100 opacity-75'
                            : 'bg-white border-blue-100 hover:shadow-md hover:border-blue-200'
                            }`}
                    >
                        <div className="flex items-center gap-4 flex-1">
                            <button
                                onClick={() => toggleComplete(item._id, item.completed)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${item.completed
                                    ? 'bg-blue-500 border-green-500 text-white'
                                    : 'border-gray-300 hover:border-green-500'
                                    }`}
                            >
                                {item.completed && <Check className="w-4 h-4" />}
                            </button>

                            <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`font-medium text-lg ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                        {item.name}
                                    </span>
                                    <span className="px-2 py-0.5 bg-blue-50 text-brown-600 text-xs rounded-full font-medium">
                                        {item.category}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                    <span>เพิ่มโดย {item.createdBy?.name}</span>
                                    {item.price > 0 && (
                                        <span className="font-semibold text-brown-600">
                                            ฿{item.price.toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleEdit(item)}
                                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Pencil className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleDelete(item._id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}

                {filteredItems.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>ไม่พบรายการ</p>
                    </div>
                )}
            </div>

            {/* Summary Footer */}
            <div className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-72 md:right-8 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-blue-100 flex justify-between items-center z-40">
                <div className="flex gap-6 text-sm font-medium text-gray-600">
                    <span>ทั้งหมด: {totalItems} รายการ</span>
                    <span>เสร็จสิ้น: {completedItems}</span>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500">ยอดรวมโดยประมาณ</p>
                    <p className="text-xl font-bold text-blue-700">฿{grandTotal.toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}
