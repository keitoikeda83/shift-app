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
    const [startTime, setStartTime] = useState('18:00');
    const [endTime, setEndTime] = useState('23:00');
    const [flashMessage, setFlashMessage] = useState('');
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedDates, setSelectedDates] = useState([]);

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

    // 日付クリック時
    const handleDateClick = (date) => {
        if (isBulkMode) {
            // 一括モード時は、配列に追加したり外したりする
            const dateStr = format(date, 'yyyy-MM-dd');
            setSelectedDates(prev => {
                const isAlreadySelected = prev.some(d => format(d, 'yyyy-MM-dd') === dateStr);
                if (isAlreadySelected) {
                    return prev.filter(d => format(d, 'yyyy-MM-dd') !== dateStr); // 選択解除
                } else {
                    return [...prev, date]; // 選択追加
                }
            });
        } else {
            // 通常モード時はそのままモーダルを開く
            setSelectedDate(date);
            setIsModalOpen(true);
        }
    };

    // 保存時
    const handleSave = (e) => {
        e.preventDefault();
        
        // 送信する日付を配列にする（一括なら複数、通常なら1つ）
        const datesToSubmit = isBulkMode 
            ? selectedDates.map(d => format(d, 'yyyy-MM-dd'))
            : [format(selectedDate, 'yyyy-MM-dd')];

        router.post('/shifts', {
            dates: datesToSubmit, // date ではなく dates で配列を送る
            status: status,
            start_time: status === 'work' ? startTime : null,
            end_time: status === 'work' ? endTime : null,
        }, {
            onSuccess: () => {
                setIsModalOpen(false);
                setSelectedDates([]); // 選択リセット
                fetchShifts();
                setFlashMessage(
                    <span>
                        希望を送信しました。<br className="block sm:hidden" />店長の承認をお待ちください。
                    </span>
                );
                setTimeout(() => setFlashMessage(''), 4000); // 4秒後に消す
            }
        });
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">シフト表</h2>}>
            <Head title="シフト表" />

            {flashMessage && (
                <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-xl shadow-2xl z-[100] flex items-center space-x-2 transition-all w-max max-w-[90vw] text-left">
                    {/* インフォメーションのアイコン */}
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span className="font-bold text-sm leading-tight">{flashMessage}</span>
                </div>
            )}

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    
                    {/* 一括申請モードのスイッチ */}
                    <div className="flex justify-end mb-4 px-4 sm:px-0">
                        <label className="flex items-center cursor-pointer bg-white px-4 py-2 rounded-full shadow-sm border">
                            <span className="mr-3 text-sm font-bold text-gray-700">一括申請モード</span>
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={isBulkMode} onChange={() => {
                                    setIsBulkMode(!isBulkMode);
                                    setSelectedDates([]); 
                                }} />
                                <div className={`block w-12 h-6 rounded-full transition-colors ${isBulkMode ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isBulkMode ? 'transform translate-x-6' : ''}`}></div>
                            </div>
                        </label>
                    </div>

                    {/* カレンダーに selectedDates を渡す */}
                    <ShiftCalendar shifts={shifts} onDateClick={handleDateClick} selectedDates={selectedDates} />
                </div>
            </div>

            {/* 一括申請用のフローティングボタン（複数選択されている時だけ表示） */}
            {isBulkMode && selectedDates.length > 0 && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white px-6 py-4 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-blue-200 z-[90] flex items-center space-x-4 w-max">
                    <span className="font-bold text-gray-700 text-sm">{selectedDates.length}件を選択中</span>
                    <PrimaryButton onClick={() => setIsModalOpen(true)}>まとめて申請</PrimaryButton>
                </div>
            )}

            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSave} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 border-b pb-2 text-center sm:text-left">
                        {/* モーダルのタイトルを動的に変える */}
                        {isBulkMode 
                            ? `${selectedDates.length}日分の希望提出`
                            : (selectedDate && format(selectedDate, 'yyyy年MM月dd日') + ' の希望提出')
                        }
                    </h2>

                    <div className="mt-6 space-y-6">
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

                        {status === 'work' && (
                            <div className="flex justify-center sm:justify-start items-center gap-2 animate-fadeIn">
                                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="border-gray-300 rounded-md shadow-sm" />
                                <span>〜</span>
                                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="border-gray-300 rounded-md shadow-sm" />
                            </div>
                        )}
                    </div>
                    <div className="mt-6 flex justify-center sm:justify-end gap-3">
                        <SecondaryButton onClick={() => setIsModalOpen(false)}>キャンセル</SecondaryButton>
                        <PrimaryButton>希望を送信</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}