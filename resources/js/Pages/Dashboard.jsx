import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import ShiftCalendar from '../ShiftCalendar';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import axios from 'axios';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
    const [shifts, setShifts] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [status, setStatus] = useState('work');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');

    // ログインユーザー情報を取得
    const { auth } = usePage().props;

    // 管理者の場合は別のコンポーネントを返す
    if (auth.user.role === 'admin') {
        return <AdminDashboard auth={auth} />;
    }

    const fetchShifts = async () => {
        try {
            const response = await axios.get('/shifts');
            setShifts(response.data);
        } catch (error) {
            console.error("データ取得失敗", error);
        }
    };

    useEffect(() => {
        fetchShifts();
    }, []);

    const handleDateClick = (date) => {
        setSelectedDate(date);
        setIsModalOpen(true);
    };

    const handleSave = (e) => {
        e.preventDefault();
        router.post('/shifts', {
            date: format(selectedDate, 'yyyy-MM-dd'),
            status: status,
            start_time: status === 'work' ? startTime : null,
            end_time: status === 'work' ? endTime : null,
        }, {
            onSuccess: () => {
                setIsModalOpen(false);
                fetchShifts();
                alert('希望を送信しました。店長の承認をお待ちください。');
            }
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">シフト表</h2>}
        >
            <Head title="シフト表" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* カレンダーに全シフトデータを渡す */}
                    <ShiftCalendar shifts={shifts} onDateClick={handleDateClick} />
                </div>
            </div>

            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSave} className="p-6">
                    {/* SP:中央揃え / PC:左揃え */}
                    <h2 className="text-lg font-medium text-gray-900 border-b pb-2 text-center sm:text-left">
                        {selectedDate && format(selectedDate, 'yyyy年MM月dd日')} の希望提出
                    </h2>

                    <div className="mt-6 space-y-6">
                        {/* 種類選択 (SP:中央配置 / PC:左配置) */}
                        <div className="flex justify-center sm:justify-start gap-4">
                            <label className="flex items-center">
                                <input type="radio" value="work" checked={status === 'work'} onChange={(e) => setStatus(e.target.value)} className="mr-2" />
                                シフト希望（出勤）
                            </label>
                            <label className="flex items-center">
                                <input type="radio" value="off" checked={status === 'off'} onChange={(e) => setStatus(e.target.value)} className="mr-2" />
                                休み希望
                            </label>
                        </div>

                        {/* 時間入力（シフト希望の時のみ表示） (SP:中央配置 / PC:左配置) */}
                        {status === 'work' && (
                            <div className="flex justify-center sm:justify-start items-center gap-2 animate-fadeIn">
                                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="border-gray-300 rounded-md shadow-sm" />
                                <span>〜</span>
                                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="border-gray-300 rounded-md shadow-sm" />
                            </div>
                        )}
                    </div>
                    {/* ボタン (SP:中央配置 / PC:右配置) */}
                    <div className="mt-6 flex justify-center sm:justify-end gap-3">
                        <SecondaryButton onClick={() => setIsModalOpen(false)}>キャンセル</SecondaryButton>
                        <PrimaryButton>希望を送信</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}