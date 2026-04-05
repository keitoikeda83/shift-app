import React, { useState } from 'react';
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameMonth, 
    isSameDay, 
    parseISO 
} from 'date-fns';
import { ja } from 'date-fns/locale';

export default function ShiftCalendar({ shifts = [], onDateClick }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // カレンダーの生成ロジック
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-full max-w-4xl">
            {/* ヘッダー：月切り替え */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition">←</button>
                <h2 className="text-lg font-bold text-gray-800">
                    {format(currentMonth, 'yyyy年 M月', { locale: ja })}
                </h2>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition">→</button>
            </div>

            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 bg-gray-50 border-b">
                {['日', '月', '火', '水', '木', '金', '土'].map((day, idx) => (
                    <div key={day} className={`py-2 text-center text-xs font-bold ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                        {day}
                    </div>
                ))}
            </div>

            {/* 日付グリッド */}
            <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const shift = shifts.find(s => s.date === dateStr);
                    const isSelectedMonth = isSameMonth(day, monthStart);

                    return (
                        <div 
                            key={dateStr}
                            onClick={() => onDateClick(day)}
                            className={`min-h-[80px] border-b border-r p-1 transition-colors cursor-pointer hover:bg-blue-50
                                ${!isSelectedMonth ? 'bg-gray-50 text-gray-300' : 'text-gray-700'}
                                ${idx % 7 === 6 ? 'border-r-0' : ''}
                            `}
                        >
                            {/* 日付数字 */}
                            <div className="text-left text-xs font-medium mb-1">
                                {format(day, 'd')}
                            </div>

                            {/* シフト情報の表示（ここが自由自在！） */}
                            {shift && (
                                <div className={`rounded p-1 text-[10px] leading-tight shadow-sm border
                                    ${shift.status === 'work' 
                                        ? 'bg-blue-100 border-blue-200 text-blue-700' 
                                        : 'bg-red-100 border-red-200 text-red-700'
                                    }`}
                                >
                                    <div className="font-bold truncate">
                                        {shift.status === 'work' ? '出勤希望' : '休み希望'}
                                    </div>
                                    {shift.status === 'work' && shift.start_time && (
                                        <div className="mt-0.5 font-mono">
                                            {shift.start_time.substring(0, 5)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 凡例 */}
            <div className="p-4 bg-gray-50 flex gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></span> 出勤希望</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span> 休み希望</span>
            </div>
        </div>
    );
}