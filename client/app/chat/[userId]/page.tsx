'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { socket } from '@/lib/socket';
import api from '@/lib/api';
import { Send, ArrowLeft, Trash2, Check, CheckCheck } from 'lucide-react';

interface Message {
    _id: string;
    sender: {
        _id: string;
        name: string;
        email: string;
    };
    recipient?: {
        _id: string;
        name: string;
        email: string;
    };
    messageType: 'group' | 'dm';
    message: string;
    timestamp: string;
    conversationId?: string;
    deletedForEveryone?: boolean;
    deletedBy?: string[];
    readBy?: Array<{
        user: string;
        readAt: string;
    }>;
}

interface OtherUser {
    _id: string;
    name: string;
    email: string;
}

export default function DMChatPage() {
    const { user, isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const userId = params.userId as string;

    const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [deleteMenuOpen, setDeleteMenuOpen] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const notificationSound = useRef<HTMLAudioElement | null>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [loading, isAuthenticated, router]);

    // Initialize notification sound
    useEffect(() => {
        notificationSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjCJ0fPTgjMGHm7A7+OZURE');
    }, []);

    // Load other user info
    useEffect(() => {
        if (!userId || !user) return;

        const loadOtherUser = async () => {
            try {
                const res = await api.get(`/users/${userId}`);
                setOtherUser(res.data);
            } catch (err) {
                console.error('Error loading user:', err);
                router.push('/chat');
            }
        };

        loadOtherUser();
    }, [userId, user, router]);

    // Load DM messages
    useEffect(() => {
        if (!userId || !user) return;

        const loadMessages = async () => {
            setLoadingMessages(true);
            try {
                const res = await api.get(`/chat/messages/${userId}`);
                setMessages(res.data);

                // Mark messages as read
                const conversationId = [user.id, userId].sort().join('_');
                socket.emit('mark-read', {
                    conversationId,
                    userId: user.id
                });
            } catch (err) {
                console.error('Error loading messages:', err);
            } finally {
                setLoadingMessages(false);
            }
        };

        loadMessages();
    }, [userId, user]);

    // Join DM room and listen for messages
    useEffect(() => {
        if (!user || !userId) return;

        socket.emit('join-dm-room', {
            userId1: user.id,
            userId2: userId
        });

        const handleDMReceived = (message: Message) => {
            if (message.messageType === 'dm') {
                const conversationId = [user.id, userId].sort().join('_');
                if (message.conversationId === conversationId) {
                    setMessages((prev) => [...prev, message]);

                    // Play notification sound if from other user
                    if (message.sender._id !== user.id && notificationSound.current) {
                        notificationSound.current.play().catch(e => console.log('Sound play failed:', e));
                    }

                    // Auto-mark as read
                    socket.emit('mark-read', {
                        conversationId,
                        userId: user.id
                    });
                }
            }
        };

        const handleMessagesRead = (data: { conversationId: string; messageIds: string[]; userId: string; readAt: string }) => {
            setMessages((prev) =>
                prev.map(msg => {
                    if (data.messageIds.includes(msg._id)) {
                        const updatedReadBy = [...(msg.readBy || [])];
                        if (!updatedReadBy.some(r => r.user === data.userId)) {
                            updatedReadBy.push({ user: data.userId, readAt: data.readAt });
                        }
                        return { ...msg, readBy: updatedReadBy };
                    }
                    return msg;
                })
            );
        };

        const handleMessageDeleted = (data: { messageId: string }) => {
            setMessages((prev) =>
                prev.map(msg =>
                    msg._id === data.messageId
                        ? { ...msg, deletedForEveryone: true }
                        : msg
                )
            );
        };

        socket.on('dm-received', handleDMReceived);
        socket.on('messages-read', handleMessagesRead);
        socket.on('message-deleted-for-everyone', handleMessageDeleted);

        return () => {
            socket.off('dm-received', handleDMReceived);
            socket.off('messages-read', handleMessagesRead);
            socket.off('message-deleted-for-everyone', handleMessageDeleted);
        };
    }, [user, userId]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Close delete menu
    useEffect(() => {
        const handleClickOutside = () => setDeleteMenuOpen(null);
        if (deleteMenuOpen) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [deleteMenuOpen]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !userId) return;

        setSending(true);
        try {
            socket.emit('send-dm', {
                familyId: user.familyId,
                senderId: user.id,
                recipientId: userId,
                message: newMessage.trim()
            });
            setNewMessage('');
        } catch (err) {
            console.error('Error sending message:', err);
        } finally {
            setSending(false);
        }
    };

    const handleDeleteForEveryone = async (messageId: string) => {
        try {
            await api.delete(`/chat/messages/${messageId}/for-everyone`);
            setDeleteMenuOpen(null);
        } catch (err: any) {
            console.error('Error deleting message:', err);
            alert(err.response?.data?.message || 'Failed to delete message');
        }
    };

    const handleDeleteForMe = async (messageId: string) => {
        try {
            await api.delete(`/chat/messages/${messageId}/for-me`);
            setDeleteMenuOpen(null);
            setMessages((prev) =>
                prev.map(msg =>
                    msg._id === messageId
                        ? { ...msg, deletedBy: [...(msg.deletedBy || []), user!.id] }
                        : msg
                )
            );
        } catch (err: any) {
            console.error('Error deleting message:', err);
            alert(err.response?.data?.message || 'Failed to delete message');
        }
    };

    const isMessageDeleted = (msg: Message) => {
        if (msg.deletedForEveryone) return true;
        if (msg.deletedBy?.includes(user!.id)) return true;
        return false;
    };

    const getReadStatus = (msg: Message) => {
        if (!msg.readBy || msg.readBy.length === 0) return null;
        const otherUserRead = msg.readBy.find(r => r.user === userId);
        if (otherUserRead) {
            const readTime = new Date(otherUserRead.readAt);
            const timeStr = readTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            return `อ่าน ${timeStr}`;
        }
        return null;
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-brown-50 to-orange-50 flex items-center justify-center">
                <div className="text-brown-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-brown-50 to-orange-50">
            <div className="max-w-4xl mx-auto p-4">
                {/* Header */}
                <div className="bg-white rounded-t-2xl shadow-sm p-4 border-b border-brown-100">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/chat')}
                            className="p-2 hover:bg-brown-50 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-brown-600" />
                        </button>
                        {otherUser && (
                            <>
                                <div className="w-10 h-10 bg-gradient-to-br from-brown-500 to-brown-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {otherUser.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900">{otherUser.name}</h2>
                                    <p className="text-sm text-gray-500">{otherUser.email}</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Messages */}
                <div className="bg-white shadow-sm min-h-[calc(100vh-280px)] max-h-[calc(100vh-280px)] overflow-y-auto p-6 space-y-4">
                    {loadingMessages ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="text-brown-600">Loading messages...</div>
                        </div>
                    ) : (
                        <>
                            {messages.filter(msg => !isMessageDeleted(msg)).map((msg) => {
                                const isOwn = msg.sender._id === user.id;
                                const readStatus = isOwn ? getReadStatus(msg) : null;

                                return (
                                    <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                                            {!isOwn && (
                                                <p className="text-xs text-gray-500 mb-1 px-2">{msg.sender.name}</p>
                                            )}
                                            <div className="relative group">
                                                <div className={`rounded-2xl p-3 ${msg.deletedForEveryone
                                                        ? 'bg-gray-100 border border-gray-300 italic'
                                                        : isOwn
                                                            ? 'bg-brown-600 text-white rounded-br-none'
                                                            : 'bg-white border border-brown-200 rounded-bl-none'
                                                    }`}>
                                                    <p className={`text-sm break-words ${msg.deletedForEveryone ? 'text-gray-500' : ''}`}>
                                                        {msg.deletedForEveryone ? '🚫 Message deleted' : msg.message}
                                                    </p>
                                                    <p className={`text-xs mt-1 ${isOwn ? 'text-brown-100' : 'text-gray-400'}`}>
                                                        {formatTime(msg.timestamp)}
                                                    </p>
                                                    {readStatus && (
                                                        <p className="text-xs mt-1 text-brown-100 flex items-center gap-1">
                                                            <CheckCheck className="w-3 h-3" />
                                                            {readStatus}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Delete button */}
                                                {!msg.deletedForEveryone && (
                                                    <div className="absolute top-0 right-0 -mt-2 -mr-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeleteMenuOpen(deleteMenuOpen === msg._id ? null : msg._id);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 bg-gray-700 hover:bg-gray-800 text-white p-1.5 rounded-full transition-all shadow-md"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>

                                                        {deleteMenuOpen === msg._id && (
                                                            <div
                                                                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-10"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {isOwn && (
                                                                    <button
                                                                        onClick={() => handleDeleteForEveryone(msg._id)}
                                                                        className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 font-medium border-b border-gray-100 rounded-t-lg transition-colors"
                                                                    >
                                                                        Delete for Everyone
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleDeleteForMe(msg._id)}
                                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700 font-medium rounded-b-lg transition-colors"
                                                                >
                                                                    Delete for Me
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Message input */}
                <div className="bg-white rounded-b-2xl shadow-sm p-4 border-t border-brown-100">
                    <form onSubmit={sendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-3 border border-brown-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                            disabled={sending}
                        />
                        <button
                            type="submit"
                            disabled={sending || !newMessage.trim()}
                            className="px-6 py-3 bg-gradient-to-r from-brown-600 to-brown-700 text-white rounded-xl hover:from-brown-700 hover:to-brown-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                            {sending ? (
                                <>Loading...</>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Send
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
