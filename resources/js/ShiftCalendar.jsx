import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths, isBefore, startOfDay, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';

const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function ShiftCalendar({ shifts = [], onDateClick, selectedDates = [] }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [touchStart, setTouchStart] = useState({ x: null, y: null });
    const [touchEnd, setTouchEnd] = useState({ x: null, y: null });

    const today = new Date();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

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

        if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > 50) {
            if (distanceX > 0) setCurrentMonth(addMonths(currentMonth, 1));
            else setCurrentMonth(subMonths(currentMonth, 1));
        }

        setTouchStart({ x: null, y: null });
        setTouchEnd({ x: null, y: null });
    };

    return (
        <div
            className="w-full overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200/70"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* ヘッダー */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-4 py-4 sm:px-6">
                <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                    aria-label="前月"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                    {format(currentMonth, 'yyyy年 M月', { locale: ja })}
                </h2>
                <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                    aria-label="次月"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>

            {/* 曜日 */}
            <div className="grid grid-cols-7 border-b border-slate-200/70 bg-slate-50/60 py-2 text-center text-[11px] font-semibold tracking-wide">
                {WEEK_DAYS.map((d, i) => (
                    <div
                        key={d}
                        className={
                            i === 0 ? 'text-rose-500' :
                            i === 6 ? 'text-sky-500' :
                            'text-slate-500'
                        }
                    >
                        {d}
                    </div>
                ))}
            </div>

            {/* 日付 */}
            <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const shift = shifts.find(s => s.date === dateStr);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isPast = isBefore(day, startOfDay(today));
                    const isToday = isSameDay(day, today);
                    const isAlreadyApplied = !!shift;
                    const isDisabled = isPast || isAlreadyApplied;
                    const isSelected = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
                    const dayOfWeek = day.getDay();

                    return (
                        <div
                            key={dateStr}
                            onClick={() => !isDisabled && onDateClick(day)}
                            className={`group relative min-h-[96px] border-b border-r border-slate-100 p-1.5 transition sm:min-h-[110px] ${
                                isPast ? 'cursor-not-allowed' :
                                isAlreadyApplied ? 'cursor-default' :
                                isSelected ? 'cursor-pointer bg-brand-50' :
                                'cursor-pointer hover:bg-brand-50/40'
                            } ${!isCurrentMonth ? 'bg-slate-50/40' : ''}`}
                        >
                            <div className="flex items-center justify-between">
                                <span
                                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                                        isToday
                                            ? 'bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-sm shadow-brand-600/30'
                                            : !isCurrentMonth
                                                ? 'text-slate-300'
                                                : isPast
                                                    ? 'text-slate-300'
                                                    : dayOfWeek === 0
                                                        ? 'text-rose-500'
                                                        : dayOfWeek === 6
                                                            ? 'text-sky-500'
                                                            : 'text-slate-700'
                                    }`}
                                >
                                    {format(day, 'd')}
                                </span>
                                {isSelected && (
                                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm">
                                        <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </span>
                                )}
                            </div>

                            {shift && (
                                <div className={`mt-1.5 rounded-lg px-1.5 py-1 text-[10px] font-medium ring-1 ring-inset ${
                                    shift.admin_status === 'approved'
                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                        : 'bg-sky-50 text-sky-700 ring-sky-200'
                                }`}>
                                    <div className="flex items-center gap-1">
                                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                                            shift.admin_status === 'approved' ? 'bg-emerald-500' : 'bg-sky-500'
                                        }`}></span>
                                        <span className="font-semibold">
                                            {shift.admin_status === 'approved' ? '確定' : '申請中'}
                                        </span>
                                    </div>
                                    <div className="mt-0.5 truncate">
                                        {shift.status === 'work'
                                            ? `${shift.start_time?.substring(0, 5)}〜${shift.end_time?.substring(0, 5)}`
                                            : '休み'}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 凡例 */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200/70 bg-slate-50/60 px-4 py-3 text-xs sm:px-6">
                <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500"></span>
                    申請中
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    確定
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-brand-500 to-violet-500"></span>
                    本日
                </span>
            </div>
        </div>
    );
}
