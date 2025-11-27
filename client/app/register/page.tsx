'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import api from '@/lib/api';
import clsx from 'clsx';

export default function RegisterPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        familyName: '',
        inviteCode: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const endpoint = activeTab === 'create' ? '/auth/register-owner' : '/auth/register-member';

        try {
            const res = await api.post(endpoint, formData);
            console.log('Registration response:', res.data);

            if (res.data.email) {
                // Redirect to OTP verification page
                const otpUrl = `/verify-otp?email=${encodeURIComponent(res.data.email)}`;
                console.log('Redirecting to:', otpUrl);
                router.push(otpUrl);
            } else {
                setError('ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่อีกครั้ง');
            }
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
            <div className="max-w-md w-full space-y-8 p-6 md:p-8 bg-white rounded-xl shadow-lg">
                <div>
                    <Link href="/" className="inline-flex items-center text-sm text-brown-600 hover:text-gray-500 mb-4">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        กลับสู่หน้าหลัก
                    </Link>
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-900">สร้างบัญชี</h2>
                        <p className="mt-2 text-brown-600">เข้าร่วมหรือเริ่มต้นธนาคารครอบครัวของคุณ</p>
                    </div>
                </div>

                <div className="flex border-b border-gray-200">
                    <button
                        className={clsx(
                            'w-1/2 py-2 text-center text-sm font-medium',
                            activeTab === 'create' ? 'border-b-2 border-gray-500 text-brown-600' : 'text-gray-400 hover:text-brown-600'
                        )}
                        onClick={() => setActiveTab('create')}
                    >
                        สร้างครอบครัว
                    </button>
                    <button
                        className={clsx(
                            'w-1/2 py-2 text-center text-sm font-medium',
                            activeTab === 'join' ? 'border-b-2 border-gray-500 text-brown-600' : 'text-gray-400 hover:text-brown-600'
                        )}
                        onClick={() => setActiveTab('join')}
                    >
                        เข้าร่วมครอบครัว
                    </button>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                type="text"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-t-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                                placeholder="ชื่อผู้ใช้"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                        <div>
                            <input
                                type="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                                placeholder="อีเมล"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                                placeholder="รหัสผ่าน"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                        {activeTab === 'create' ? (
                            <div>
                                <input
                                    type="text"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-b-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                                    placeholder="ชื่อครอบครัว"
                                    value={formData.familyName}
                                    onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="text"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-b-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                                    placeholder="รหัสเชิญ"
                                    value={formData.inviteCode}
                                    onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
                        >
                            {loading ? 'กำลังดำเนินการ...' : (activeTab === 'create' ? 'สร้างครอบครัว' : 'เข้าร่วมครอบครัว')}
                        </button>
                    </div>
                </form>
                <div className="text-center text-sm">
                    <span className="text-brown-600">มีบัญชีอยู่แล้ว? </span>
                    <Link href="/login" className="font-medium text-brown-600 hover:text-gray-500">
                        เข้าสู่ระบบ
                    </Link>
                </div>
            </div>
        </div>
    );
}
