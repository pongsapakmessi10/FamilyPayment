'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { socket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

type NotificationKey = 'expenses';

type NotificationState = Record<NotificationKey, number>;

interface NotificationContextValue {
    unread: NotificationState;
    markAsRead: (key: NotificationKey) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
    unread: { expenses: 0 },
    markAsRead: () => { },
});

const STORAGE_KEY = 'notification-unread';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [unread, setUnread] = useState<NotificationState>({ expenses: 0 });

    // Load persisted unread counts
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setUnread((prev) => ({ ...prev, ...parsed }));
            } catch {
                // ignore parse errors
            }
        }
    }, []);

    // Persist unread changes
    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(unread));
    }, [unread]);

    useEffect(() => {
        if (!user?.familyId) return;

        // Ensure connection
        if (!socket.connected) {
            socket.connect();
        }

        // Listen for new expense transactions from other members
        const handleNewTransaction = (tx: any) => {
            if (!tx || tx.type !== 'expense') return;
            // Ignore if current user is the payer/creator
            if (tx.payer && user?.id && tx.payer.toString && tx.payer.toString() === user.id) return;
            if (tx.payer && user?.id && typeof tx.payer === 'string' && tx.payer === user.id) return;

            setUnread((prev) => ({ ...prev, expenses: prev.expenses + 1 }));
        };

        socket.on('new-transaction', handleNewTransaction);

        return () => {
            socket.off('new-transaction', handleNewTransaction);
        };
    }, [user]);

    const markAsRead = useCallback((key: NotificationKey) => {
        setUnread((prev) => ({ ...prev, [key]: 0 }));
    }, []);

    return (
        <NotificationContext.Provider value={{ unread, markAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    return useContext(NotificationContext);
}
