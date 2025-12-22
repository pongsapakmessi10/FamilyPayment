import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Share2, User, Copy } from 'lucide-react-native';

interface Member {
    _id: string;
    name: string;
    email: string;
    role: string;
}

export default function MembersScreen() {
    const { user } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFamilyInfo();
    }, []);

    const fetchFamilyInfo = async () => {
        try {
            const res = await api.get('/family/info');
            setMembers(res.data.members);
            setInviteCode(res.data.inviteCode);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to fetch family info');
        } finally {
            setLoading(false);
        }
    };

    const handleShareCode = async () => {
        try {
            await Share.share({
                message: `Join my family on FamilyPayment! Use invite code: ${inviteCode}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const renderItem = ({ item }: { item: Member }) => {
        if (!item) return null;
        return (
            <View style={styles.card}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name} {user?.id === item._id && '(You)'}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                </View>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{item.role}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Family Members</Text>
            </View>

            {loading ? (
                <ActivityIndicator style={styles.center} />
            ) : (
                <>
                    <View style={styles.inviteCard}>
                        <View>
                            <Text style={styles.inviteLabel}>Invite Code</Text>
                            <Text style={styles.inviteCode}>{inviteCode}</Text>
                        </View>
                        <TouchableOpacity style={styles.shareBtn} onPress={handleShareCode}>
                            <Share2 size={24} color="#4f46e5" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={members}
                        renderItem={renderItem}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.list}
                        ListHeaderComponent={<Text style={styles.sectionTitle}>Members ({members.length})</Text>}
                    />
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f6f7f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
    title: { fontSize: 20, fontWeight: 'bold' },
    inviteCard: { margin: 16, padding: 20, backgroundColor: '#e0e7ff', borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#c7d2fe' },
    inviteLabel: { fontSize: 12, color: '#4f46e5', fontWeight: '600', textTransform: 'uppercase' },
    inviteCode: { fontSize: 24, fontWeight: 'bold', color: '#312e81', marginTop: 4 },
    shareBtn: { width: 48, height: 48, backgroundColor: 'white', borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#666', marginBottom: 12, marginLeft: 4 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    avatarText: { fontSize: 20, fontWeight: 'bold', color: '#4b5563' },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: '#333' },
    email: { fontSize: 14, color: '#666' },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#f3f4f6', borderRadius: 6 },
    roleText: { fontSize: 12, color: '#4b5563', textTransform: 'capitalize' }
});
