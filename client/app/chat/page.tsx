'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';
import api from '@/lib/api';
import { Send, Users, User, MessageCircle, Loader2, ArrowLeft, Trash2, MoreVertical } from 'lucide-react';

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

interface FamilyMember {
    _id: string;
    name: string;
    email: string;
}

interface Conversation {
    conversationId: string;
    otherUser: {
        _id: string;
        name: string;
        email: string;
    };
    lastMessage: Message;
    unreadCount: number;
}

type ChatMode = 'group' | 'dm';

export default function ChatPage() {
    const { user, isAuthenticated, loading } = useAuth();
    const router = useRouter();

    // Chat mode state
    const [chatMode, setChatMode] = useState<ChatMode>('group');

    // Group chat state
    const [groupMessages, setGroupMessages] = useState<Message[]>([]);

    // DM state
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedUser, setSelectedUser] = useState<FamilyMember | null>(null);
    const [dmMessages, setDmMessages] = useState<Message[]>([]);
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

    // UI state
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [deleteMenuOpen, setDeleteMenuOpen] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [loading, isAuthenticated, router]);

    // Load family members for DM list
    useEffect(() => {
        if (!user?.familyId) return;

        const loadFamilyMembers = async () => {
            try {
                const res = await api.get('/users');
                const members = res.data.filter((member: FamilyMember) => member._id !== user.id);
                setFamilyMembers(members);
            } catch (err) {
                console.error('Error loading family members:', err);
            }
        };

        loadFamilyMembers();
    }, [user]);

    // Load group messages
    useEffect(() => {
        if (!user?.familyId || chatMode !== 'group') return;

        const loadGroupMessages = async () => {
            setLoadingMessages(true);
            try {
                const res = await api.get('/chat/messages?type=group');
                setGroupMessages(res.data);
            } catch (err) {
                console.error('Error loading group messages:', err);
            } finally {
                setLoadingMessages(false);
            }
        };

        loadGroupMessages();
    }, [user, chatMode]);

    // Load DM conversations
    useEffect(() => {
        if (!user?.familyId || chatMode !== 'dm') return;

        const loadConversations = async () => {
            setLoadingMessages(true);
            try {
                const res = await api.get('/chat/conversations');
                setConversations(res.data);
            } catch (err) {
                console.error('Error loading conversations:', err);
            } finally {
                setLoadingMessages(false);
            }
        };

        loadConversations();
    }, [user, chatMode]);

    // Load DM messages when a user is selected
    useEffect(() => {
        if (!selectedUser || !user) return;

        const loadDMMessages = async () => {
            setLoadingMessages(true);
            try {
                const res = await api.get(`/chat/messages/${selectedUser._id}`);
                setDmMessages(res.data);
            } catch (err) {
                console.error('Error loading DM messages:', err);
            } finally {
                setLoadingMessages(false);
            }
        };

        loadDMMessages();
    }, [selectedUser, user]);

    // Join chat rooms and listen for messages
    useEffect(() => {
        if (!user?.familyId) return;

        // Join family chat room for group messages
        socket.emit('join-family-chat', user.familyId);

        // Listen for incoming group messages
        const handleGroupMessage = (message: Message) => {
            if (message.messageType === 'group') {
                setGroupMessages((prev) => [...prev, message]);
            }
        };

        // Listen for incoming DMs
        const handleDMReceived = (message: Message) => {
            if (message.messageType === 'dm') {
                // Update DM messages if viewing this conversation
                if (selectedUser && message.conversationId) {
                    const conversationId = getConversationId(user.id, selectedUser._id);
                    if (message.conversationId === conversationId) {
                        setDmMessages((prev) => [...prev, message]);
                    }
                }

                // Update conversations list
                setConversations((prev) => {
                    const updated = [...prev];
                    const index = updated.findIndex(c => c.conversationId === message.conversationId);

                    if (index >= 0) {
                        // Update existing conversation
                        updated[index].lastMessage = message;
                        if (message.sender._id !== user.id) {
                            updated[index].unreadCount += 1;
                        }
                        // Move to top
                        const [conversation] = updated.splice(index, 1);
                        updated.unshift(conversation);
                    } else {
                        // Add new conversation
                        const otherUser = message.sender._id === user.id ? message.recipient! : message.sender;
                        updated.unshift({
                            conversationId: message.conversationId!,
                            otherUser,
                            lastMessage: message,
                            unreadCount: message.sender._id !== user.id ? 1 : 0
                        });
                    }

                    return updated;
                });
            }
        };

        // Listen for message deleted for everyone
        const handleMessageDeletedForEveryone = (data: { messageId: string }) => {
            const updateMessages = (messages: Message[]) =>
                messages.map(msg =>
                    msg._id === data.messageId
                        ? { ...msg, deletedForEveryone: true }
                        : msg
                );

            setGroupMessages(updateMessages);
            setDmMessages(updateMessages);
        };

        socket.on('message-received', handleGroupMessage);
        socket.on('dm-received', handleDMReceived);
        socket.on('message-deleted-for-everyone', handleMessageDeletedForEveryone);

        return () => {
            socket.off('message-received', handleGroupMessage);
            socket.off('dm-received', handleDMReceived);
            socket.off('message-deleted-for-everyone', handleMessageDeletedForEveryone);
        };
    }, [user, selectedUser]);

    // Join DM room when a conversation is selected
    useEffect(() => {
        if (!selectedUser || !user) return;

        socket.emit('join-dm-room', {
            userId1: user.id,
            userId2: selectedUser._id
        });
    }, [selectedUser, user]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [groupMessages, dmMessages]);

    // Close delete menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setDeleteMenuOpen(null);
        if (deleteMenuOpen) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [deleteMenuOpen]);

    const getConversationId = (userId1: string, userId2: string) => {
        return [userId1, userId2].sort().join('_');
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newMessage.trim() || !user) return;

        setSending(true);

        try {
            if (chatMode === 'group') {
                // Send group message
                socket.emit('send-message', {
                    familyId: user.familyId,
                    senderId: user.id,
                    senderName: user.name,
                    message: newMessage.trim()
                });
            } else if (chatMode === 'dm' && selectedUser) {
                // Send DM
                socket.emit('send-dm', {
                    familyId: user.familyId,
                    senderId: user.id,
                    recipientId: selectedUser._id,
                    message: newMessage.trim()
                });
            }

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
            console.error('Error deleting message for everyone:', err);
            alert(err.response?.data?.message || 'ลบข้อความไม่สำเร็จ');
        }
    };

    const handleDeleteForMe = async (messageId: string) => {
        try {
            await api.delete(`/chat/messages/${messageId}/for-me`);
            setDeleteMenuOpen(null);

            // Remove message from local state
            const updateMessages = (messages: Message[]) =>
                messages.map(msg =>
                    msg._id === messageId
                        ? { ...msg, deletedBy: [...(msg.deletedBy || []), user!.id] }
                        : msg
                );

            setGroupMessages(updateMessages);
            setDmMessages(updateMessages);
        } catch (err: any) {
            console.error('Error deleting message for me:', err);
            alert(err.response?.data?.message || 'ลบข้อความไม่สำเร็จ');
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const handleModeChange = (mode: ChatMode) => {
        setChatMode(mode);
        setSelectedUser(null);
        setDmMessages([]);
    };

    const handleUserSelect = (member: FamilyMember) => {
        router.push(`/chat/${member._id}`);
    };

    const isMessageDeleted = (msg: Message) => {
        if (msg.deletedForEveryone) return true;
        if (msg.deletedBy?.includes(user!.id)) return true;
        return false;
    };

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-brown-600" />
            </div>
        );
    }

    const currentMessages = chatMode === 'group' ? groupMessages : dmMessages;
    const showMessageList = chatMode === 'group' || (chatMode === 'dm' && selectedUser);

    return (
        <div className="flex flex-col h-screen bg-brown-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-brown-600 to-brown-700 text-white p-4 shadow-lg">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            {chatMode === 'dm' && selectedUser && (
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold">
                                    {chatMode === 'group'
                                        ? 'แชทครอบครัว'
                                        : selectedUser
                                            ? selectedUser.name
                                            : 'ข้อความส่วนตัว'}
                                </h1>
                                <p className="text-sm text-brown-100">
                                    {chatMode === 'group'
                                        ? 'เชื่อมต่อกับครอบครัวของคุณ'
                                        : selectedUser
                                            ? selectedUser.email
                                            : 'เลือกสมาชิกในครอบครัวเพื่อแชท'}
                                </p>
                            </div>
                        </div>
                        {chatMode === 'group' && (
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Users className="w-4 h-4" />
                                <span className="text-sm font-medium">กลุ่ม</span>
                            </div>
                        )}
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex gap-2 bg-white/10 p-1 rounded-lg">
                        <button
                            onClick={() => handleModeChange('group')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all ${chatMode === 'group'
                                ? 'bg-white text-brown-700 font-semibold shadow-md'
                                : 'text-white hover:bg-white/10'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            <span>แชทกลุ่ม</span>
                        </button>
                        <button
                            onClick={() => handleModeChange('dm')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all ${chatMode === 'dm'
                                ? 'bg-white text-brown-700 font-semibold shadow-md'
                                : 'text-white hover:bg-white/10'
                                }`}
                        >
                            <MessageCircle className="w-4 h-4" />
                            <span>ข้อความส่วนตัว</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
                {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-brown-600" />
                    </div>
                ) : chatMode === 'dm' && !selectedUser ? (
                    // DM User Selection List
                    <div className="space-y-2">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 px-2">สมาชิกในครอบครัว</h2>

                        {/* Show existing conversations first */}
                        {conversations.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-600 mb-2 px-2">การสนทนาล่าสุด</h3>
                                {conversations.map((conv) => (
                                    <button
                                        key={conv.conversationId}
                                        onClick={() => handleUserSelect(conv.otherUser)}
                                        className="w-full bg-white border border-brown-200 rounded-xl p-4 hover:shadow-md transition-all flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gradient-to-br from-brown-500 to-brown-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                {conv.otherUser.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="text-left">
                                                <p className="font-semibold text-gray-900 group-hover:text-brown-700">
                                                    {conv.otherUser.name}
                                                </p>
                                                <p className="text-sm text-gray-500 truncate max-w-xs">
                                                    {conv.lastMessage.message}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-xs text-gray-400">
                                                {formatTime(conv.lastMessage.timestamp)}
                                            </span>
                                            {conv.unreadCount > 0 && (
                                                <span className="bg-brown-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* All family members */}
                        <h3 className="text-sm font-semibold text-gray-600 mb-2 px-2">สมาชิกในครอบครัวทั้งหมด</h3>
                        {familyMembers.map((member) => (
                            <button
                                key={member._id}
                                onClick={() => handleUserSelect(member)}
                                className="w-full bg-white border border-brown-200 rounded-xl p-4 hover:shadow-md transition-all flex items-center gap-3 group"
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-brown-400 to-brown-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-gray-900 group-hover:text-brown-700">
                                        {member.name}
                                    </p>
                                    <p className="text-sm text-gray-500">{member.email}</p>
                                </div>
                            </button>
                        ))}

                        {familyMembers.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>ไม่พบสมาชิกในครอบครัวคนอื่น</p>
                            </div>
                        )}
                    </div>
                ) : currentMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="text-6xl mb-4">💬</div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">ยังไม่มีข้อความ</h2>
                        <p className="text-gray-600">
                            {chatMode === 'group'
                                ? 'เริ่มการสนทนากับครอบครัวของคุณ!'
                                : `เริ่มแชทกับ ${selectedUser?.name}!`}
                        </p>
                    </div>
                ) : (
                    // Messages Display
                    <div className="space-y-4">
                        {currentMessages.filter(msg => !isMessageDeleted(msg)).map((msg) => {
                            const isOwn = msg.sender._id === user.id;

                            return (
                                <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                                        {!isOwn && chatMode === 'group' && (
                                            <p className="text-xs text-gray-600 mb-1 ml-3">{msg.sender.name}</p>
                                        )}
                                        <div className="relative group">
                                            <div className={`rounded-2xl p-3 ${msg.deletedForEveryone
                                                ? 'bg-gray-100 border border-gray-300 italic'
                                                : isOwn
                                                    ? 'bg-brown-600 text-white rounded-br-none'
                                                    : 'bg-white border border-brown-200 rounded-bl-none'
                                                }`}>
                                                <p className={`text-sm break-words ${msg.deletedForEveryone ? 'text-gray-500' : ''}`}>
                                                    {msg.deletedForEveryone ? '🚫 ข้อความถูกลบ' : msg.message}
                                                </p>
                                                <p className={`text-xs mt-1 ${isOwn ? 'text-brown-100' : 'text-gray-500'}`}>
                                                    {formatTime(msg.timestamp)}
                                                </p>
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

                                                    {/* Delete Menu */}
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
                                                                    <div className="flex items-center gap-2">
                                                                        <Trash2 className="w-4 h-4" />
                                                                        <span>ลบสำหรับทุกคน</span>
                                                                    </div>
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteForMe(msg._id)}
                                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700 font-medium rounded-b-lg transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Trash2 className="w-4 h-4" />
                                                                    <span>ลบสำหรับฉัน</span>
                                                                </div>
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
                    </div>
                )}
            </div>

            {/* Input Container */}
            {showMessageList && (
                <div className="bg-white border-t border-brown-200 p-4 shadow-lg">
                    <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="พิมพ์ข้อความ..."
                            className="flex-1 px-4 py-3 border border-brown-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                            disabled={sending}
                            maxLength={1000}
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || sending}
                            className="px-6 py-3 bg-brown-600 text-white rounded-full hover:bg-brown-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                        >
                            {sending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    <span className="hidden sm:inline">ส่ง</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
