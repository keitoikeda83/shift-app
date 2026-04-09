import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
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
                    // その日が「今日の0時0分」より前かどうかを判定
                    const isPast = isBefore(day, startOfDay(new Date()));
                    // すでに申請済み（確定・未確定問わずシフトデータが存在する）かどうかを判定
                    const isAlreadyApplied = !!shift;
                    // クリック（申請）できない条件の統合
                    const isDisabled = isPast || isAlreadyApplied;

                    return (
                        <div 
                            key={dateStr}
                            // 申請不可でなければクリックイベント（モーダルを開く）を発火
                            onClick={() => !isDisabled && onDateClick(day)}
                            // 状態に応じてカーソルを変更する
                            className={`min-h-[100px] border-b border-r p-1 transition-colors ${
                                isPast ? 'cursor-not-allowed' : 
                                isAlreadyApplied ? 'cursor-default' : 
                                'cursor-pointer hover:bg-blue-50'
                            } ${!isSelectedMonth ? 'opacity-30' : ''}`}
                        >
                            <div className="text-xs text-gray-500">{format(day, 'd')}</div>
                            
                            {shift && (
                                <div className={`mt-1 p-1 rounded text-[10px] border ${
                                    shift.admin_status === 'approved' 
                                        ? 'bg-green-50 text-green-700 border-green-300' // 確定：緑
                                        : (shift.status === 'work' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-blue-100 text-blue-700 border-blue-200') // 希望：薄色
                                }`}>
                                    <div className="font-bold">
                                        {shift.admin_status === 'approved' ? '確定' : '申請中'}
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
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></span> 申請中</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-50 border border-green-300 rounded"></span> 確定</span>
            </div>
        </div>
    );
}