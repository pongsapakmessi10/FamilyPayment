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
        <div className="space-y-4 md:space-y-8">
            <header className="bg-white/90 backdrop-blur card-mobile px-4 py-4 md:px-6 md:py-5 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-blue-700">สมาชิกทั้งหมด</h1>
                    <p className="text-blue-600 text-sm md:text-base">
                        {familyName} • {members.length} {members.length === 1 ? 'สมาชิก' : 'สมาชิก'}
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4 md:gap-6 max-w-6xl mx-auto">
                {members.map((member) => (
                    <div
                        key={member._id}
                        className="card-mobile bg-white/90 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-blue-100 hover:shadow-xl transition-shadow"
                    >
                        <div className="flex items-start justify-between mb-3 md:mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg md:text-xl">
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900">{member.name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-brown-600">
                                        <Mail className="w-4 h-4" />
                                        <span className="truncate">{member.email}</span>
                                    </div>
                                </div>
                            </div>
                            <span
                                className={`px-3 py-1 rounded-full text-[11px] md:text-xs font-semibold flex items-center gap-1 ${
                                    member.role === 'moderator'
                                        ? 'bg-blue-200 text-blue-800'
                                        : 'bg-brown-100 text-blue-700'
                                }`}
                            >
                                {member.role === 'moderator' ? (
                                    <>
                                        <Shield className="w-3 h-3" />
                                        ผู้ดูแล{user?.id === member._id ? ' (คุณ)' : ''}
                                    </>
                                ) : (
                                    <>
                                        <User className="w-3 h-3" />
                                        สมาชิก
                                    </>
                                )}
                            </span>
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
