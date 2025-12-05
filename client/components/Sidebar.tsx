'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Home, CreditCard, Users, PiggyBank, Settings, LogOut, UserCircle, ShoppingCart, MessageSquare, Calendar as CalendarIcon, Plane } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '@/context/LanguageContext';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { socket } from '@/lib/socket';

export default function Sidebar() {
    const pathname = usePathname();
    const { t } = useLanguage();
    const { user, logout } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const { unread } = useNotifications();

    // Load unread count
    useEffect(() => {
        if (!user) return;

        const loadUnreadCount = async () => {
            try {
                const res = await api.get('/chat/unread-count');
                setUnreadCount(res.data.total);
                console.log('Loaded unread count:', res.data.total);
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
        console.log('Joined family chat:', user.familyId);

        // Listen for new messages
        const handleNewMessage = (data: any) => {
            console.log('New message received via socket!', data);
            setUnreadCount(prev => prev + 1);
        };

        const handleMessageRead = () => {
            console.log('Messages marked as read, reloading count');
            // Reload count when messages are read
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
        { name: t('common.dashboard'), href: '/dashboard', icon: Home },
        { name: 'สมาชิกทั้งหมด', href: '/members', icon: UserCircle },
        { name: 'แชท', href: '/chat', icon: MessageSquare, badge: unreadCount },
        { name: 'บิล', href: '/bills', icon: CalendarIcon },
        { name: t('common.expenses'), href: '/expenses', icon: CreditCard, badge: unread.expenses },
        { name: 'Trip Wallet', href: '/events', icon: Plane },
        { name: 'ยืมเงิน', href: '/debts', icon: Users },
        { name: t('common.dreams'), href: '/dreams', icon: PiggyBank },
        { name: 'รายการซื้อของ', href: '/shoppings', icon: ShoppingCart },
        { name: t('common.settings'), href: '/settings', icon: Settings },
    ];

    return (
        <div className="hidden md:flex flex-col w-64 bg-gradient-to-b from-brown-600 via-brown-700 to-brown-800 h-screen border-r border-brown-800/50 p-4 fixed left-0 top-0 shadow-xl">
            <div className="text-2xl font-bold text-white mb-8 px-4 flex items-center gap-2">
                Nooling Family
            </div>

            {user && (
                <div className="px-4 mb-6">
                    <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/20">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brown-400 via-brown-500 to-brown-600 flex items-center justify-center text-white font-bold shadow-lg">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">{user.name}</p>
                            <p className="text-xs text-brown-200 capitalize">{user.role}</p>
                        </div>
                    </div>
                </div>
            )}

            <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                'flex items-center px-4 py-3 rounded-xl transition-all duration-200 relative',
                                isActive
                                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                                    : 'text-brown-100 hover:bg-white/10 hover:text-white hover:shadow-md'
                            )}
                        >
                            <Icon className="w-5 h-5 mr-3" />
                            <span className="font-medium">{item.name}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pulse">
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="px-4 mt-auto space-y-4">

                <button
                    onClick={logout}
                    className="flex items-center w-full px-4 py-2 text-sm text-brown-100 hover:bg-white/10 hover:text-white rounded-lg transition-all duration-200 border border-white/20 hover:border-white/40 hover:shadow-md"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    {'ออกจากระบบ'}
                </button>
            </div>
        </div>
    );
}
