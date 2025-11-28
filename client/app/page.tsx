'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { socket } from '@/lib/socket';
import { Copy, Check, Users as UsersIcon } from 'lucide-react';

export default function LandingPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      return;
    }

    if (!loading && !isAuthenticated && user) {
      if (user.familyId) {
        fetchFamilyData();
      }

      if (user.familyId) {
        socket.emit('join-family', user.familyId);
      }

      socket.on('member-joined', (newMember) => setMembers((prev) => [...prev, newMember]));

      return () => {
        socket.off('member-joined');
      };
    }
  }, [loading, isAuthenticated, user]);

  const fetchFamilyData = async () => {
    if (!user?.familyId) return;

    try {
      const endpoint = user.role === 'moderator' ? '/family/settings' : '/family/info';
      const res = await api.get(endpoint);

      if (res.data) {
        setFamilyName(res.data.name || '');
        setMembers(res.data.members || []);

        if (user.role === 'moderator') {
          setInviteCode(res.data.inviteCode || '');
        }
      }
    } catch (err) {
      console.error('Error fetching family data:', err);
      setFamilyName('');
      setInviteCode('');
      setMembers([]);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateCode = async () => {
    try {
      const res = await api.post('/family/regenerate-code');
      setInviteCode(res.data.inviteCode);
    } catch (err) {
      console.error('Error regenerating code:', err);
    }
  };

  useEffect(() => {
    if (!loading && isAuthenticated && user?.familyId) {
      router.replace('/dashboard');
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
              ยินดีต้อนรับสู่ <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Family Banks</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              จัดการการเงินของครอบครัวร่วมกัน ติดตามค่าใช้จ่าย จัดการหนี้สิน และบรรลุเป้าหมายไปด้วยกัน
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Link
                href="/register"
                className="px-8 py-4 bg-gradient-to-r from-brown-500 to-brown-700 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                เริ่มต้นใช้งาน
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 bg-white text-brown-600 font-semibold rounded-xl hover:bg-brown-50 transition-all border-2 border-brown-600 shadow-md hover:shadow-lg"
              >
                เข้าสู่ระบบ
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-brown-100 hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">ติดตามค่าใช้จ่าย</h3>
                <p className="text-gray-600">ดูภาพรวมการใช้จ่ายของครอบครัวและรู้ว่าเงินไปไหนบ้าง</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100 hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">จัดการหนี้สิน</h3>
                <p className="text-gray-600">ติดตามว่าใครติดเงินใครและเคลียร์หนี้ได้ง่ายๆ</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-brown-100 hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">ออมเงินร่วมกัน</h3>
                <p className="text-gray-600">ตั้งเป้าหมายครอบครัวและทำให้ฝันเป็นจริง</p>
              </div>
            </div>

            <div className="pt-10 text-center text-sm text-gray-500">
              พัฒนาโดย <span className='text-xl ml-2.5 font-bold text-brown-800'>Pongsapak Jongsomsuk</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user?.familyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">ยังไม่มีครอบครัว</h2>
          <p className="text-gray-600">คุณยังไม่ได้เข้าร่วมครอบครัว กรุณาใช้รหัสเชิญเพื่อเข้าร่วม</p>
          <Link
            href="/register"
            className="inline-block px-6 py-3 bg-gradient-to-r from-brown-500 to-brown-700 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md"
          >
            เข้าร่วมครอบครัว
          </Link>
        </div>
      </div>
    );
  }

  if (user.role === 'member') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div
          onClick={() => router.push('/dashboard')}
          className="bg-white p-8 rounded-2xl shadow-xl border border-brown-100 cursor-pointer hover:shadow-2xl transition-all max-w-md w-full"
        >
          <div className="text-center space-y-4">
            <div className="text-6xl">👨‍👩‍👧‍👦</div>
            <h2 className="text-3xl font-bold text-gray-900">{familyName}</h2>
            <p className="text-gray-600">คลิกเพื่อดูแดชบอร์ด</p>
            <div className="pt-4">
              <span className="inline-block px-4 py-2 bg-brown-100 text-brown-600 rounded-full text-sm font-medium">
                {members.length} {members.length === 1 ? 'สมาชิก' : 'สมาชิก'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{familyName}</h1>
          <p className="text-gray-600">การจัดการครอบครัว</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-brown-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">รหัสเชิญ</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg font-mono text-2xl text-center text-brown-600 font-bold">
              {inviteCode}
            </div>
            <button
              onClick={copyToClipboard}
              className="px-6 py-3 bg-gradient-to-r from-brown-500 to-brown-700 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md flex items-center gap-2"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}
            </button>
          </div>
          <div className="mt-4">
            <button
              onClick={regenerateCode}
              className="text-sm text-brown-600 hover:text-purple-600 underline"
            >
              สร้างรหัสใหม่
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-brown-100">
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="w-6 h-6 text-brown-600" />
            <h2 className="text-xl font-bold text-gray-900">สมาชิกในครอบครัว ({members.length})</h2>
          </div>
          <div className="space-y-3">
            {members.map((member, index) => (
              <div
                key={member._id || index}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${member.role === 'moderator'
                    ? 'bg-purple-200 text-purple-800'
                    : 'bg-brown-100 text-brown-600'
                    }`}
                >
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-4 bg-gradient-to-r from-brown-500 to-brown-700 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            ไปที่แดชบอร์ด
          </button>
        </div>
      </div>
    </div>
  );
}
