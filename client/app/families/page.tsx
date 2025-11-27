'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Users, ArrowRight } from 'lucide-react';

export default function FamiliesPage() {
    const { user, loading, updateUser } = useAuth();
    const router = useRouter();
    const [families, setFamilies] = useState<any[]>([]);
    const [loadingFamilies, setLoadingFamilies] = useState(true);
    const [inviteCode, setInviteCode] = useState('');
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/');
            return;
        }

        // If user already has a family, redirect to dashboard
        if (!loading && user?.familyId) {
            router.replace('/dashboard');
            return;
        }

        if (!loading && user && !user.familyId) {
            fetchFamilies();
        }
    }, [loading, user]);

    const fetchFamilies = async () => {
        try {
            const res = await api.get('/family/list');
            setFamilies(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingFamilies(false);
        }
    };

    const handleJoinFamily = async () => {
        if (!inviteCode) return;
        setJoining(true);
        try {
            const res = await api.post('/family/join', { inviteCode });

            // Update local user state
            if (user) {
                updateUser({ ...user, familyId: res.data.family._id, role: 'member' });
            }

            alert('เข้าร่วมครอบครัวสำเร็จ!');
            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'เข้าร่วมครอบครัวไม่สำเร็จ');
        } finally {
            setJoining(false);
        }
    };

    if (loading || loadingFamilies) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">กำลังโหลด...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">ค้นหาครอบครัวของคุณ</h1>
                    <p className="text-gray-600">
                        เข้าร่วมครอบครัวที่มีอยู่หรือสร้างใหม่เพื่อเริ่มต้น
                    </p>
                </div>

                {families.length === 0 ? (
                    <div className="text-center space-y-6">
                        <div className="bg-white p-12 rounded-2xl shadow-lg border border-gray-100">
                            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">ยังไม่มีครอบครัว</h2>
                            <p className="text-gray-600 mb-6">
                                ไม่มีครอบครัวที่ว่างอยู่ สร้างครอบครัวเพื่อเริ่มต้น!
                            </p>
                            <Link
                                href="/register"
                                className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                สร้างครอบครัว
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {families.map((family) => (
                                <div
                                    key={family._id}
                                    className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                                                <Users className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900">{family.name}</h3>
                                                <p className="text-sm text-gray-500">กลุ่มครอบครัว</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="text-center pt-8">
                            <p className="text-gray-600 mb-4">ไม่เห็นครอบครัวของคุณ? ใช้รหัสเชิญเพื่อเข้าร่วม</p>
                            <div className="max-w-md mx-auto flex gap-2">
                                <input
                                    type="text"
                                    placeholder="ป้อนรหัสเชิญ"
                                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-black"
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                />
                                <button
                                    onClick={handleJoinFamily}
                                    disabled={!inviteCode || joining}
                                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {joining ? 'กำลังเข้าร่วม...' : 'เข้าร่วม'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
