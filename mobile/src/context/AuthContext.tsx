import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useRouter } from 'next/navigation'; // Removed Next.js router
import io from 'socket.io-client';
import { API_URL } from '../lib/constants';

interface User {
    id: string;
    name: string;
    role: 'moderator' | 'member';
    familyId: string;
}

interface AuthContextType {
    user: User | null;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    loading: boolean;
    updateUser: (user: User) => Promise<void>;
    socket: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState<any>(null);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                const savedUser = await AsyncStorage.getItem('user');

                if (token && savedUser) {
                    const userData = JSON.parse(savedUser);
                    setUser(userData);
                    connectSocket(userData.familyId);
                }
            } catch (error) {
                console.error('Failed to load user', error);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    const connectSocket = (familyId: string) => {
        console.log('🔌 Connecting to Socket.IO at:', API_URL);
        const newSocket = io(API_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        newSocket.on('connect', () => {
            console.log('✅ Socket connected! ID:', newSocket.id);
            newSocket.emit('join-family', familyId);
        });

        newSocket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error.message);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
        });

        setSocket(newSocket);
    };

    const login = async (token: string, userData: User) => {
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        connectSocket(userData.familyId);
    };

    const logout = async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        if (socket) {
            socket.disconnect();
            setSocket(null);
        }
        setUser(null);
    };

    const updateUser = async (userData: User) => {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, isAuthenticated: !!user, loading, socket }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
