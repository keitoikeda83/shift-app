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

    const { auth } = usePage().props;

    if (auth.user.role === 'admin') {
        return <AdminDashboard auth={auth} />;
    }

    const fetchShifts = async () => {
        try {
            const response = await axios.get('/shifts');
            setShifts(response.data);
        } catch (error) {
            console.error('データ取得失敗', error);
        }
    };

    useEffect(() => {
        fetchShifts();
    }, []);

    const handleDateClick = (date) => {
        if (isBulkMode) {
            const dateStr = format(date, 'yyyy-MM-dd');
            setSelectedDates(prev => {
                const isAlreadySelected = prev.some(d => format(d, 'yyyy-MM-dd') === dateStr);
                if (isAlreadySelected) {
                    return prev.filter(d => format(d, 'yyyy-MM-dd') !== dateStr);
                } else {
                    return [...prev, date];
                }
            });
        } else {
            setSelectedDate(date);
            setIsModalOpen(true);
        }
    };

    const handleSave = (e) => {
        e.preventDefault();

        const datesToSubmit = isBulkMode
            ? selectedDates.map(d => format(d, 'yyyy-MM-dd'))
            : [format(selectedDate, 'yyyy-MM-dd')];

        router.post('/shifts', {
            dates: datesToSubmit,
            status: status,
            start_time: status === 'work' ? startTime : null,
            end_time: status === 'work' ? endTime : null,
        }, {
            onSuccess: () => {
                setIsModalOpen(false);
                setSelectedDates([]);
                fetchShifts();
                setFlashMessage(
                    <span>
                        希望を送信しました。<br className="block sm:hidden" />店長の承認をお待ちください。
                    </span>
                );
                setTimeout(() => setFlashMessage(''), 4000);
            }
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">シフト表</h2>
                    <p className="text-xs text-slate-500">出勤希望・休み希望を提出できます</p>
                </div>
            }
        >
            <Head title="シフト表" />

            {flashMessage && (
                <div className="fixed left-1/2 top-5 z-[100] flex w-max max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-2xl bg-slate-900/95 px-5 py-3 text-white shadow-pop ring-1 ring-white/10 backdrop-blur animate-slideDown">
                    <svg className="h-5 w-5 flex-shrink-0 text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium leading-tight">{flashMessage}</span>
                </div>
            )}

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* 一括申請モードのスイッチ */}
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="hidden text-sm text-slate-500 sm:block">
                            日付をタップして希望を提出してください
                        </div>
                        <label className="ml-auto flex cursor-pointer items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm transition hover:shadow">
                            <span className="text-sm font-semibold text-slate-700">一括選択</span>
                            <span className="relative inline-block">
                                <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={isBulkMode}
                                    onChange={() => {
                                        setIsBulkMode(!isBulkMode);
                                        setSelectedDates([]);
                                    }}
                                />
                                <span className="block h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-gradient-to-r peer-checked:from-brand-500 peer-checked:to-violet-500"></span>
                                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"></span>
                            </span>
                        </label>
                    </div>

                    <ShiftCalendar shifts={shifts} onDateClick={handleDateClick} selectedDates={selectedDates} />
                </div>
            </div>

            {/* 一括申請用のフローティングボタン */}
            {isBulkMode && selectedDates.length > 0 && (
                <div className="fixed bottom-6 left-1/2 z-[90] flex w-max -translate-x-1/2 items-center gap-3 rounded-full bg-white px-5 py-3 shadow-pop ring-1 ring-slate-200/70 animate-slideDown">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 px-1.5 text-xs font-bold text-white">
                            {selectedDates.length}
                        </span>
                        日を選択中
                    </span>
                    <PrimaryButton onClick={() => setIsModalOpen(true)}>
                        まとめて申請
                    </PrimaryButton>
                </div>
            )}

            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSave} className="p-6 sm:p-7">
                    <div className="border-b border-slate-100 pb-4">
                        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                            {isBulkMode
                                ? `${selectedDates.length}日分の希望提出`
                                : (selectedDate && format(selectedDate, 'yyyy年MM月dd日') + ' の希望提出')
                            }
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            提出後は店長の承認を待つ状態になります
                        </p>
                    </div>

                    <div className="mt-5 space-y-5">
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">種類</p>
                            <div className="grid grid-cols-2 gap-2">
                                <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                                    status === 'work'
                                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-200'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}>
                                    <input type="radio" value="work" checked={status === 'work'} onChange={(e) => setStatus(e.target.value)} className="sr-only" />
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    出勤希望
                                </label>
                                <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                                    status === 'off'
                                        ? 'border-slate-700 bg-slate-100 text-slate-800 ring-2 ring-slate-300'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}>
                                    <input type="radio" value="off" checked={status === 'off'} onChange={(e) => setStatus(e.target.value)} className="sr-only" />
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
                                    休み希望
                                </label>
                            </div>
                        </div>

                        {status === 'work' && (
                            <div className="animate-fadeIn">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">時間</p>
                                <div className="flex items-center gap-2">
                                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="block w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
                                    <span className="text-slate-400">〜</span>
                                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="block w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                        <SecondaryButton onClick={() => setIsModalOpen(false)}>キャンセル</SecondaryButton>
                        <PrimaryButton>希望を送信</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
