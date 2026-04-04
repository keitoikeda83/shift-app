import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ShiftCalendar from '../ShiftCalendar'; 
import { useState } from 'react';
import { format } from 'date-fns';

export default function Dashboard() {
    // 仮のデータ（後にDBから取得）
    const [shifts, setShifts] = useState([
        { date: '2026-04-10', status: 'work' },
        { date: '2026-04-15', status: 'off' },
    ]);
    const [selectedDate, setSelectedDate] = useState(null);

    const handleDateClick = (date) => {
        setSelectedDate(date);
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">シフト管理</h2>}
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6 flex flex-col md:flex-row gap-8">
                        {/* 左側：カレンダー */}
                        <div className="w-full md:w-1/2 flex justify-center">
                            <ShiftCalendar shifts={shifts} onDateClick={handleDateClick} />
                        </div>

                        {/* 右側：詳細表示 */}
                        <div className="w-full md:w-1/2 border-l pl-8">
                            <h3 className="font-bold text-lg mb-4 text-gray-700">
                                {selectedDate ? format(selectedDate, 'yyyy年MM月dd日') : '日付を選択してください'}
                            </h3>
                            {selectedDate ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600">この日の予定を入力または確認できます。</p>
                                    <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
                                        希望を登録する
                                    </button>
                                </div>
                            ) : (
                                <p className="text-gray-400 italic">カレンダーの日付をクリックすると詳細が表示されます。</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}