import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { format, getDaysInMonth, addMonths, subMonths } from 'date-fns';
import DangerButton from '@/Components/DangerButton';

// 状態ラベル定義
const STATUS_META = {
    pending:  { label: '未確定', cellClass: 'bg-red-50 text-red-700 ring-red-600/10',       badgeClass: 'bg-red-100 text-red-700' },
    draft:    { label: '仮',     cellClass: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20', badgeClass: 'bg-yellow-100 text-yellow-800' },
    approved: { label: '確定',   cellClass: 'bg-green-50 text-green-700 ring-green-600/10',  badgeClass: 'bg-green-100 text-green-700' },
};

export default function AdminDashboard({ auth }) {
    const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'pending' | 'trash'
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [employees, setEmployees] = useState([]);
    const [pendingShifts, setPendingShifts] = useState([]);
    const [trashedShifts, setTrashedShifts] = useState([]);
    const [shiftFilter, setShiftFilter] = useState('all'); // 'all' | 'pending' | 'draft' | 'approved'

    // モーダル系
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState(null);  // 編集対象（既存シフト）
    const [editTarget, setEditTarget] = useState(null);      // 新規作成時の {date, employee}
    const [editStatus, setEditStatus] = useState('work');    // 'work' | 'off'
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [modalMode, setModalMode] = useState('view');      // 'view' | 'createDraft' | 'bulkApprove' | 'bulkToDraft'

    const [flashMessage, setFlashMessage] = useState('');
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedShiftIds, setSelectedShiftIds] = useState([]);
    const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
    const [isApproveAllDraftsConfirmOpen, setIsApproveAllDraftsConfirmOpen] = useState(false);

    // ゴミ箱用
    const [selectedTrashedIds, setSelectedTrashedIds] = useState([]);
    const [isForceDeleteConfirmOpen, setIsForceDeleteConfirmOpen] = useState(false);

    const showFlash = (msg) => {
        setFlashMessage(msg);
        setTimeout(() => setFlashMessage(''), 3000);
    };

    const fetchAdminData = async () => {
        try {
            const monthStr = format(currentMonth, 'yyyy-MM');
            const [matrixRes, pendingRes] = await Promise.all([
                axios.get('/admin/shifts', { params: { month: monthStr } }),
                axios.get('/admin/shifts/pending'),
            ]);
            setEmployees(matrixRes.data);
            setPendingShifts(pendingRes.data);
        } catch (error) {
            console.error('データ取得失敗', error);
        }
    };

    const fetchTrashedData = async () => {
        try {
            const res = await axios.get('/admin/shifts/trashed');
            setTrashedShifts(res.data);
        } catch (error) {
            console.error('ゴミ箱データ取得失敗', error);
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, [currentMonth]);

    useEffect(() => {
        if (activeTab === 'trash') fetchTrashedData();
    }, [activeTab]);

    // 一括選択モード切替時、選択をリセット
    const toggleBulkMode = () => {
        setIsBulkMode(!isBulkMode);
        setSelectedShiftIds([]);
    };

    // セルクリック時の処理
    const handleCellClick = ({ shift, employee, date }) => {
        if (isBulkMode) {
            // 一括選択モード: pending/draft のみ選択可能
            if (!shift) return;
            if (shift.admin_status === 'approved') return;
            setSelectedShiftIds(prev =>
                prev.includes(shift.id)
                    ? prev.filter(id => id !== shift.id)
                    : [...prev, shift.id]
            );
            return;
        }

        // 通常モード
        if (shift) {
            // 既存シフトの詳細・編集
            setEditingShift({ ...shift, user: employee });
            setEditTarget(null);
            setEditStatus(shift.status);
            setEditStartTime(shift.start_time ? shift.start_time.substring(0, 5) : '18:00');
            setEditEndTime(shift.end_time ? shift.end_time.substring(0, 5) : '23:00');
            setModalMode('view');
            setIsEditModalOpen(true);
        } else {
            // 新規 draft 作成
            setEditingShift(null);
            setEditTarget({ date, employee });
            setEditStatus('work');
            setEditStartTime('18:00');
            setEditEndTime('23:00');
            setModalMode('createDraft');
            setIsEditModalOpen(true);
        }
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingShift(null);
        setEditTarget(null);
    };

    // ── 単一操作 ───────────────────────────────
    const submitCreateDraft = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/admin/shifts/draft', {
                user_id: editTarget.employee.id,
                date: editTarget.date,
                status: editStatus,
                start_time: editStatus === 'work' ? editStartTime : null,
                end_time: editStatus === 'work' ? editEndTime : null,
            });
            closeEditModal();
            fetchAdminData();
            showFlash('仮シフトを作成しました');
        } catch (error) {
            console.error('仮シフト作成エラー', error);
        }
    };

    const submitApprove = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/admin/shifts/${editingShift.id}/approve`, {
                start_time: editStatus === 'work' ? editStartTime : null,
                end_time: editStatus === 'work' ? editEndTime : null,
            });
            closeEditModal();
            fetchAdminData();
            showFlash('シフトを確定しました');
        } catch (error) {
            console.error('確定エラー', error);
        }
    };

    const submitMoveToPending = async () => {
        try {
            await axios.put(`/admin/shifts/${editingShift.id}/to-pending`);
            closeEditModal();
            fetchAdminData();
            showFlash('未確定に戻しました');
        } catch (error) {
            console.error('未確定戻しエラー', error);
        }
    };

    const submitBulkMoveToPending = async () => {
        try {
            await axios.put('/admin/shifts/bulk-to-pending', { ids: selectedShiftIds });
            setSelectedShiftIds([]);
            setIsBulkMode(false);
            fetchAdminData();
            showFlash('選択したシフトを未確定に戻しました');
        } catch (error) {
            console.error('一括未確定戻しエラー', error);
        }
    };

    const submitMoveToDraft = async () => {
        try {
            await axios.put(`/admin/shifts/${editingShift.id}/to-draft`, {
                status: editStatus,
                start_time: editStatus === 'work' ? editStartTime : null,
                end_time: editStatus === 'work' ? editEndTime : null,
            });
            closeEditModal();
            fetchAdminData();
            showFlash(editingShift.admin_status === 'approved' ? 'シフトを仮シフトに差し戻しました' : '仮シフトに変更しました');
        } catch (error) {
            console.error('差し戻しエラー', error);
        }
    };

    const submitUpdateDraft = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/admin/shifts/${editingShift.id}`, {
                status: editStatus,
                start_time: editStatus === 'work' ? editStartTime : null,
                end_time: editStatus === 'work' ? editEndTime : null,
            });
            closeEditModal();
            fetchAdminData();
            showFlash('仮シフトを更新しました');
        } catch (error) {
            console.error('更新エラー', error);
        }
    };

    // ── 一括操作 ───────────────────────────────
    const openBulkApproveModal = () => {
        const targets = allShiftsInMonth().filter(s => selectedShiftIds.includes(s.id));
        const hasWork = targets.some(s => s.status === 'work');
        setEditingShift(null);
        setEditTarget(null);
        setEditStatus(hasWork ? 'work' : 'off');
        setEditStartTime('18:00');
        setEditEndTime('23:00');
        setModalMode('bulkApprove');
        setIsEditModalOpen(true);
    };

    const openBulkToDraftModal = () => {
        const targets = allShiftsInMonth().filter(s => selectedShiftIds.includes(s.id));
        const hasWork = targets.some(s => s.status === 'work');
        setEditingShift(null);
        setEditTarget(null);
        setEditStatus(hasWork ? 'work' : 'off');
        setEditStartTime('18:00');
        setEditEndTime('23:00');
        setModalMode('bulkToDraft');
        setIsEditModalOpen(true);
    };

    const submitBulkApprove = async (e) => {
        e.preventDefault();
        try {
            // 出勤シフトが含まれる場合のみ時間を上書き、休みのみなら未指定
            const targets = allShiftsInMonth().filter(s => selectedShiftIds.includes(s.id));
            const hasWork = targets.some(s => s.status === 'work');
            await axios.put('/admin/shifts/bulk-approve', {
                ids: selectedShiftIds,
                start_time: hasWork ? editStartTime : null,
                end_time: hasWork ? editEndTime : null,
            });
            closeEditModal();
            setSelectedShiftIds([]);
            setIsBulkMode(false);
            fetchAdminData();
            showFlash('選択したシフトを一括確定しました');
        } catch (error) {
            console.error('一括確定エラー', error);
        }
    };

    const submitBulkToDraft = async (e) => {
        e.preventDefault();
        try {
            const targets = allShiftsInMonth().filter(s => selectedShiftIds.includes(s.id));
            const hasWork = targets.some(s => s.status === 'work');
            await axios.put('/admin/shifts/bulk-to-draft', {
                ids: selectedShiftIds,
                start_time: hasWork ? editStartTime : null,
                end_time: hasWork ? editEndTime : null,
            });
            closeEditModal();
            setSelectedShiftIds([]);
            setIsBulkMode(false);
            fetchAdminData();
            showFlash('選択したシフトを仮シフトに変更しました');
        } catch (error) {
            console.error('一括仮確定エラー', error);
        }
    };

    // 削除リクエスト: 編集モーダルが開いている場合は閉じてから確認モーダルを表示
    // （Modal同士の重なりで onClick が通らなくなる事象を回避）
    const requestDelete = () => {
        setIsEditModalOpen(false);
        setIsRejectConfirmOpen(true);
    };

    const cancelReject = () => {
        setIsRejectConfirmOpen(false);
        // 単一削除の確認をキャンセルした時は編集モーダルへ戻す
        if (editingShift) setIsEditModalOpen(true);
    };

    const executeReject = async () => {
        try {
            // editingShift がセットされていれば単一削除、無ければ選択中の一括削除
            if (editingShift) {
                await axios.delete(`/admin/shifts/${editingShift.id}/reject`);
            } else if (selectedShiftIds.length > 0) {
                await axios.delete('/admin/shifts/bulk-reject', { data: { ids: selectedShiftIds } });
                setSelectedShiftIds([]);
                setIsBulkMode(false);
            } else {
                setIsRejectConfirmOpen(false);
                return;
            }
            setIsRejectConfirmOpen(false);
            closeEditModal();
            fetchAdminData();
            showFlash('シフトを削除しました（ゴミ箱から復元できます）');
        } catch (error) {
            console.error('削除エラー', error);
        }
    };

    const executeApproveAllDrafts = async () => {
        try {
            const monthStr = format(currentMonth, 'yyyy-MM');
            const res = await axios.put('/admin/shifts/approve-all-drafts', { month: monthStr });
            setIsApproveAllDraftsConfirmOpen(false);
            fetchAdminData();
            showFlash(res.data?.message ?? '仮シフトを一括確定しました');
        } catch (error) {
            console.error('全draft確定エラー', error);
        }
    };

    // ── ゴミ箱操作 ───────────────────────────────
    const restoreShift = async (id) => {
        try {
            await axios.put(`/admin/shifts/${id}/restore`);
            fetchTrashedData();
            fetchAdminData();
            showFlash('シフトを復元しました');
        } catch (error) {
            console.error('復元エラー', error);
        }
    };

    const bulkRestoreShifts = async () => {
        try {
            await axios.put('/admin/shifts/bulk-restore', { ids: selectedTrashedIds });
            setSelectedTrashedIds([]);
            fetchTrashedData();
            fetchAdminData();
            showFlash('選択したシフトを復元しました');
        } catch (error) {
            console.error('一括復元エラー', error);
        }
    };

    const executeForceDelete = async () => {
        try {
            await axios.delete('/admin/shifts/bulk-force', { data: { ids: selectedTrashedIds } });
            setSelectedTrashedIds([]);
            setIsForceDeleteConfirmOpen(false);
            fetchTrashedData();
            showFlash('選択したシフトを完全削除しました');
        } catch (error) {
            console.error('完全削除エラー', error);
        }
    };

    // ── 補助 ───────────────────────────────
    const allShiftsInMonth = () => employees.flatMap(e => e.shifts || []);

    // 現在選択中のシフト一覧（一括操作モーダル表示用）
    const selectedShifts = useMemo(
        () => allShiftsInMonth().filter(s => selectedShiftIds.includes(s.id)),
        [employees, selectedShiftIds]
    );

    // CSVエクスポート（approved のみ）
    const handleExportCSV = () => {
        if (employees.length === 0) {
            alert('出力するデータがありません。');
            return;
        }

        const daysInMonth = getDaysInMonth(currentMonth);
        const header = ['', ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}日`)];
        let csvContent = header.join(',') + '\n';

        employees.forEach(employee => {
            const row = [employee.name];
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const shift = employee.shifts?.find(s => s.date === dateStr);
                if (shift && shift.admin_status === 'approved') {
                    if (shift.status === 'work') {
                        const start = shift.start_time ? shift.start_time.substring(0, 5) : '';
                        const end = shift.end_time ? shift.end_time.substring(0, 5) : '';
                        row.push(`"${start}\n〜\n${end}"`);
                    } else {
                        row.push('休');
                    }
                } else {
                    row.push('');
                }
            }
            csvContent += row.join(',') + '\n';
        });

        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `シフト表_${format(currentMonth, 'yyyy年MM月')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // 月内 draft 件数
    const draftCount = useMemo(
        () => allShiftsInMonth().filter(s => s.admin_status === 'draft').length,
        [employees]
    );

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">シフト管理</h2>}>
            <Head title="シフト管理" />

            {flashMessage && (
                <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center space-x-2 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    <span className="font-bold text-sm">{flashMessage}</span>
                </div>
            )}

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">

                    {/* タブ */}
                    <div className="flex space-x-4 mb-6 border-b pb-2">
                        <button
                            className={`px-4 py-2 font-bold ${activeTab === 'matrix' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                            onClick={() => setActiveTab('matrix')}
                        >
                            シフト一覧表
                        </button>
                        <button
                            className={`px-4 py-2 font-bold flex items-center ${activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                            onClick={() => setActiveTab('pending')}
                        >
                            申請一覧
                            {pendingShifts.length > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">{pendingShifts.length}</span>
                            )}
                        </button>
                        <button
                            className={`px-4 py-2 font-bold flex items-center ${activeTab === 'trash' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                            onClick={() => setActiveTab('trash')}
                        >
                            ゴミ箱
                        </button>
                    </div>

                    {/* === マトリックス === */}
                    {activeTab === 'matrix' && (
                        <div>
                            {/* ツールバー：上段（モード切替・CSV） */}
                            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                                <label className="flex items-center cursor-pointer bg-white px-4 py-2 rounded-full shadow-sm border">
                                    <span className="mr-3 text-sm font-bold text-gray-700">一括選択</span>
                                    <div className="relative">
                                        <input type="checkbox" className="sr-only" checked={isBulkMode} onChange={toggleBulkMode} />
                                        <div className={`block w-12 h-6 rounded-full transition-colors ${isBulkMode ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isBulkMode ? 'transform translate-x-6' : ''}`}></div>
                                    </div>
                                </label>
                                <div className="flex gap-2">
                                    {draftCount > 0 && (
                                        <button
                                            onClick={() => setIsApproveAllDraftsConfirmOpen(true)}
                                            className="px-4 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 shadow-sm flex items-center"
                                        >
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                                            仮シフトを全て確定 ({draftCount})
                                        </button>
                                    )}
                                    <button
                                        onClick={handleExportCSV}
                                        className="px-4 py-2 bg-gray-600 text-white font-semibold rounded hover:bg-gray-700 shadow-sm flex items-center"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                        CSV出力
                                    </button>
                                </div>
                            </div>

                            {/* ツールバー：下段（フィルター） */}
                            <div className="flex flex-wrap items-center gap-2 mb-2 bg-white px-4 py-3 rounded-lg shadow-sm border">
                                <span className="text-sm font-bold text-gray-700 mr-2">表示:</span>
                                {[
                                    { value: 'all',      label: 'すべて' },
                                    { value: 'pending',  label: '未確定のみ' },
                                    { value: 'draft',    label: '仮シフトのみ' },
                                    { value: 'approved', label: '確定のみ' },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setShiftFilter(opt.value)}
                                        className={`px-3 py-1 text-sm font-semibold rounded-full transition ${
                                            shiftFilter === opt.value
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                                {/* 月切替 */}
                                <div className="flex justify-between items-center mb-4">
                                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="px-4 py-2 border rounded hover:bg-gray-50">&lt; 前月</button>
                                    <h3 className="text-xl font-bold">{format(currentMonth, 'yyyy年 MM月')}</h3>
                                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="px-4 py-2 border rounded hover:bg-gray-50">次月 &gt;</button>
                                </div>

                                {/* 凡例 */}
                                <div className="flex flex-wrap gap-4 mb-3 text-xs">
                                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border border-red-400 bg-red-200"></span> 未確定</span>
                                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border border-yellow-500 bg-yellow-200"></span> 仮シフト</span>
                                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border border-green-500 bg-green-200"></span> 確定</span>
                                </div>

                                {/* テーブル */}
                                <div className="overflow-x-auto relative shadow ring-1 ring-black ring-opacity-5 rounded">
                                    <table className="min-w-full divide-y divide-gray-300 border-collapse">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="sticky left-0 z-10 bg-gray-100 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 border-b border-r shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]">
                                                    従業員
                                                </th>
                                                {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
                                                    const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                                    const weekDayIndex = dateObj.getDay();
                                                    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
                                                    let textColor = 'text-gray-900';
                                                    if (weekDayIndex === 0) textColor = 'text-red-600';
                                                    if (weekDayIndex === 6) textColor = 'text-blue-600';
                                                    const dateStrForHeader = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                    const isToday = dateStrForHeader === todayStr;
                                                    return (
                                                        <th key={day} scope="col" className={`px-3 py-2 text-center border-b border-r min-w-[90px] ${textColor} ${isToday ? 'bg-indigo-50' : ''}`}>
                                                            <div className="text-sm font-semibold">{day}</div>
                                                            <div className="text-xs font-normal">({weekDays[weekDayIndex]})</div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {employees.length > 0 ? employees.map(employee => (
                                                <tr key={employee.id} className="hover:bg-gray-50">
                                                    <td className="sticky left-0 z-10 bg-white whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-gray-900 border-r shadow-[1px_0_0_0_#e5e7eb]">
                                                        {employee.name}
                                                    </td>
                                                    {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
                                                        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                        const shift = employee.shifts?.find(s => s.date === dateStr);
                                                        const isToday = dateStr === todayStr;

                                                        // フィルター適用
                                                        const filteredOut = shiftFilter !== 'all' && (!shift || shift.admin_status !== shiftFilter);

                                                        return (
                                                            <td
                                                                key={day}
                                                                className={`whitespace-nowrap px-1 py-2 text-sm text-center border-r ${isToday ? 'bg-indigo-50/40' : ''}`}
                                                            >
                                                                {(() => {
                                                                    if (filteredOut) {
                                                                        return <span className="text-gray-200">-</span>;
                                                                    }
                                                                    if (!shift) {
                                                                        // 空セル → 通常モードでは新規draft作成可、一括モードでは無効
                                                                        return (
                                                                            <button
                                                                                type="button"
                                                                                disabled={isBulkMode}
                                                                                onClick={() => handleCellClick({ shift: null, employee, date: dateStr })}
                                                                                className={`w-full h-full px-1 py-1 text-gray-300 ${
                                                                                    isBulkMode ? 'cursor-default' : 'hover:bg-blue-50 hover:text-blue-600 rounded transition-colors'
                                                                                }`}
                                                                                title={isBulkMode ? '' : 'クリックで仮シフト作成'}
                                                                            >
                                                                                +
                                                                            </button>
                                                                        );
                                                                    }

                                                                    const meta = STATUS_META[shift.admin_status] ?? STATUS_META.pending;
                                                                    const isSelectable = isBulkMode && shift.admin_status !== 'approved';
                                                                    const isSelected = selectedShiftIds.includes(shift.id);
                                                                    const clickable = !isBulkMode || isSelectable;

                                                                    return (
                                                                        <div
                                                                            onClick={() => clickable && handleCellClick({ shift, employee, date: dateStr })}
                                                                            className={`flex flex-col items-center justify-center rounded-md px-1 py-1 text-xs font-medium ring-1 ring-inset ${
                                                                                clickable ? 'cursor-pointer hover:opacity-70 transition-opacity' : 'cursor-default'
                                                                            } ${
                                                                                isSelected
                                                                                    ? 'relative bg-blue-100 text-blue-700 ring-transparent after:absolute after:inset-0 after:rounded-md after:ring-2 after:ring-blue-500 after:animate-pulse after:pointer-events-none'
                                                                                    : meta.cellClass
                                                                            }`}
                                                                        >
                                                                            {shift.admin_status !== 'approved' && (
                                                                                <span className={`text-[9px] mb-0.5 font-bold px-1 rounded ${meta.badgeClass}`}>
                                                                                    {meta.label}
                                                                                </span>
                                                                            )}
                                                                            {shift.status === 'work' ? (
                                                                                <>
                                                                                    <span>{shift.start_time?.substring(0, 5)}</span>
                                                                                    <span className="text-[9px] opacity-50">|</span>
                                                                                    <span>{shift.end_time?.substring(0, 5)}</span>
                                                                                </>
                                                                            ) : (
                                                                                <span className="py-1">休</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={32} className="py-8 text-center text-gray-500">
                                                        登録されている従業員がいません
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === 申請一覧 === */}
                    {activeTab === 'pending' && (
                        <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                            {pendingShifts.length === 0 ? (
                                <p className="text-gray-500">現在、未承認の申請はありません。</p>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">従業員</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">希望時間/種類</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {pendingShifts.map(shift => (
                                            <tr key={shift.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">{shift.date}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{shift.user?.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {shift.status === 'work' ? `${shift.start_time?.substring(0, 5)} 〜 ${shift.end_time?.substring(0, 5)}` : '休み希望'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => {
                                                            setEditingShift(shift);
                                                            setEditTarget(null);
                                                            setEditStatus(shift.status);
                                                            setEditStartTime(shift.start_time ? shift.start_time.substring(0, 5) : '18:00');
                                                            setEditEndTime(shift.end_time ? shift.end_time.substring(0, 5) : '23:00');
                                                            setModalMode('view');
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-900"
                                                    >
                                                        詳細
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* === ゴミ箱 === */}
                    {activeTab === 'trash' && (
                        <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-800">削除済みシフト（ゴミ箱）</h3>
                                {selectedTrashedIds.length > 0 && (
                                    <div className="flex gap-2">
                                        <PrimaryButton onClick={bulkRestoreShifts}>選択を復元 ({selectedTrashedIds.length})</PrimaryButton>
                                        <DangerButton onClick={() => setIsForceDeleteConfirmOpen(true)}>完全削除 ({selectedTrashedIds.length})</DangerButton>
                                    </div>
                                )}
                            </div>

                            {trashedShifts.length === 0 ? (
                                <p className="text-gray-500">ゴミ箱は空です。</p>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-3 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTrashedIds.length === trashedShifts.length}
                                                    onChange={(e) => {
                                                        setSelectedTrashedIds(e.target.checked ? trashedShifts.map(s => s.id) : []);
                                                    }}
                                                />
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">従業員</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">削除元の状態</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">削除日時</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {trashedShifts.map(shift => {
                                            const meta = STATUS_META[shift.admin_status] ?? STATUS_META.pending;
                                            return (
                                                <tr key={shift.id}>
                                                    <td className="px-3 py-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTrashedIds.includes(shift.id)}
                                                            onChange={() => {
                                                                setSelectedTrashedIds(prev =>
                                                                    prev.includes(shift.id)
                                                                        ? prev.filter(id => id !== shift.id)
                                                                        : [...prev, shift.id]
                                                                );
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{shift.date}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{shift.user?.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {shift.status === 'work' ? `${shift.start_time?.substring(0, 5)} 〜 ${shift.end_time?.substring(0, 5)}` : '休み'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-xs font-bold rounded ${meta.badgeClass}`}>{meta.label}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {shift.deleted_at ? format(new Date(shift.deleted_at), 'yyyy/MM/dd HH:mm') : ''}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button onClick={() => restoreShift(shift.id)} className="text-blue-600 hover:text-blue-900 mr-3">復元</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── 編集モーダル ────────────────────────────── */}
            <Modal show={isEditModalOpen} onClose={closeEditModal}>
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 border-b pb-2">
                        {modalMode === 'createDraft' && '仮シフトを作成'}
                        {modalMode === 'bulkApprove' && 'まとめて確定'}
                        {modalMode === 'bulkToDraft' && 'まとめて仮シフトに変更'}
                        {modalMode === 'view' && editingShift && (
                            editingShift.admin_status === 'pending' ? 'シフト申請の対応'
                            : editingShift.admin_status === 'draft' ? '仮シフトの編集'
                            : '確定シフトの確認'
                        )}
                    </h2>

                    <div className="mt-4 space-y-4">
                        {/* 単一: view モード */}
                        {modalMode === 'view' && editingShift && (
                            <>
                                <p className="text-gray-700"><strong>従業員:</strong> {editingShift.user?.name}</p>
                                <p className="text-gray-700"><strong>日付:</strong> {editingShift.date}</p>
                                <p className="text-gray-700">
                                    <strong>状態:</strong>{' '}
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${STATUS_META[editingShift.admin_status]?.badgeClass}`}>
                                        {STATUS_META[editingShift.admin_status]?.label}
                                    </span>
                                </p>

                                {/* work/off 切替（draftの編集時のみ自由切替を許可） */}
                                <div>
                                    <strong className="text-gray-700">種類:</strong>
                                    {editingShift.admin_status === 'draft' ? (
                                        <span className="ml-3 inline-flex gap-3">
                                            <label className="flex items-center"><input type="radio" value="work" checked={editStatus==='work'} onChange={() => setEditStatus('work')} className="mr-1" />出勤</label>
                                            <label className="flex items-center"><input type="radio" value="off"  checked={editStatus==='off'}  onChange={() => setEditStatus('off')}  className="mr-1" />休み</label>
                                        </span>
                                    ) : (
                                        <span className="ml-2">{editingShift.status === 'work' ? '出勤' : '休み'}</span>
                                    )}
                                </div>

                                {editStatus === 'work' && (
                                    <div>
                                        <label className="block font-medium text-gray-700 mb-1">時間</label>
                                        <div className="flex items-center gap-2">
                                            <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} disabled={editingShift.admin_status==='approved'} className="border-gray-300 rounded-md shadow-sm disabled:bg-gray-100" />
                                            <span>〜</span>
                                            <input type="time" value={editEndTime}   onChange={(e) => setEditEndTime(e.target.value)}   disabled={editingShift.admin_status==='approved'} className="border-gray-300 rounded-md shadow-sm disabled:bg-gray-100" />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* 新規 draft 作成 */}
                        {modalMode === 'createDraft' && editTarget && (
                            <>
                                <p className="text-gray-700"><strong>従業員:</strong> {editTarget.employee.name}</p>
                                <p className="text-gray-700"><strong>日付:</strong> {editTarget.date}</p>
                                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                                    <p className="text-yellow-800 text-sm">仮シフトとして作成します。後から編集・確定できます。</p>
                                </div>
                                <div>
                                    <strong className="text-gray-700">種類:</strong>
                                    <span className="ml-3 inline-flex gap-3">
                                        <label className="flex items-center"><input type="radio" value="work" checked={editStatus==='work'} onChange={() => setEditStatus('work')} className="mr-1" />出勤</label>
                                        <label className="flex items-center"><input type="radio" value="off"  checked={editStatus==='off'}  onChange={() => setEditStatus('off')}  className="mr-1" />休み</label>
                                    </span>
                                </div>
                                {editStatus === 'work' && (
                                    <div>
                                        <label className="block font-medium text-gray-700 mb-1">時間</label>
                                        <div className="flex items-center gap-2">
                                            <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} required className="border-gray-300 rounded-md shadow-sm" />
                                            <span>〜</span>
                                            <input type="time" value={editEndTime}   onChange={(e) => setEditEndTime(e.target.value)}   required className="border-gray-300 rounded-md shadow-sm" />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* 一括確定／一括draft化 */}
                        {(modalMode === 'bulkApprove' || modalMode === 'bulkToDraft') && (
                            <>
                                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                                    <p className="text-blue-700 font-bold">
                                        {selectedShifts.length} 件を{modalMode === 'bulkApprove' ? '確定' : '仮シフトに変更'}します。
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">
                                        ※出勤希望が含まれる場合、設定した時間で全件上書きされます。
                                    </p>
                                </div>
                                <div className="text-gray-700 text-sm">
                                    <strong>含まれる種類:</strong>{' '}
                                    {[...new Set(selectedShifts.map(s => s.status === 'work' ? '出勤' : '休み'))].join('、')}
                                </div>
                                {selectedShifts.some(s => s.status === 'work') && (
                                    <div>
                                        <label className="block font-medium text-gray-700 mb-1"><strong>時間（出勤希望に適用）</strong></label>
                                        <div className="flex items-center gap-2">
                                            <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} required className="border-gray-300 rounded-md shadow-sm" />
                                            <span>〜</span>
                                            <input type="time" value={editEndTime}   onChange={(e) => setEditEndTime(e.target.value)}   required className="border-gray-300 rounded-md shadow-sm" />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* アクションボタン: 「左=破壊的 / 右=取消+副次+主要」の2区画 */}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                        {/* 左: 削除（破壊的アクション）*/}
                        <div>
                            {modalMode === 'view' && editingShift && (
                                <DangerButton type="button" onClick={requestDelete}>削除</DangerButton>
                            )}
                        </div>

                        {/* 右: 取消 → 副次 → 主要 の順 */}
                        <div className="flex flex-wrap items-center gap-3 ml-auto">
                            <SecondaryButton type="button" onClick={closeEditModal}>キャンセル</SecondaryButton>

                            {modalMode === 'view' && editingShift && (
                                <>
                                    {/* pending: 「仮シフトにする」のみ主要（pending→approved 直行はさせない） */}
                                    {editingShift.admin_status === 'pending' && (
                                        <PrimaryButton type="button" onClick={submitMoveToDraft}>仮シフトにする →</PrimaryButton>
                                    )}
                                    {/* draft: 未確定に戻す（後退・副次）+ 一旦保存（副次）+ 確定（主要） */}
                                    {editingShift.admin_status === 'draft' && (
                                        <>
                                            <SecondaryButton type="button" onClick={submitMoveToPending}>← 未確定に戻す</SecondaryButton>
                                            <SecondaryButton type="button" onClick={submitUpdateDraft}>一旦保存</SecondaryButton>
                                            <PrimaryButton type="button" onClick={submitApprove}>確定する →</PrimaryButton>
                                        </>
                                    )}
                                    {/* approved: 仮シフトに戻す（修正用） */}
                                    {editingShift.admin_status === 'approved' && (
                                        <PrimaryButton type="button" onClick={submitMoveToDraft}>← 仮シフトに戻す</PrimaryButton>
                                    )}
                                </>
                            )}

                            {modalMode === 'createDraft' && (
                                <PrimaryButton type="button" onClick={submitCreateDraft}>仮シフトを作成</PrimaryButton>
                            )}
                            {modalMode === 'bulkApprove' && (
                                <PrimaryButton type="button" onClick={submitBulkApprove}>まとめて確定</PrimaryButton>
                            )}
                            {modalMode === 'bulkToDraft' && (
                                <PrimaryButton type="button" onClick={submitBulkToDraft}>まとめて仮シフトに変更</PrimaryButton>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* 一括選択 フローティング: 「主要1 + 副次」に整理
                 - 全て draft → 主要 = 確定 / 副次 = 未確定に戻す
                 - pending を含む(or 混在) → 主要 = 仮シフト化（必ず draft を経由させる） */}
            {isBulkMode && selectedShiftIds.length > 0 && (() => {
                const allDraft = selectedShifts.length > 0 && selectedShifts.every(s => s.admin_status === 'draft');
                return (
                    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white px-6 py-4 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-blue-200 z-[90] flex items-center space-x-3 w-max">
                        <span className="font-bold text-gray-700 text-sm">{selectedShiftIds.length}件を選択中</span>
                        <DangerButton onClick={() => setIsRejectConfirmOpen(true)}>削除</DangerButton>
                        {allDraft && (
                            <SecondaryButton onClick={submitBulkMoveToPending}>← 未確定に戻す</SecondaryButton>
                        )}
                        {allDraft ? (
                            <PrimaryButton onClick={openBulkApproveModal}>確定</PrimaryButton>
                        ) : (
                            <PrimaryButton onClick={openBulkToDraftModal}>仮シフト化</PrimaryButton>
                        )}
                    </div>
                );
            })()}

            {/* 削除確認モーダル */}
            <Modal show={isRejectConfirmOpen} onClose={cancelReject} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-gray-900">シフトの削除</h2>
                    <div className="mt-4 text-sm text-gray-600">
                        {editingShift ? (
                            <p>このシフトをゴミ箱へ移動します。</p>
                        ) : (
                            <p><strong>{selectedShiftIds.length}件</strong> のシフトをゴミ箱へ移動します。</p>
                        )}
                        <p className="mt-2 text-xs text-blue-600 font-bold">※ゴミ箱から復元できます。</p>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={cancelReject}>キャンセル</SecondaryButton>
                        <DangerButton onClick={executeReject}>ゴミ箱へ移動</DangerButton>
                    </div>
                </div>
            </Modal>

            {/* 全draft確定確認モーダル */}
            <Modal show={isApproveAllDraftsConfirmOpen} onClose={() => setIsApproveAllDraftsConfirmOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-gray-900">仮シフトを全て確定</h2>
                    <div className="mt-4 text-sm text-gray-600">
                        <p>{format(currentMonth, 'yyyy年MM月')} の仮シフト <strong>{draftCount}件</strong> をすべて確定します。</p>
                        <p className="mt-2 text-xs text-gray-500">確定後も、個別に「仮シフトに差し戻す」ことで再編集できます。</p>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsApproveAllDraftsConfirmOpen(false)}>キャンセル</SecondaryButton>
                        <PrimaryButton onClick={executeApproveAllDrafts}>すべて確定する</PrimaryButton>
                    </div>
                </div>
            </Modal>

            {/* 完全削除確認モーダル */}
            <Modal show={isForceDeleteConfirmOpen} onClose={() => setIsForceDeleteConfirmOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-gray-900">完全削除</h2>
                    <div className="mt-4 text-sm text-gray-600">
                        <p><strong>{selectedTrashedIds.length}件</strong> のシフトを完全削除します。</p>
                        <p className="mt-2 text-xs text-red-500 font-bold">※この操作は取り消せません。</p>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsForceDeleteConfirmOpen(false)}>キャンセル</SecondaryButton>
                        <DangerButton onClick={executeForceDelete}>完全削除する</DangerButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
