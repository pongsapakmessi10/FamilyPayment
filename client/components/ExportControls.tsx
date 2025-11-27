'use client';
import { useState } from 'react';
import { FileDown, Calendar } from 'lucide-react';
import api from '@/lib/api';
import { exportDayPDF, exportMonthPDF, exportQuarterPDF, exportYearPDF } from '@/utils/pdfExport';

interface ExportControlsProps {
    familyName?: string;
}

export default function ExportControls({ familyName = 'Family' }: ExportControlsProps) {
    const [exportType, setExportType] = useState<'day' | 'month' | 'quarter' | 'year'>('month');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            let params: any = { type: exportType };

            switch (exportType) {
                case 'day':
                    params.date = selectedDate;
                    break;
                case 'month':
                    params.month = selectedMonth;
                    params.year = selectedYear;
                    break;
                case 'quarter':
                    params.quarter = selectedQuarter;
                    params.year = selectedYear;
                    break;
                case 'year':
                    params.year = selectedYear;
                    break;
            }

            const res = await api.get('/transactions/by-period', { params });
            const transactions = res.data;

            // Generate PDF based on type
            switch (exportType) {
                case 'day':
                    exportDayPDF(transactions, new Date(selectedDate), familyName);
                    break;
                case 'month':
                    exportMonthPDF(transactions, selectedMonth, selectedYear, familyName);
                    break;
                case 'quarter':
                    exportQuarterPDF(transactions, selectedQuarter, selectedYear, familyName);
                    break;
                case 'year':
                    exportYearPDF(transactions, selectedYear, familyName);
                    break;
            }
        } catch (err) {
            console.error('Export error:', err);
            alert('ส่งออก PDF ไม่สำเร็จ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-4">
                <FileDown className="w-5 h-5 text-brown-600" />
                <h3 className="text-lg font-bold text-blue-700">ส่งออกเป็น PDF</h3>
            </div>

            <div className="space-y-4">
                {/* Export Type Selector */}
                <div>
                    <label className="block text-sm font-medium text-brown-600 mb-2">ช่วงเวลาส่งออก</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <button
                            onClick={() => setExportType('day')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${exportType === 'day'
                                ? 'bg-brown-600 text-white shadow-md'
                                : 'bg-brown-50 text-brown-600 hover:bg-blue-100'
                                }`}
                        >
                            วัน
                        </button>
                        <button
                            onClick={() => setExportType('month')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${exportType === 'month'
                                ? 'bg-brown-600 text-white shadow-md'
                                : 'bg-brown-50 text-brown-600 hover:bg-blue-100'
                                }`}
                        >
                            เดือน
                        </button>
                        <button
                            onClick={() => setExportType('quarter')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${exportType === 'quarter'
                                ? 'bg-brown-600 text-white shadow-md'
                                : 'bg-brown-50 text-brown-600 hover:bg-blue-100'
                                }`}
                        >
                            ไตรมาส
                        </button>
                        <button
                            onClick={() => setExportType('year')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${exportType === 'year'
                                ? 'bg-brown-600 text-white shadow-md'
                                : 'bg-brown-50 text-brown-600 hover:bg-blue-100'
                                }`}
                        >
                            ปี
                        </button>
                    </div>
                </div>

                {/* Date Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {exportType === 'day' && (
                        <div>
                            <label className="block text-sm font-medium text-brown-600 mb-2">เลือกวันที่</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-blue-500 text-blue-700"
                            />
                        </div>
                    )}

                    {exportType === 'month' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-brown-600 mb-2">เดือน</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-blue-500 text-blue-700"
                                >
                                    {['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'].map((month, idx) => (
                                        <option key={idx} value={idx + 1}>{month}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brown-600 mb-2">ปี</label>
                                <input
                                    type="number"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-blue-500 text-blue-700"
                                />
                            </div>
                        </>
                    )}

                    {exportType === 'quarter' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-brown-600 mb-2">ไตรมาส</label>
                                <select
                                    value={selectedQuarter}
                                    onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                                    className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-blue-500 text-blue-700"
                                >
                                    <option value={1}>ไตรมาส 1 (ม.ค.-มี.ค.)</option>
                                    <option value={2}>ไตรมาส 2 (เม.ย.-มิ.ย.)</option>
                                    <option value={3}>ไตรมาส 3 (ก.ค.-ก.ย.)</option>
                                    <option value={4}>ไตรมาส 4 (ต.ค.-ธ.ค.)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brown-600 mb-2">ปี</label>
                                <input
                                    type="number"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-blue-500 text-blue-700"
                                />
                            </div>
                        </>
                    )}

                    {exportType === 'year' && (
                        <div>
                            <label className="block text-sm font-medium text-brown-600 mb-2">ปี</label>
                            <input
                                type="number"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-blue-500 text-blue-700"
                            />
                        </div>
                    )}
                </div>

                {/* Export Button */}
                <button
                    onClick={handleExport}
                    disabled={loading}
                    className="w-full bg-brown-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brown-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            กำลังสร้าง PDF...
                        </>
                    ) : (
                        <>
                            <FileDown className="w-5 h-5" />
                            ส่งออก PDF
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
