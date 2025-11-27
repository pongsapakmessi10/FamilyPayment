'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CreditCard, Users, PiggyBank, MessageSquare, Calendar as CalendarIcon, Menu, X, UserCircle, ShoppingCart, Settings, LogOut, Plane } from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { socket } from '@/lib/socket';

export default function BottomNav() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [showMenu, setShowMenu] = useState(false);

    // Load unread count
    useEffect(() => {
        if (!user) return;

        const loadUnreadCount = async () => {
            try {
                const res = await api.get('/chat/unread-count');
                setUnreadCount(res.data.total);
                console.log('[BottomNav] Loaded unread count:', res.data.total);
            } catch (err) {
                console.error('Error loading unread count:', err);
            }
        };

        loadUnreadCount();

        // Ensure socket is connected before joining
        if (!socket.connected) {
            socket.connect();
        }

        // Join family chat for group messages
        socket.emit('join-family-chat', user.familyId);
        console.log('[BottomNav] Joined family chat:', user.familyId);

        // Listen for new messages
        const handleNewMessage = (data: any) => {
            console.log('[BottomNav] New message received via socket!', data);
            setUnreadCount(prev => prev + 1);
        };

        const handleMessageRead = () => {
            console.log('[BottomNav] Messages marked as read, reloading count');
            loadUnreadCount();
        };

        socket.on('message-received', handleNewMessage);
        socket.on('dm-received', handleNewMessage);
        socket.on('messages-read', handleMessageRead);

        return () => {
            socket.off('message-received', handleNewMessage);
            socket.off('dm-received', handleNewMessage);
            socket.off('messages-read', handleMessageRead);
        };
    }, [user]);

    const navItems = [
        { name: 'หน้าหลัก', href: '/dashboard', icon: Home },
        { name: 'ค่าใช้จ่าย', href: '/expenses', icon: CreditCard },
        { name: 'แชท', href: '/chat', icon: MessageSquare, badge: unreadCount },
        { name: 'บิล', href: '/bills', icon: CalendarIcon },
        { name: 'Trip Mode', href: '/events', icon: Plane },
    ];

    const allMenuItems = [
        { name: 'แดชบอร์ด', href: '/dashboard', icon: Home },
        { name: 'สมาชิกทั้งหมด', href: '/members', icon: UserCircle },
        { name: 'แชท', href: '/chat', icon: MessageSquare, badge: unreadCount },
        { name: 'บิล', href: '/bills', icon: CalendarIcon },
        { name: 'ค่าใช้จ่าย', href: '/expenses', icon: CreditCard },
        { name: 'Trip Mode', href: '/events', icon: Plane },
        { name: 'หนี้สิน', href: '/debts', icon: Users },
        { name: 'ความฝัน', href: '/dreams', icon: PiggyBank },
        { name: 'รายการซื้อของ', href: '/shoppings', icon: ShoppingCart },
        { name: 'ตั้งค่า', href: '/settings', icon: Settings },
    ];

    const handleLogout = async () => {
        await logout();
        setShowMenu(false);
    };

    return (
        <>
            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-brown-600 to-brown-700 shadow-lg z-40">
                <div className="flex items-center justify-around px-2 py-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        const showBadge = (item.badge || 0) > 0;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={clsx(
                                    'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors relative',
                                    isActive
                                        ? 'text-white bg-white/20'
                                        : 'text-white/70 hover:text-white hover:bg-white/10'
                                )}
                            >
                                <Icon className="w-6 h-6" />
                                <span className="text-xs font-medium">{item.name}</span>
                                {showBadge && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}

                    {/* Menu Button */}
                    <button
                        onClick={() => setShowMenu(true)}
                        className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors text-white/70 hover:text-white hover:bg-white/10"
                    >
                        <Menu className="w-6 h-6" />
                        <span className="text-xs font-medium">เมนู</span>
                    </button>
                </div>
            </nav>

            {/* Slide-out Menu */}
            {showMenu && (
                <>
                    {/* Backdrop */}
                    <div
                        className="md:hidden fixed inset-0 bg-black/50 z-50"
                        onClick={() => setShowMenu(false)}
                    />

                    {/* Menu Drawer */}
                    <div className="md:hidden fixed inset-y-0 right-0 w-72 bg-gradient-to-b from-brown-600 to-brown-700 shadow-2xl z-50 overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/20">
                            <h2 className="text-xl font-bold text-white">เมนู</h2>
                            <button
                                onClick={() => setShowMenu(false)}
                                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* User Info */}
                        {user && (
                            <div className="p-4 border-b border-white/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">{user.name}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Items */}
                        <div className="p-4 space-y-2">
                            {allMenuItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                const showBadge = (item.badge || 0) > 0;

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setShowMenu(false)}
                                        className={clsx(
                                            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative',
                                            isActive
                                                ? 'bg-white/20 text-white shadow-lg'
                                                : 'text-white/70 hover:text-white hover:bg-white/10'
                                        )}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="font-medium">{item.name}</span>
                                        {showBadge && (
                                            <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-white/70 hover:text-white hover:bg-red-500/20 mt-4"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="font-medium">ออกจากระบบ</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
