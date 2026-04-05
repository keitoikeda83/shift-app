import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import ShiftCalendar from '../ShiftCalendar';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Modal from '@/Components/Modal'; // Breezeのモーダルを使用
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

export default function Dashboard() {
    const [shifts, setShifts] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
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

    // フォームの状態管理
    const [status, setStatus] = useState('work'); // 'work' or 'off'
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');

    const handleDateClick = (date) => {
        setSelectedDate(date);
        setIsModalOpen(true);
    };

    const handleSave = (e) => {
        e.preventDefault();
        
        router.post('/shifts', {
            date: format(selectedDate, 'yyyy-MM-dd'),
            status: status,
            // 休み希望の場合はnullを送る
            start_time: status === 'work' ? startTime : null,
            end_time: status === 'work' ? endTime : null,
        }, {
            onSuccess: () => {
                setIsModalOpen(false);
                fetchShifts();
                alert('保存しました！');
            }
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">シフト管理</h2>}
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 flex justify-center">
                    <ShiftCalendar shifts={shifts} onDateClick={handleDateClick} />
                </div>
            </div>

            {/* 入力モーダル */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSave} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 border-b pb-2">
                        {selectedDate && format(selectedDate, 'yyyy年MM月dd日')} の希望
                    </h2>

                    <div className="mt-6 space-y-6">
                        {/* 種類選択 */}
                        <div className="flex gap-4">
                            <label className="flex items-center">
                                <input type="radio" value="work" checked={status === 'work'} onChange={(e) => setStatus(e.target.value)} className="mr-2" />
                                シフト希望（出勤）
                            </label>
                            <label className="flex items-center">
                                <input type="radio" value="off" checked={status === 'off'} onChange={(e) => setStatus(e.target.value)} className="mr-2" />
                                休み希望
                            </label>
                        </div>

                        {/* 時間入力（シフト希望の時のみ表示） */}
                        {status === 'work' && (
                            <div className="flex items-center gap-2 animate-fadeIn">
                                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="border-gray-300 rounded-md shadow-sm" />
                                <span>〜</span>
                                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="border-gray-300 rounded-md shadow-sm" />
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsModalOpen(false)}>キャンセル</SecondaryButton>
                        <PrimaryButton>保存する</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}