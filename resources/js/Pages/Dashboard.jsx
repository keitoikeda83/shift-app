import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import ShiftCalendar from '../ShiftCalendar';
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
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
    // 編集対象の申請中シフト（null なら新規申請モード）
    const [editingShift, setEditingShift] = useState(null);
    const [isWithdrawConfirmOpen, setIsWithdrawConfirmOpen] = useState(false);
    const [isBulkWithdrawConfirmOpen, setIsBulkWithdrawConfirmOpen] = useState(false);

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
        const dateStr = format(date, 'yyyy-MM-dd');
        const existingShift = shifts.find(s => s.date === dateStr);

        if (isBulkMode) {
            // 一括モード時は、配列に追加したり外したりする
            // 既存シフトのある日は ShiftCalendar 側でクリック自体が無効化されるためここには来ない想定
            setSelectedDates(prev => {
                const isAlreadySelected = prev.some(d => format(d, 'yyyy-MM-dd') === dateStr);
                if (isAlreadySelected) {
                    return prev.filter(d => format(d, 'yyyy-MM-dd') !== dateStr); // 選択解除
                } else {
                    return [...prev, date]; // 選択追加
                }
            });
            return;
        }

        // 通常モード
        if (existingShift && existingShift.admin_status === 'pending') {
            // 申請中の編集モード
            setEditingShift(existingShift);
            setStatus(existingShift.status);
            setStartTime(existingShift.start_time ? existingShift.start_time.substring(0, 5) : '18:00');
            setEndTime(existingShift.end_time ? existingShift.end_time.substring(0, 5) : '23:00');
        } else {
            // 新規申請モード
            setEditingShift(null);
            setStatus('work');
            setStartTime('18:00');
            setEndTime('23:00');
        }
        setSelectedDate(date);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        // editingShift はクリアしない（Modal のフェードアウト中に内容が
        // 「希望提出」に切り替わってちらつくため）。
        // 次回モーダルを開く側（handleDateClick / openBulkModal）で正しい値に
        // 上書きされるので、ここで状態を残しておいて問題ない。
        setIsModalOpen(false);
    };

    // 保存時
    const handleSave = (e) => {
        e.preventDefault();

        // 編集モード：申請中の自分のシフトを更新
        if (editingShift) {
            router.put(`/shifts/${editingShift.id}`, {
                status: status,
                start_time: status === 'work' ? startTime : null,
                end_time: status === 'work' ? endTime : null,
            }, {
                onSuccess: () => {
                    closeModal();
                    fetchShifts();
                    setFlashMessage(<span>申請内容を更新しました。</span>);
                    setTimeout(() => setFlashMessage(''), 4000);
                }
            });
            return;
        }

        // 新規申請モード（単一 or 一括）
        const datesToSubmit = isBulkMode
            ? selectedDates.map(d => format(d, 'yyyy-MM-dd'))
            : [format(selectedDate, 'yyyy-MM-dd')];

        const isBulkUpdate = isBulkMode && bulkAllPending;

        router.post('/shifts', {
            dates: datesToSubmit, // date ではなく dates で配列を送る
            status: status,
            start_time: status === 'work' ? startTime : null,
            end_time: status === 'work' ? endTime : null,
        }, {
            onSuccess: () => {
                closeModal();
                setSelectedDates([]); // 選択リセット
                fetchShifts();
                setFlashMessage(
                    isBulkUpdate
                        ? <span>{datesToSubmit.length}件の申請を更新しました。</span>
                        : <span>
                            希望を送信しました。<br className="block sm:hidden" />店長の承認をお待ちください。
                        </span>
                );
                setTimeout(() => setFlashMessage(''), 4000); // 4秒後に消す
            }
        });
    };

    // 取り下げ確認モーダルを開く（編集モーダルとの重なり回避のため一旦閉じる）
    const requestWithdraw = () => {
        setIsModalOpen(false);
        setIsWithdrawConfirmOpen(true);
    };

    const cancelWithdraw = () => {
        setIsWithdrawConfirmOpen(false);
        if (editingShift) setIsModalOpen(true); // 編集モーダルへ戻す
    };

    const executeWithdraw = () => {
        if (!editingShift) return;
        router.delete(`/shifts/${editingShift.id}`, {
            onSuccess: () => {
                setIsWithdrawConfirmOpen(false);
                setEditingShift(null);
                fetchShifts();
                setFlashMessage(<span>申請を取り下げました。</span>);
                setTimeout(() => setFlashMessage(''), 4000);
            }
        });
    };

    // 一括選択内容の派生状態（選択した日付 → 既存シフト or null の配列）
    const bulkSelectedShifts = useMemo(() => {
        return selectedDates.map(d => {
            const dateStr = format(d, 'yyyy-MM-dd');
            return shifts.find(s => s.date === dateStr) || null;
        });
    }, [selectedDates, shifts]);

    const bulkPendingShifts = bulkSelectedShifts.filter(s => s?.admin_status === 'pending');
    const bulkAllPending = selectedDates.length > 0 && bulkPendingShifts.length === selectedDates.length;

    // 一括取り下げ確認モーダルを開く
    const requestBulkWithdraw = () => {
        setIsBulkWithdrawConfirmOpen(true);
    };

    const executeBulkWithdraw = () => {
        const ids = bulkPendingShifts.map(s => s.id);
        if (ids.length === 0) return;
        router.delete('/shifts/bulk-withdraw', {
            data: { ids },
            onSuccess: () => {
                setIsBulkWithdrawConfirmOpen(false);
                setSelectedDates([]);
                fetchShifts();
                setFlashMessage(<span>{ids.length}件の申請を取り下げました。</span>);
                setTimeout(() => setFlashMessage(''), 4000);
            }
        });
    };

    // 一括モーダルを開く際に、編集モードならば最初の pending シフトの値で初期化
    const openBulkModal = () => {
        setEditingShift(null); // 単一編集モードの残骸を明示的にクリア
        if (bulkAllPending && bulkPendingShifts.length > 0) {
            const first = bulkPendingShifts[0];
            setStatus(first.status);
            setStartTime(first.start_time ? first.start_time.substring(0, 5) : '18:00');
            setEndTime(first.end_time ? first.end_time.substring(0, 5) : '23:00');
        } else {
            setStatus('work');
            setStartTime('18:00');
            setEndTime('23:00');
        }
        setIsModalOpen(true);
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
                            <span className="mr-3 text-sm font-bold text-gray-700">一括選択</span>
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
                    <ShiftCalendar shifts={shifts} onDateClick={handleDateClick} selectedDates={selectedDates} isBulkMode={isBulkMode} />
                </div>
            </div>

            {/* 一括選択フローティングボタン
                 - 全て申請中 → 「取り下げる」(赤) + 「まとめて更新」
                 - 全て未申請 or 混在 → 「まとめて申請」（混在時は申請中分は内容更新） */}
            {isBulkMode && selectedDates.length > 0 && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white px-6 py-4 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-blue-200 z-[90] flex items-center space-x-3 w-max">
                    <span className="font-bold text-gray-700 text-sm">{selectedDates.length}件を選択中</span>
                    {bulkAllPending && (
                        <DangerButton onClick={requestBulkWithdraw}>取り下げる</DangerButton>
                    )}
                    <PrimaryButton onClick={openBulkModal}>
                        {bulkAllPending ? 'まとめて更新' : 'まとめて申請'}
                    </PrimaryButton>
                </div>
            )}

            <Modal show={isModalOpen} onClose={closeModal}>
                <form onSubmit={handleSave} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 border-b pb-2 text-center sm:text-left">
                        {/* モーダルのタイトルを動的に変える */}
                        {editingShift
                            ? (selectedDate && format(selectedDate, 'yyyy年MM月dd日') + ' の申請を編集')
                            : isBulkMode
                                ? bulkAllPending
                                    ? `${selectedDates.length}件の申請を編集`
                                    : `${selectedDates.length}日分の希望提出`
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
                    {/* アクションボタン配置:
                         - スマホ: 縦積み（取り下げ→キャンセル→主要、主要は最下部で親指リーチ）
                         - PC: 横並び（取り下げ左、キャンセル+主要右） */}
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        {editingShift && (
                            <DangerButton
                                type="button"
                                onClick={requestWithdraw}
                                className="w-full justify-center sm:w-auto"
                            >
                                申請を取り下げる
                            </DangerButton>
                        )}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:ml-auto">
                            <SecondaryButton
                                type="button"
                                onClick={closeModal}
                                className="w-full justify-center sm:w-auto"
                            >
                                キャンセル
                            </SecondaryButton>
                            <PrimaryButton className="w-full justify-center sm:w-auto">
                                {editingShift
                                    ? '更新する'
                                    : isBulkMode && bulkAllPending
                                        ? 'まとめて更新する'
                                        : '希望を送信'
                                }
                            </PrimaryButton>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* 取り下げ確認モーダル */}
            <Modal show={isWithdrawConfirmOpen} onClose={cancelWithdraw} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-gray-900">申請の取り下げ</h2>
                    <div className="mt-4 text-sm text-gray-600">
                        <p>この申請を取り下げます。</p>
                        <p className="mt-2 text-xs text-gray-500">※取り下げ後にもう一度申請することが可能です。</p>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={cancelWithdraw}>キャンセル</SecondaryButton>
                        <DangerButton onClick={executeWithdraw}>取り下げる</DangerButton>
                    </div>
                </div>
            </Modal>

            {/* 一括取り下げ確認モーダル */}
            <Modal show={isBulkWithdrawConfirmOpen} onClose={() => setIsBulkWithdrawConfirmOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-gray-900">申請の一括取り下げ</h2>
                    <div className="mt-4 text-sm text-gray-600">
                        <p><strong>{bulkPendingShifts.length}件</strong> の申請を取り下げます。</p>
                        <p className="mt-2 text-xs text-gray-500">※取り下げ後にもう一度申請することが可能です。</p>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsBulkWithdrawConfirmOpen(false)}>キャンセル</SecondaryButton>
                        <DangerButton onClick={executeBulkWithdraw}>取り下げる</DangerButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}