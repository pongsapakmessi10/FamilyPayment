import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Animated, Dimensions, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { socket } from '../lib/socket';
import { Send, Menu, X, Users, MessageCircle, ArrowLeft } from 'lucide-react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

interface Message {
    _id: string;
    text?: string;
    message?: string; // Backend might send 'message' or 'text'
    sender: { _id: string; name: string };
    createdAt?: string;
    timestamp?: string; // Web uses 'timestamp'
    messageType?: 'group' | 'dm';
    conversationId?: string;
}

interface FamilyMember {
    _id: string; // User ID
    name: string;
    email: string;
}

type ChatMode = 'group' | 'dm';

export default function ChatScreen({ route }: any) {
    const { user } = useAuth();
    const [chatMode, setChatMode] = useState<ChatMode>('group');
    const [selectedUser, setSelectedUser] = useState<FamilyMember | null>(null);

    // Messages State
    const [groupMessages, setGroupMessages] = useState<Message[]>([]);
    const [dmMessages, setDmMessages] = useState<Message[]>([]);

    // Deep Linking Handler
    useEffect(() => {
        if (route.params?.mode === 'dm' && route.params?.recipientId) {
            setChatMode('dm');
            setSelectedUser({
                _id: route.params.recipientId,
                name: route.params.recipientName || 'User',
                email: ''
            });
        }
    }, [route.params]);

    // Data State
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputText, setInputText] = useState('');

    // UI State
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const flatListRef = useRef<FlatList>(null);

    // Unread counts per user (userId -> count)
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

    // Initial Load
    useEffect(() => {
        if (user?.familyId) {
            socket.emit('join-family-chat', user.familyId);
            socket.emit('join-user-room', user.id); // Join for badge notifications
            fetchMembers();
            fetchGroupMessages();
            fetchUnreadCounts();
        }
    }, [user?.familyId]);

    // Handle Socket Events
    useEffect(() => {
        const handleGroupMessage = (message: Message) => {
            if (message.messageType === 'group' || !message.messageType) {
                setGroupMessages(prev => [...prev, normalizeMessage(message)]);
                if (chatMode === 'group') scrollToBottom();
            }
        };

        const handleDMReceived = (message: Message) => {
            // Only update if we are chatting with this user
            // Simplify: Just append to local DM store if needed, or re-fetch?
            // For now, let's just append if it matches selected User
            if (message.messageType === 'dm') {
                // We need logic to route this to the right conversation, 
                // but for MVP let's just update if we are in that chat
                setDmMessages(prev => [...prev, normalizeMessage(message)]);
                if (chatMode === 'dm') scrollToBottom();
            }
        };

        const handleBadgeUpdate = () => {
            console.log('🔔 Badge update event received, refreshing unread counts...');
            fetchUnreadCounts();
        };

        socket.on('message-received', handleGroupMessage);
        socket.on('dm-received', handleDMReceived);
        socket.on('dm-notification', handleBadgeUpdate);
        socket.on('messages-read', handleBadgeUpdate);

        return () => {
            socket.off('message-received', handleGroupMessage);
            socket.off('dm-received', handleDMReceived);
            socket.off('dm-notification', handleBadgeUpdate);
            socket.off('messages-read', handleBadgeUpdate);
        };
    }, [chatMode, selectedUser]);

    // Fetch DMs when switching user
    useEffect(() => {
        if (chatMode === 'dm' && selectedUser) {
            fetchDMMessages(selectedUser._id);
            socket.emit('join-dm-room', {
                userId1: user?.id,
                userId2: selectedUser._id
            });
        }
    }, [chatMode, selectedUser]);

    // Sidebar Animation
    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: sidebarOpen ? 0 : -SIDEBAR_WIDTH,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [sidebarOpen]);

    const normalizeMessage = (msg: any): Message => ({
        ...msg,
        text: msg.message || msg.text,
        createdAt: msg.timestamp || msg.createdAt
    });

    const fetchMembers = async () => {
        try {
            const res = await api.get('/users');
            setFamilyMembers(res.data.filter((m: FamilyMember) => m._id !== user?.id));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchGroupMessages = async () => {
        try {
            const res = await api.get('/chat/messages?type=group');
            setGroupMessages(res.data.map(normalizeMessage));
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchUnreadCounts = async () => {
        try {
            const res = await api.get('/chat/conversations');
            const counts: Record<string, number> = {};
            res.data.forEach((conv: any) => {
                counts[conv.otherUser._id] = conv.unreadCount;
            });
            setUnreadCounts(counts);
        } catch (err) {
            console.error('Error fetching unread counts:', err);
        }
    };

    const fetchDMMessages = async (otherUserId: string) => {
        setLoading(true);
        try {
            const res = await api.get(`/chat/messages/${otherUserId}`);
            setDmMessages(res.data.map(normalizeMessage));

            // Mark messages as read automatically
            await markMessagesAsRead(otherUserId);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const markMessagesAsRead = async (otherUserId: string) => {
        try {
            const conversationId = [user?.id, otherUserId].sort().join('_');
            await api.post('/chat/mark-read', { conversationId });
            console.log(`✅ Marked messages as read for conversation: ${conversationId}`);

            // Update local unread count immediately
            setUnreadCounts(prev => ({
                ...prev,
                [otherUserId]: 0
            }));
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim() || !user) return;
        const text = inputText.trim();
        setInputText('');

        try {
            if (chatMode === 'group') {
                socket.emit('send-message', {
                    familyId: user.familyId,
                    senderId: user.id,
                    senderName: user.name,
                    message: text
                });
            } else if (chatMode === 'dm' && selectedUser) {
                socket.emit('send-dm', {
                    familyId: user.familyId,
                    senderId: user.id,
                    recipientId: selectedUser._id,
                    message: text
                });
            }
        } catch (err) {
            console.error(err);
            setInputText(text);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    const selectGroupChat = () => {
        setChatMode('group');
        setSelectedUser(null);
        setSidebarOpen(false);
    };

    const selectDM = (member: FamilyMember) => {
        setChatMode('dm');
        setSelectedUser(member);
        setSidebarOpen(false);
    };



    const handleDeleteMessage = (message: Message) => {
        Alert.alert(
            "Delete Message",
            "Choose specific delete method",
            [
                {
                    text: "Delete for Everyone",
                    onPress: async () => {
                        try {
                            await api.delete(`/chat/messages/${message._id}/for-everyone`);
                        } catch (err: any) {
                            Alert.alert("Error", err.response?.data?.message || "Failed to delete");
                        }
                    }
                },
                {
                    text: "Delete for You",
                    onPress: async () => {
                        try {
                            await api.delete(`/chat/messages/${message._id}/for-me`);
                            // Update local state immediately for "For Me"
                            if (chatMode === 'group') {
                                setGroupMessages(prev => prev.filter(m => m._id !== message._id));
                            } else {
                                setDmMessages(prev => prev.filter(m => m._id !== message._id));
                            }
                        } catch (err: any) {
                            Alert.alert("Error", err.response?.data?.message || "Failed to delete");
                        }
                    }
                },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    // Socket Event for "Delete for Everyone"
    useEffect(() => {
        const handleDeletedForEveryone = (data: { messageId: string }) => {
            // Remove the message entirely or mark it as deleted?
            // Usually we remove it from the list or show "This message was deleted"
            // For now, let's remove it locally to match typical real-time behavior
            setGroupMessages(prev => prev.filter(m => m._id !== data.messageId));
            setDmMessages(prev => prev.filter(m => m._id !== data.messageId));
        };

        socket.on('message-deleted-for-everyone', handleDeletedForEveryone);

        return () => {
            socket.off('message-deleted-for-everyone', handleDeletedForEveryone);
        };
    }, []);

    const renderMessageItem = ({ item }: { item: Message }) => {
        const isMe = item.sender._id === user?.id;

        return (
            <Pressable
                onLongPress={() => isMe ? handleDeleteMessage(item) : null}
                style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}
            >
                {!isMe && chatMode === 'group' && <Text style={styles.senderName}>{item.sender.name}</Text>}
                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                    {item.text}
                </Text>
                <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.theirTimeText]}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>
            </Pressable>
        );
    };

    const messages = chatMode === 'group' ? groupMessages : dmMessages;
    const chatTitle = chatMode === 'group' ? 'Family Chat' : selectedUser?.name || 'Chat';

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={toggleSidebar} style={styles.menuBtn}>
                    <Menu color="#333" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>{chatTitle}</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Sidebar (Drawer) */}
            {sidebarOpen && (
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setSidebarOpen(false)}
                />
            )}
            <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
                <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
                    <View style={styles.sidebarHeader}>
                        <Text style={styles.sidebarTitle}>Members</Text>
                        <TouchableOpacity onPress={() => setSidebarOpen(false)}>
                            <X color="#666" size={24} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.sidebarItem, chatMode === 'group' && styles.sidebarItemActive]}
                        onPress={selectGroupChat}
                    >
                        <Users size={20} color={chatMode === 'group' ? '#4f46e5' : '#666'} />
                        <Text style={[styles.sidebarItemText, chatMode === 'group' && styles.sidebarItemTextActive]}>
                            Family Group
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.sectionHeader}>Direct Messages</Text>

                    <FlatList
                        data={familyMembers}
                        keyExtractor={item => item._id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.sidebarItem, selectedUser?._id === item._id && styles.sidebarItemActive]}
                                onPress={() => selectDM(item)}
                            >
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{item.name[0]}</Text>
                                </View>
                                <Text style={[styles.sidebarItemText, selectedUser?._id === item._id && styles.sidebarItemTextActive]}>
                                    {item.name}
                                </Text>
                                {unreadCounts[item._id] > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{unreadCounts[item._id]}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </SafeAreaView>
            </Animated.View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                {/* Chat Area */}
                {loading ? (
                    <ActivityIndicator style={styles.center} size="large" color="#4f46e5" />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessageItem}
                        keyExtractor={item => item._id || Math.random().toString()}
                        contentContainerStyle={styles.list}
                        onContentSizeChange={scrollToBottom}
                        onLayout={scrollToBottom}
                    />
                )}

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={chatMode === 'dm' ? `Message ${selectedUser?.name}...` : "Type a message..."}
                        placeholderTextColor="gray"
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                        onPress={sendMessage}
                        disabled={!inputText.trim()}
                    >
                        <Send size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f6f7f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10
    },
    menuBtn: { padding: 4 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#333' },

    // Sidebar Styles
    overlay: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 20
    },
    sidebar: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0,
        width: SIDEBAR_WIDTH,
        backgroundColor: 'white',
        zIndex: 21,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sidebarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    sidebarTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    sidebarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    sidebarItemActive: {
        backgroundColor: '#f0fdf4', // Light green/blue
        borderRightWidth: 3,
        borderRightColor: '#4f46e5'
    },
    sidebarItemText: { fontSize: 16, color: '#666', fontWeight: '500' },
    sidebarItemTextActive: { color: '#4f46e5', fontWeight: 'bold' },
    sectionHeader: {
        padding: 16,
        paddingBottom: 8,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#999',
        textTransform: 'uppercase'
    },
    avatar: {
        width: 32, height: 32,
        borderRadius: 16,
        backgroundColor: '#e0e7ff',
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarText: { color: '#4f46e5', fontWeight: 'bold' },

    // Chat Styles
    list: { padding: 16, paddingBottom: 20 },
    messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
    myMessage: { alignSelf: 'flex-end', backgroundColor: '#4f46e5', borderBottomRightRadius: 4 },
    theirMessage: { alignSelf: 'flex-start', backgroundColor: 'white', borderBottomLeftRadius: 4 },
    senderName: { fontSize: 12, color: '#666', marginBottom: 4, fontWeight: '600' },
    messageText: { fontSize: 16 },
    myMessageText: { color: 'white' },
    theirMessageText: { color: '#333' },
    timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    myTimeText: { color: 'rgba(255,255,255,0.7)' },
    theirTimeText: { color: '#999' },
    inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee', alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, maxHeight: 100 },
    badge: {
        backgroundColor: '#ef4444',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        marginLeft: 'auto'
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold'
    },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { backgroundColor: '#ccc' }
});
