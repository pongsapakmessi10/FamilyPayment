'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/lib/api';
import { Users, Mail, Shield, User } from 'lucide-react';

interface Member {
    _id: string;
    name: string;
    email: string;
    role: 'moderator' | 'member';
}

export default function AllMembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [familyName, setFamilyName] = useState('');
    const [loading, setLoading] = useState(true);
    const { isAuthenticated, loading: authLoading, user } = useAuth();
    const router = useRouter();
    const { t } = useLanguage();

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.push('/');
            return;
        }

        fetchMembers();
    }, [isAuthenticated, authLoading, router]);

    const fetchMembers = async () => {
        try {
            const res = await api.get('/family/info');
            setMembers(res.data.members || []);
            setFamilyName(res.data.name || '');
        } catch (err) {
            console.error('Error fetching members:', err);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return <div className="p-8 text-center text-blue-600">{t('common.loading')}</div>;
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-blue-700">สมาชิกทั้งหมด</h1>
                <p className="text-blue-600">{familyName} • {members.length} {members.length === 1 ? 'สมาชิก' : 'สมาชิก'}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map((member) => (
                    <div
                        key={member._id}
                        className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-blue-100 hover:shadow-xl transition-shadow"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                                {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${member.role === 'moderator'
                                    ? 'bg-purple-100 text-purple-600'
                                    : 'bg-blue-100 text-blue-600'
                                    }`}
                            >
                                {member.role === 'moderator' ? (
                                    <div className="flex items-center gap-1">
                                        <Shield className="w-3 h-3" />
                                        ผู้ดูแล
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        สมาชิก
                                    </div>
                                )}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-blue-700">{member.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                                <Mail className="w-4 h-4" />
                                <span className="truncate">{member.email}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {members.length === 0 && (
                <div className="text-center py-12">
                    <Users className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                    <p className="text-blue-600">ไม่พบสมาชิก</p>
                </div>
            )}
        </div>
    );
}
