import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function ShiftCalendar({ shifts = [], onDateClick, selectedDates = [] }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [touchStart, setTouchStart] = useState({ x: null, y: null });
    const [touchEnd, setTouchEnd] = useState({ x: null, y: null });

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    // タッチイベントの処理関数
    const handleTouchStart = (e) => {
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };
    const handleTouchMove = (e) => {
        setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };
    const handleTouchEnd = () => {
        if (!touchStart.x || !touchEnd.x) return;
        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;

        // 縦スクロールではなく、横に50px以上スワイプされた時だけ月を切り替える
        if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > 50) {
            if (distanceX > 0) setCurrentMonth(addMonths(currentMonth, 1)); // 左スワイプで次月
            else setCurrentMonth(subMonths(currentMonth, 1)); // 右スワイプで前月
        }
        
        setTouchStart({ x: null, y: null });
        setTouchEnd({ x: null, y: null });
    };

    return (
        <div 
            className="w-full border rounded-lg bg-white shadow overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="px-3 py-1 hover:bg-gray-100 rounded">&lt;</button>
                <h2 className="font-bold">{format(currentMonth, 'yyyy年 M月', { locale: ja })}</h2>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="px-3 py-1 hover:bg-gray-100 rounded">&gt;</button>
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

                    // その日が「一括選択」で選ばれているか判定
                    const isSelected = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);

                    return (
                        <div 
                            key={dateStr}
                            // 申請不可でなければクリックイベント（モーダルを開く）を発火
                            onClick={() => !isDisabled && onDateClick(day)}
                            // 状態に応じてカーソルを変更する
                            className={`min-h-[100px] border-b border-r p-1 transition-colors ${
                                isPast ? 'cursor-not-allowed text-gray-300' : 
                                isAlreadyApplied ? 'cursor-default' : 
                                isSelected ? 'bg-blue-100 cursor-pointer' : // 選ばれている時は青色にする
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