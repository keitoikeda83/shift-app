import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function ShiftCalendar({ shifts = [], onDateClick }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
        <div className="w-full border rounded-lg bg-white shadow">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>←</button>
                <h2 className="font-bold">{format(currentMonth, 'yyyy年 M月', { locale: ja })}</h2>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>→</button>
            </div>

            {/* 曜日 */}
            <div className="grid grid-cols-7 bg-gray-50 border-b text-center text-xs py-2">
                {['日', '月', '火', '水', '木', '金', '土'].map(d => <div key={d}>{d}</div>)}
            </div>

            {/* 日付 */}
            <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const shift = shifts.find(s => s.date === dateStr);
                    const isSelectedMonth = isSameMonth(day, monthStart);

                    return (
                        <div 
                            key={dateStr}
                            onClick={() => onDateClick(day)}
                            className={`min-h-[100px] border-b border-r p-1 cursor-pointer hover:bg-blue-50 ${!isSelectedMonth ? 'bg-gray-50 opacity-30' : ''}`}
                        >
                            <div className="text-xs text-gray-500">{format(day, 'd')}</div>
                            
                            {shift && (
                                <div className={`mt-1 p-1 rounded text-[10px] border ${
                                    shift.admin_status === 'approved' 
                                        ? 'bg-green-500 text-white border-green-600' // 確定：緑
                                        : (shift.status === 'work' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-red-100 text-red-700 border-red-200') // 希望：薄色
                                }`}>
                                    <div className="font-bold">
                                        {shift.admin_status === 'approved' ? '【確定】' : '申請中'}
                                    </div>
                                    <div>
                                        {shift.status === 'work' ? `${shift.start_time?.substring(0, 5)}〜${shift.end_time?.substring(0, 5)}` : '休み'}
                                    </div>
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