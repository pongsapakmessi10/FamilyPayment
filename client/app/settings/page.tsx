'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Copy, RefreshCw, Users, Trash2, Shield, UserCircle } from 'lucide-react';

export default function SettingsPage() {
    const { user, updateUser } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const [family, setFamily] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!user) {
            router.replace('/');
            return;
        }

        if (user?.role === 'moderator') {
            fetchFamilySettings();
        } else {
            // For members, just stop loading
            setLoading(false);
        }
    }, [user]);

    const fetchFamilySettings = async () => {
        try {
            const res = await api.get('/family/settings');
            setFamily(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateCode = async () => {
        if (!confirm('คุณแน่ใจหรือไม่? รหัสเก่าจะใช้งานไม่ได้อีกต่อไป')) return;
        try {
            const res = await api.post('/family/regenerate-code');
            setFamily((prev: any) => ({ ...prev, inviteCode: res.data.inviteCode }));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ ${userName}? การดำเนินการนี้ไม่สามารถย้อนกลับได้`)) return;

        try {
            await api.delete(`/family/member/${userId}`);
            fetchFamilySettings();
            alert('ลบผู้ใช้สำเร็จ');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'ลบผู้ใช้ไม่สำเร็จ');
        }
    };

    const handleChangeRole = async (userId: string, currentRole: string, userName: string) => {
        const newRole = currentRole === 'moderator' ? 'member' : 'moderator';

        if (!confirm(`เปลี่ยนบทบาทของ ${userName} เป็น ${newRole} หรือไม่?`)) return;

        try {
            await api.put(`/family/member/${userId}/role`, { role: newRole });
            fetchFamilySettings();
            alert('อัปเดตบทบาทสำเร็จ');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'อัปเดตบทบาทไม่สำเร็จ');
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(family.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLeaveFamily = async () => {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะออกจากครอบครัวนี้? ข้อมูลทั้งหมดของคุณจะถูกลบและไม่สามารถกู้คืนได้')) return;

        try {
            await api.post('/family/leave');

            // Update local user state
            if (user) {
                updateUser({ ...user, familyId: '' }); // Set to empty string or null equivalent
            }

            alert('คุณออกจากครอบครัวสำเร็จแล้ว');
            // Redirect to families list
            router.push('/families');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'ออกจากครอบครัวไม่สำเร็จ');
        }
    };

    if (loading) return <div className="p-8 text-center text-brown-600">{t('common.loading')}</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>

            {/* Moderator-only sections */}
            {user?.role === 'moderator' && family && (
                <>
                    {/* Invite Code Card */}
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-blue-100">
                        <h2 className="text-lg font-semibold text-blue-700 mb-4 flex items-center">
                            <Users className="w-5 h-5 mr-2" />
                            {t('settings.inviteCode')}
                        </h2>
                        <div className="flex items-center space-x-4">
                            <div className="bg-blue-50 px-4 py-2 rounded-lg text-xl font-mono font-bold tracking-wider text-blue-700">
                                {family.inviteCode}
                            </div>
                            <button
                                onClick={copyToClipboard}
                                className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
                                title={t('settings.copy')}
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleRegenerateCode}
                                className="p-2 text-blue-500 hover:text-red-600 transition-colors"
                                title={t('settings.regenerate')}
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                        {copied && <p className="text-green-600 text-sm mt-2">{t('settings.copied')}</p>}
                    </div>

                    {/* Members List */}
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-blue-100">
                        <h2 className="text-lg font-semibold text-blue-700 mb-4">{t('settings.members')}</h2>
                        <div className="space-y-4">
                            {family.members.map((member: any) => (
                                <div
                                    key={member._id}
                                    className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 bg-blue-50 rounded-xl border border-blue-100 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{member.name}</p>
                                            <p className="text-sm text-brown-600 truncate">{member.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 justify-end md:justify-start">
                                        {member._id !== user?.id ? (
                                            <button
                                                onClick={() => handleChangeRole(member._id, member.role, member.name)}
                                                className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1 transition-all hover:scale-105 ${member.role === 'moderator'
                                                    ? 'bg-blue-200 text-blue-800 hover:bg-blue-300'
                                                    : 'bg-brown-100 text-blue-700 hover:bg-blue-200'
                                                    }`}
                                                title="คลิกเพื่อเปลี่ยนบทบาท"
                                            >
                                                {member.role === 'moderator' ? (
                                                    <>
                                                        <Shield className="w-3 h-3" />
                                                        ผู้ดูแล
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserCircle className="w-3 h-3" />
                                                        สมาชิก
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <span className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1 ${member.role === 'moderator'
                                                ? 'bg-blue-200 text-blue-800'
                                                : 'bg-brown-100 text-blue-700'
                                                }`}>
                                                {member.role === 'moderator' ? (
                                                    <>
                                                        <Shield className="w-3 h-3" />
                                                        ผู้ดูแล (คุณ)
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserCircle className="w-3 h-3" />
                                                        สมาชิก (คุณ)
                                                    </>
                                                )}
                                            </span>
                                        )}

                                        {member._id !== user?.id && (
                                            <button
                                                onClick={() => handleDeleteUser(member._id, member.name)}
                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                title="ลบผู้ใช้"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Leave Family Section - Available to all users */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    พื้นที่อันตราย
                </h2>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800 mb-4">
                        การออกจากครอบครัวจะลบข้อมูลทั้งหมดของคุณอย่างถาวร รวมถึงรายการธุรกรรม ยอดเงิน และหนี้สิน การดำเนินการนี้ไม่สามารถย้อนกลับได้
                    </p>
                    <button
                        onClick={handleLeaveFamily}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    >
                        ออกจากครอบครัว
                    </button>
                </div>
            </div>
        </div>
    );
}
