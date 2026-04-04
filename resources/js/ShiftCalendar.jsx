import React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';

export default function ShiftCalendar({ shifts, onDateClick }) {
    // 休みは赤、出勤は青のドットを下線として表示する設定
    const modifiers = {
        hasWork: (date) => shifts.some(s => s.date === format(date, 'yyyy-MM-dd') && s.status === 'work'),
        hasOff: (date) => shifts.some(s => s.date === format(date, 'yyyy-MM-dd') && s.status === 'off'),
    };

    const modifiersStyles = {
        hasWork: { borderBottom: '4px solid #3b82f6' },
        hasOff: { borderBottom: '4px solid #ef4444' },
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow inline-block">
            <DayPicker
                mode="single"
                onDayClick={onDateClick}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
            />
            <div className="mt-4 flex gap-4 text-xs justify-center">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-1 bg-blue-500"></span> シフト希望
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-1 bg-red-500"></span> 休み希望
                </span>
            </div>
        </div>
    );
}