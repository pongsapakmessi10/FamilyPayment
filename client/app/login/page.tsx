'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import api from '@/lib/api';

import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { email: email.trim(), password });
            login(res.data.token, res.data.user);
        } catch (err: any) {
            const responseData = err.response?.data;

            if (responseData?.requiresVerification && responseData?.email) {
                router.push(`/verify-otp?email=${encodeURIComponent(responseData.email)}`);
                return;
            }

            if (responseData?.message === 'Invalid credentials') {
                setError('รหัสผ่านหรือผู้ใช้งานไม่ถูกต้อง');
            } else {
                setError(responseData?.message || 'เข้าสู่ระบบไม่สำเร็จ');
            }
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
                        <h2 className="text-3xl font-bold text-gray-900">ยินดีต้อนรับกลับ</h2>
                        <p className="mt-2 text-brown-600">เข้าสู่ระบบ Family Bank ของคุณ</p>
                    </div>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                type="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-blue-400 text-gray-900 rounded-t-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                                placeholder="อีเมล"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-blue-400 text-gray-900 rounded-b-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                                placeholder="รหัสผ่าน"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${loading ? 'bg-brown-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
                        >
                            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                        </button>
                    </div>
                </form>
                <div className="text-center text-sm">
                    <span className="text-brown-600">ยังไม่มีบัญชี? </span>
                    <Link href="/register" className="font-medium text-brown-600 hover:text-gray-500">
                        ลงทะเบียน
                    </Link>
                </div>
            </div>
        </div>
    );
}
