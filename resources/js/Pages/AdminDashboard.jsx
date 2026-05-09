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
    pending:  { label: '未確定',   pill: 'status-pill status-pill-pending',   cell: 'cell-pending',   dot: 'bg-rose-500' },
    draft:    { label: '仮シフト', pill: 'status-pill status-pill-draft',     cell: 'cell-draft',     dot: 'bg-amber-500' },
    approved: { label: '確定',     pill: 'status-pill status-pill-approved',  cell: 'cell-approved',  dot: 'bg-emerald-500' },
};

const FILTER_OPTIONS = [
    { value: 'all',      label: 'すべて' },
    { value: 'pending',  label: '未確定' },
    { value: 'draft',    label: '仮シフト' },
    { value: 'approved', label: '確定' },
];

export default function AdminDashboard({ auth }) {
    const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'pending' | 'trash'
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [employees, setEmployees] = useState([]);
    const [pendingShifts, setPendingShifts] = useState([]);
    const [trashedShifts, setTrashedShifts] = useState([]);
    const [shiftFilter, setShiftFilter] = useState('all');

    // モーダル系
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [editStatus, setEditStatus] = useState('work');
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [modalMode, setModalMode] = useState('view');

    const [flashMessage, setFlashMessage] = useState('');
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedShiftIds, setSelectedShiftIds] = useState([]);
    const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
    const [isApproveAllDraftsConfirmOpen, setIsApproveAllDraftsConfirmOpen] = useState(false);

    // ゴミ箱用
    const [selectedTrashedIds, setSelectedTrashedIds] = useState([]);
    const [isForceDeleteConfirmOpen, setIsForceDeleteConfirmOpen] = useState(false);

    // ゴミ箱フィルタ
    const [trashFilterMonth, setTrashFilterMonth] = useState('all');
    const [trashFilterUserId, setTrashFilterUserId] = useState('all');
    const [trashFilterDeletedDate, setTrashFilterDeletedDate] = useState('all');

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

    const toggleBulkMode = () => {
        setIsBulkMode(!isBulkMode);
        setSelectedShiftIds([]);
    };

    const handleCellClick = ({ shift, employee, date }) => {
        if (isBulkMode) {
            if (!shift) return;
            if (shift.admin_status === 'approved') return;
            setSelectedShiftIds(prev =>
                prev.includes(shift.id)
                    ? prev.filter(id => id !== shift.id)
                    : [...prev, shift.id]
            );
            return;
        }

        if (shift) {
            setEditingShift({ ...shift, user: employee });
            setEditTarget(null);
            setEditStatus(shift.status);
            setEditStartTime(shift.start_time ? shift.start_time.substring(0, 5) : '18:00');
            setEditEndTime(shift.end_time ? shift.end_time.substring(0, 5) : '23:00');
            setModalMode('view');
            setIsEditModalOpen(true);
        } else {
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
                status: editStatus,
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

    const requestDelete = () => {
        setIsEditModalOpen(false);
        setIsRejectConfirmOpen(true);
    };

    const cancelReject = () => {
        setIsRejectConfirmOpen(false);
        if (editingShift) setIsEditModalOpen(true);
    };

    const executeReject = async () => {
        try {
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

    const draftCount = useMemo(
        () => allShiftsInMonth().filter(s => s.admin_status === 'draft').length,
        [employees]
    );

    const pendingCountInMonth = useMemo(
        () => allShiftsInMonth().filter(s => s.admin_status === 'pending').length,
        [employees]
    );

    // ── ゴミ箱フィルタ ────────────────────────────────────
    const trashMonthOptions = useMemo(() => {
        const set = new Set(
            trashedShifts
                .map(s => (typeof s.date === 'string' ? s.date.substring(0, 7) : null))
                .filter(Boolean)
        );
        return Array.from(set).sort((a, b) => b.localeCompare(a));
    }, [trashedShifts]);

    const trashUserOptions = useMemo(() => {
        const map = new Map();
        trashedShifts.forEach(s => {
            if (s.user?.id != null && !map.has(s.user.id)) {
                map.set(s.user.id, s.user.name ?? `ID:${s.user.id}`);
            }
        });
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    }, [trashedShifts]);

    const trashDeletedDateOptions = useMemo(() => {
        const set = new Set();
        trashedShifts.forEach(s => {
            if (!s.deleted_at) return;
            try {
                set.add(format(new Date(s.deleted_at), 'yyyy-MM-dd'));
            } catch (_) { /* skip */ }
        });
        return Array.from(set).sort((a, b) => b.localeCompare(a));
    }, [trashedShifts]);

    const filteredTrashedShifts = useMemo(() => {
        return trashedShifts.filter(s => {
            if (trashFilterMonth !== 'all') {
                if (typeof s.date !== 'string' || s.date.substring(0, 7) !== trashFilterMonth) return false;
            }
            if (trashFilterUserId !== 'all') {
                if (String(s.user?.id) !== String(trashFilterUserId)) return false;
            }
            if (trashFilterDeletedDate !== 'all') {
                if (!s.deleted_at) return false;
                let key;
                try {
                    key = format(new Date(s.deleted_at), 'yyyy-MM-dd');
                } catch (_) { return false; }
                if (key !== trashFilterDeletedDate) return false;
            }
            return true;
        });
    }, [trashedShifts, trashFilterMonth, trashFilterUserId, trashFilterDeletedDate]);

    const resetTrashFilters = () => {
        setTrashFilterMonth('all');
        setTrashFilterUserId('all');
        setTrashFilterDeletedDate('all');
        setSelectedTrashedIds([]);
    };

    useEffect(() => {
        const visibleIds = new Set(filteredTrashedShifts.map(s => s.id));
        setSelectedTrashedIds(prev => prev.filter(id => visibleIds.has(id)));
    }, [filteredTrashedShifts]);

    const isTrashFilterActive =
        trashFilterMonth !== 'all' || trashFilterUserId !== 'all' || trashFilterDeletedDate !== 'all';

    // ── レンダリング補助 ───────────────────────────────────
    const tabs = [
        { key: 'matrix',  label: 'シフト一覧表' },
        { key: 'pending', label: '申請一覧',     badge: pendingShifts.length },
        { key: 'trash',   label: 'ゴミ箱' },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-slate-900">シフト管理</h2>
                        <p className="mt-0.5 text-xs text-slate-500">月別マトリックス・申請対応・ゴミ箱を一元管理</p>
                    </div>
                </div>
            }
        >
            <Head title="シフト管理" />

            {flashMessage && (
                <div className="fixed left-1/2 top-5 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-slate-900/95 px-5 py-3 text-white shadow-pop ring-1 ring-white/10 backdrop-blur animate-slideDown">
                    <svg className="h-5 w-5 flex-shrink-0 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                    <span className="text-sm font-medium">{flashMessage}</span>
                </div>
            )}

            <div className="py-6 sm:py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    {/* タブ */}
                    <div className="mb-6">
                        <div className="segmented w-full overflow-x-auto sm:w-auto">
                            {tabs.map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setActiveTab(t.key)}
                                    className={`segmented-item flex items-center gap-2 whitespace-nowrap ${activeTab === t.key ? 'segmented-item-active' : 'hover:text-slate-900'}`}
                                >
                                    {t.label}
                                    {t.badge > 0 && (
                                        <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                                            activeTab === t.key ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'
                                        }`}>
                                            {t.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* === マトリックス === */}
                    {activeTab === 'matrix' && (
                        <div className="space-y-4">
                            {/* ツールバー上段 */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <label className="flex cursor-pointer items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm transition hover:shadow">
                                    <span className="text-sm font-semibold text-slate-700">一括選択</span>
                                    <span className="relative inline-block">
                                        <input type="checkbox" className="peer sr-only" checked={isBulkMode} onChange={toggleBulkMode} />
                                        <span className="block h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-gradient-to-r peer-checked:from-brand-500 peer-checked:to-violet-500"></span>
                                        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"></span>
                                    </span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {draftCount > 0 && (
                                        <button
                                            onClick={() => setIsApproveAllDraftsConfirmOpen(true)}
                                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/25 ring-1 ring-inset ring-white/10 transition hover:-translate-y-px hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                                            仮シフトを全て確定
                                            <span className="rounded-full bg-white/20 px-1.5 text-[11px] font-bold">{draftCount}</span>
                                        </button>
                                    )}
                                    <SecondaryButton onClick={handleExportCSV}>
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                        CSV出力
                                    </SecondaryButton>
                                </div>
                            </div>

                            {/* ツールバー下段（フィルター） */}
                            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur">
                                <span className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">表示</span>
                                {FILTER_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setShiftFilter(opt.value)}
                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                            shiftFilter === opt.value
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {opt.value !== 'all' && (
                                            <span className={`h-1.5 w-1.5 rounded-full ${
                                                opt.value === 'pending'  ? 'bg-rose-500' :
                                                opt.value === 'draft'    ? 'bg-amber-500' :
                                                'bg-emerald-500'
                                            }`}></span>
                                        )}
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200/70">
                                {/* 月切替 */}
                                <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-4 py-4 sm:px-6">
                                    <button
                                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:shadow-sm"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                                        前月
                                    </button>
                                    <h3 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                                        {format(currentMonth, 'yyyy年 MM月')}
                                    </h3>
                                    <button
                                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:shadow-sm"
                                    >
                                        次月
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>

                                {/* 凡例 */}
                                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/40 px-4 py-3 text-xs sm:px-6">
                                    <span className="status-pill status-pill-pending">未確定</span>
                                    <span className="status-pill status-pill-draft">仮シフト</span>
                                    <span className="status-pill status-pill-approved">確定</span>
                                </div>

                                {/* テーブル */}
                                <div className="relative overflow-x-auto">
                                    <table className="min-w-full border-collapse">
                                        <thead className="bg-slate-50/80">
                                            <tr>
                                                <th
                                                    scope="col"
                                                    className="sticky left-0 z-10 min-w-[140px] border-b border-r border-slate-200/70 bg-slate-50/95 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur"
                                                >
                                                    従業員
                                                </th>
                                                {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
                                                    const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                                    const weekDayIndex = dateObj.getDay();
                                                    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
                                                    let textColor = 'text-slate-700';
                                                    if (weekDayIndex === 0) textColor = 'text-rose-500';
                                                    if (weekDayIndex === 6) textColor = 'text-sky-500';
                                                    const dateStrForHeader = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                    const isToday = dateStrForHeader === todayStr;
                                                    return (
                                                        <th
                                                            key={day}
                                                            scope="col"
                                                            className={`min-w-[88px] border-b border-r border-slate-200/70 px-2 py-2 text-center ${textColor} ${isToday ? 'bg-brand-50/70' : ''}`}
                                                        >
                                                            <div className={`mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                                                                isToday ? 'bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-sm shadow-brand-600/30' : ''
                                                            }`}>
                                                                {day}
                                                            </div>
                                                            <div className="text-[10px] font-medium opacity-70">{weekDays[weekDayIndex]}</div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {employees.length > 0 ? employees.map(employee => {
                                                const initial = employee.name?.charAt(0) ?? '?';
                                                return (
                                                    <tr key={employee.id} className="group transition hover:bg-brand-50/20">
                                                        <td className="sticky left-0 z-10 whitespace-nowrap border-b border-r border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-900 group-hover:bg-brand-50/40">
                                                            <span className="inline-flex items-center gap-2">
                                                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-semibold text-white">
                                                                    {initial}
                                                                </span>
                                                                {employee.name}
                                                            </span>
                                                        </td>
                                                        {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
                                                            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                            const shift = employee.shifts?.find(s => s.date === dateStr);
                                                            const isToday = dateStr === todayStr;
                                                            const filteredOut = shiftFilter !== 'all' && (!shift || shift.admin_status !== shiftFilter);

                                                            return (
                                                                <td
                                                                    key={day}
                                                                    className={`whitespace-nowrap border-b border-r border-slate-100 px-1 py-1.5 text-center text-sm ${isToday ? 'bg-brand-50/30' : ''}`}
                                                                >
                                                                    {(() => {
                                                                        if (filteredOut) {
                                                                            return <span className="text-slate-200">–</span>;
                                                                        }
                                                                        if (!shift) {
                                                                            return (
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={isBulkMode}
                                                                                    onClick={() => handleCellClick({ shift: null, employee, date: dateStr })}
                                                                                    className={`flex h-12 w-full items-center justify-center rounded-lg text-sm transition ${
                                                                                        isBulkMode
                                                                                            ? 'cursor-default text-slate-200'
                                                                                            : 'text-slate-300 hover:bg-brand-50 hover:text-brand-600'
                                                                                    }`}
                                                                                    title={isBulkMode ? '' : 'クリックで仮シフト作成'}
                                                                                >
                                                                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
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
                                                                                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-semibold ring-1 ring-inset transition ${
                                                                                    clickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm' : 'cursor-default'
                                                                                } ${
                                                                                    isSelected
                                                                                        ? 'bg-brand-100 text-brand-800 ring-brand-300'
                                                                                        : meta.cell
                                                                                }`}
                                                                            >
                                                                                {isSelected && (
                                                                                    <span className="absolute inset-0 rounded-lg ring-2 ring-brand-500 animate-pulseRing pointer-events-none"></span>
                                                                                )}
                                                                                {shift.admin_status !== 'approved' && (
                                                                                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide opacity-80">
                                                                                        <span className={`inline-block h-1 w-1 rounded-full ${meta.dot}`}></span>
                                                                                        {meta.label}
                                                                                    </span>
                                                                                )}
                                                                                {shift.status === 'work' ? (
                                                                                    <>
                                                                                        <span className="font-bold tabular-nums">{shift.start_time?.substring(0, 5)}</span>
                                                                                        <span className="text-[9px] opacity-50">〜</span>
                                                                                        <span className="font-bold tabular-nums">{shift.end_time?.substring(0, 5)}</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <span className="py-1 text-base font-bold">休</span>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            }) : (
                                                <tr>
                                                    <td colSpan={32} className="px-6 py-16 text-center">
                                                        <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-slate-500">
                                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-9a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                            </div>
                                                            <p className="text-sm font-medium">登録されている従業員がいません</p>
                                                        </div>
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
                        <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200/70">
                            <div className="border-b border-slate-200/70 px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-base font-semibold tracking-tight text-slate-900">申請一覧</h3>
                                    <span className="status-pill status-pill-pending">{pendingShifts.length}件</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">未対応の申請を一覧で表示しています</p>
                            </div>
                            {pendingShifts.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 px-6 py-16 text-slate-500">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <p className="text-sm font-medium">未対応の申請はありません</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50/70">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">日付</th>
                                                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">従業員</th>
                                                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">希望内容</th>
                                                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {pendingShifts.map(shift => (
                                                <tr key={shift.id} className="transition hover:bg-slate-50/60">
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium tabular-nums text-slate-900">{shift.date}</td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                                                        <span className="inline-flex items-center gap-2">
                                                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-slate-700 to-slate-900 text-[10px] font-semibold text-white">
                                                                {shift.user?.name?.charAt(0) ?? '?'}
                                                            </span>
                                                            {shift.user?.name}
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                                                        {shift.status === 'work' ? (
                                                            <span className="tabular-nums">{shift.start_time?.substring(0, 5)} 〜 {shift.end_time?.substring(0, 5)}</span>
                                                        ) : (
                                                            <span className="status-pill bg-slate-100 text-slate-700 ring-slate-200">休み希望</span>
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-right">
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
                                                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 hover:text-brand-700"
                                                        >
                                                            詳細
                                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* === ゴミ箱 === */}
                    {activeTab === 'trash' && (
                        <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200/70">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-6 py-4">
                                <div>
                                    <h3 className="text-base font-semibold tracking-tight text-slate-900">ゴミ箱</h3>
                                    <p className="mt-0.5 text-xs text-slate-500">削除されたシフトを管理します（復元・完全削除）</p>
                                </div>
                                {selectedTrashedIds.length > 0 && (
                                    <div className="flex gap-2">
                                        <PrimaryButton onClick={bulkRestoreShifts}>
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                            復元 ({selectedTrashedIds.length})
                                        </PrimaryButton>
                                        <DangerButton onClick={() => setIsForceDeleteConfirmOpen(true)}>
                                            完全削除 ({selectedTrashedIds.length})
                                        </DangerButton>
                                    </div>
                                )}
                            </div>

                            {/* フィルター */}
                            {trashedShifts.length > 0 && (
                                <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-slate-50/40 px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">月</label>
                                        <select
                                            value={trashFilterMonth}
                                            onChange={e => setTrashFilterMonth(e.target.value)}
                                            className="rounded-xl border-slate-200 bg-white text-sm shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                                        >
                                            <option value="all">すべて</option>
                                            {trashMonthOptions.map(m => (
                                                <option key={m} value={m}>{m.replace('-', '年')}月</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">従業員</label>
                                        <select
                                            value={trashFilterUserId}
                                            onChange={e => setTrashFilterUserId(e.target.value)}
                                            className="rounded-xl border-slate-200 bg-white text-sm shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                                        >
                                            <option value="all">すべて</option>
                                            {trashUserOptions.map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">削除日</label>
                                        <select
                                            value={trashFilterDeletedDate}
                                            onChange={e => setTrashFilterDeletedDate(e.target.value)}
                                            className="rounded-xl border-slate-200 bg-white text-sm shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                                        >
                                            <option value="all">すべて</option>
                                            {trashDeletedDateOptions.map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {isTrashFilterActive && (
                                        <button
                                            onClick={resetTrashFilters}
                                            className="ml-auto text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
                                        >
                                            フィルターをクリア
                                        </button>
                                    )}
                                    <div className="text-xs text-slate-500">
                                        表示中: <strong className="font-bold text-slate-900 tabular-nums">{filteredTrashedShifts.length}</strong> / {trashedShifts.length} 件
                                    </div>
                                </div>
                            )}

                            {trashedShifts.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 px-6 py-16 text-slate-500">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" /></svg>
                                    </div>
                                    <p className="text-sm font-medium">ゴミ箱は空です</p>
                                </div>
                            ) : filteredTrashedShifts.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 px-6 py-16 text-slate-500">
                                    <p className="text-sm font-medium">条件に一致するシフトはありません</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50/70">
                                            <tr>
                                                <th className="w-12 px-3 py-3">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded-md border-slate-300 text-brand-600 focus:ring-brand-400/40"
                                                        checked={filteredTrashedShifts.length > 0 && selectedTrashedIds.length === filteredTrashedShifts.length}
                                                        onChange={(e) => {
                                                            setSelectedTrashedIds(e.target.checked ? filteredTrashedShifts.map(s => s.id) : []);
                                                        }}
                                                    />
                                                </th>
                                                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">日付</th>
                                                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">従業員</th>
                                                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">内容</th>
                                                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">削除元</th>
                                                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">削除日時</th>
                                                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {filteredTrashedShifts.map(shift => {
                                                const meta = STATUS_META[shift.admin_status] ?? STATUS_META.pending;
                                                return (
                                                    <tr key={shift.id} className="transition hover:bg-slate-50/60">
                                                        <td className="px-3 py-4">
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4 rounded-md border-slate-300 text-brand-600 focus:ring-brand-400/40"
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
                                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium tabular-nums text-slate-900">{shift.date}</td>
                                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{shift.user?.name}</td>
                                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                                                            {shift.status === 'work'
                                                                ? <span className="tabular-nums">{shift.start_time?.substring(0, 5)} 〜 {shift.end_time?.substring(0, 5)}</span>
                                                                : '休み'}
                                                        </td>
                                                        <td className="whitespace-nowrap px-6 py-4">
                                                            <span className={meta.pill}>{meta.label}</span>
                                                        </td>
                                                        <td className="whitespace-nowrap px-6 py-4 text-sm tabular-nums text-slate-500">
                                                            {shift.deleted_at ? format(new Date(shift.deleted_at), 'yyyy/MM/dd HH:mm') : ''}
                                                        </td>
                                                        <td className="whitespace-nowrap px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => restoreShift(shift.id)}
                                                                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 hover:text-brand-700"
                                                            >
                                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                                                復元
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── 編集モーダル ────────────────────────────── */}
            <Modal show={isEditModalOpen} onClose={closeEditModal}>
                <div className="p-6 sm:p-7">
                    <div className="border-b border-slate-100 pb-4">
                        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                            {modalMode === 'createDraft' && '仮シフトを作成'}
                            {modalMode === 'bulkApprove' && 'まとめて確定'}
                            {modalMode === 'bulkToDraft' && 'まとめて仮シフトに変更'}
                            {modalMode === 'view' && editingShift && (
                                editingShift.admin_status === 'pending' ? 'シフト申請の対応'
                                : editingShift.admin_status === 'draft' ? '仮シフトの編集'
                                : '確定シフトの確認'
                            )}
                        </h2>
                    </div>

                    <div className="mt-5 space-y-5">
                        {/* 単一: view モード */}
                        {modalMode === 'view' && editingShift && (
                            <>
                                <dl className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 text-sm">
                                    <div>
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">従業員</dt>
                                        <dd className="mt-0.5 font-medium text-slate-900">{editingShift.user?.name}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">日付</dt>
                                        <dd className="mt-0.5 font-medium tabular-nums text-slate-900">{editingShift.date}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">状態</dt>
                                        <dd className="mt-0.5">
                                            <span className={STATUS_META[editingShift.admin_status]?.pill}>
                                                {STATUS_META[editingShift.admin_status]?.label}
                                            </span>
                                        </dd>
                                    </div>
                                </dl>

                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">種類</p>
                                    {editingShift.admin_status === 'draft' ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                                                editStatus === 'work' ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-200' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}>
                                                <input type="radio" value="work" checked={editStatus==='work'} onChange={() => setEditStatus('work')} className="sr-only" />
                                                出勤
                                            </label>
                                            <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                                                editStatus === 'off' ? 'border-slate-700 bg-slate-100 text-slate-800 ring-2 ring-slate-300' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}>
                                                <input type="radio" value="off" checked={editStatus==='off'} onChange={() => setEditStatus('off')} className="sr-only" />
                                                休み
                                            </label>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-medium text-slate-900">{editingShift.status === 'work' ? '出勤' : '休み'}</p>
                                    )}
                                </div>

                                {editStatus === 'work' && (
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">時間</p>
                                        <div className="flex items-center gap-2">
                                            <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} disabled={editingShift.admin_status==='approved'} className="block w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30 disabled:bg-slate-100 disabled:text-slate-500" />
                                            <span className="text-slate-400">〜</span>
                                            <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} disabled={editingShift.admin_status==='approved'} className="block w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30 disabled:bg-slate-100 disabled:text-slate-500" />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* 新規 draft 作成 */}
                        {modalMode === 'createDraft' && editTarget && (
                            <>
                                <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 text-sm">
                                    <div>
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">従業員</dt>
                                        <dd className="mt-0.5 font-medium text-slate-900">{editTarget.employee.name}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">日付</dt>
                                        <dd className="mt-0.5 font-medium tabular-nums text-slate-900">{editTarget.date}</dd>
                                    </div>
                                </dl>
                                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
                                    仮シフトとして作成します。後から編集・確定できます。
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">種類</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                                            editStatus === 'work' ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-200' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}>
                                            <input type="radio" value="work" checked={editStatus==='work'} onChange={() => setEditStatus('work')} className="sr-only" />
                                            出勤
                                        </label>
                                        <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                                            editStatus === 'off' ? 'border-slate-700 bg-slate-100 text-slate-800 ring-2 ring-slate-300' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}>
                                            <input type="radio" value="off" checked={editStatus==='off'} onChange={() => setEditStatus('off')} className="sr-only" />
                                            休み
                                        </label>
                                    </div>
                                </div>
                                {editStatus === 'work' && (
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">時間</p>
                                        <div className="flex items-center gap-2">
                                            <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} required className="block w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
                                            <span className="text-slate-400">〜</span>
                                            <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} required className="block w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* 一括確定／一括draft化 */}
                        {(modalMode === 'bulkApprove' || modalMode === 'bulkToDraft') && (
                            <>
                                <div className="rounded-xl bg-brand-50 px-4 py-3 ring-1 ring-inset ring-brand-200">
                                    <p className="text-sm font-bold text-brand-700">
                                        {selectedShifts.length} 件を{modalMode === 'bulkApprove' ? '確定' : '仮シフトに変更'}します
                                    </p>
                                    <p className="mt-1 text-xs text-brand-600">
                                        ※ 出勤希望が含まれる場合、設定した時間で全件上書きされます
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 text-sm">
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">含まれる種類</dt>
                                    <dd className="mt-0.5 font-medium text-slate-900">
                                        {[...new Set(selectedShifts.map(s => s.status === 'work' ? '出勤' : '休み'))].join('、')}
                                    </dd>
                                </div>
                                {selectedShifts.some(s => s.status === 'work') && (
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">時間（出勤希望に適用）</p>
                                        <div className="flex items-center gap-2">
                                            <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} required className="block w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
                                            <span className="text-slate-400">〜</span>
                                            <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} required className="block w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                        <div className="flex flex-wrap items-center gap-2">
                            {modalMode === 'view' && editingShift && (
                                <DangerButton type="button" onClick={requestDelete}>削除</DangerButton>
                            )}
                            {modalMode === 'view' && editingShift?.admin_status === 'draft' && (
                                <SecondaryButton type="button" onClick={submitMoveToPending}>未確定に戻す</SecondaryButton>
                            )}
                        </div>

                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            <SecondaryButton type="button" onClick={closeEditModal}>キャンセル</SecondaryButton>

                            {modalMode === 'view' && editingShift && (
                                <>
                                    {editingShift.admin_status === 'pending' && (
                                        <PrimaryButton type="button" onClick={submitMoveToDraft}>仮シフトにする</PrimaryButton>
                                    )}
                                    {editingShift.admin_status === 'draft' && (
                                        <>
                                            <SecondaryButton type="button" onClick={submitUpdateDraft}>仮シフト更新</SecondaryButton>
                                            <PrimaryButton type="button" onClick={submitApprove}>シフト確定</PrimaryButton>
                                        </>
                                    )}
                                    {editingShift.admin_status === 'approved' && (
                                        <PrimaryButton type="button" onClick={submitMoveToDraft}>仮シフトに戻す</PrimaryButton>
                                    )}
                                </>
                            )}

                            {modalMode === 'createDraft' && (
                                <PrimaryButton type="button" onClick={submitCreateDraft}>作成</PrimaryButton>
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

            {/* 一括選択 フローティング */}
            {isBulkMode && selectedShiftIds.length > 0 && (() => {
                const allDraft = selectedShifts.length > 0 && selectedShifts.every(s => s.admin_status === 'draft');
                return (
                    <div className="fixed bottom-6 left-1/2 z-[90] flex w-max -translate-x-1/2 flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-pop ring-1 ring-slate-200/70 sm:gap-3 sm:px-5 animate-slideDown">
                        <span className="inline-flex items-center gap-2 pr-1 text-sm font-semibold text-slate-700">
                            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 px-1.5 text-xs font-bold text-white">
                                {selectedShiftIds.length}
                            </span>
                            件を選択中
                        </span>
                        <DangerButton onClick={() => setIsRejectConfirmOpen(true)}>削除</DangerButton>
                        {allDraft && (
                            <SecondaryButton onClick={submitBulkMoveToPending}>未確定に戻す</SecondaryButton>
                        )}
                        {allDraft ? (
                            <PrimaryButton onClick={openBulkApproveModal}>シフト確定</PrimaryButton>
                        ) : (
                            <PrimaryButton onClick={openBulkToDraftModal}>仮シフト化</PrimaryButton>
                        )}
                    </div>
                );
            })()}

            {/* 削除確認モーダル */}
            <Modal show={isRejectConfirmOpen} onClose={cancelReject} maxWidth="sm">
                <div className="p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" /></svg>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-base font-semibold tracking-tight text-slate-900">シフトを削除しますか？</h2>
                            <div className="mt-2 text-sm text-slate-600">
                                {editingShift ? (
                                    <p>このシフトをゴミ箱へ移動します。</p>
                                ) : (
                                    <p><strong className="font-bold text-slate-900">{selectedShiftIds.length}件</strong> のシフトをゴミ箱へ移動します。</p>
                                )}
                                <p className="mt-2 text-xs text-brand-600">※ ゴミ箱から復元できます</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton onClick={cancelReject}>キャンセル</SecondaryButton>
                        <DangerButton onClick={executeReject}>ゴミ箱へ移動</DangerButton>
                    </div>
                </div>
            </Modal>

            {/* 全draft確定確認モーダル */}
            <Modal show={isApproveAllDraftsConfirmOpen} onClose={() => setIsApproveAllDraftsConfirmOpen(false)} maxWidth="sm">
                <div className="p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-base font-semibold tracking-tight text-slate-900">仮シフトを全て確定</h2>
                            <div className="mt-2 space-y-2 text-sm text-slate-600">
                                <p>
                                    <strong className="font-bold text-slate-900">{format(currentMonth, 'yyyy年MM月')}</strong> の仮シフト{' '}
                                    <strong className="font-bold text-slate-900">{draftCount}件</strong> をすべて確定します。
                                </p>
                                {pendingCountInMonth > 0 && (
                                    <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700 ring-1 ring-inset ring-rose-200">
                                        未確定の申請 <strong className="font-bold">{pendingCountInMonth}件</strong> はゴミ箱へ移動します
                                    </p>
                                )}
                                <p className="text-xs text-slate-500">確定後も、個別に「仮シフトに差し戻す」ことで再編集できます。ゴミ箱へ移動した申請はゴミ箱タブから復元できます。</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton onClick={() => setIsApproveAllDraftsConfirmOpen(false)}>キャンセル</SecondaryButton>
                        <PrimaryButton onClick={executeApproveAllDrafts}>すべて確定する</PrimaryButton>
                    </div>
                </div>
            </Modal>

            {/* 完全削除確認モーダル */}
            <Modal show={isForceDeleteConfirmOpen} onClose={() => setIsForceDeleteConfirmOpen(false)} maxWidth="sm">
                <div className="p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-base font-semibold tracking-tight text-slate-900">完全削除</h2>
                            <div className="mt-2 text-sm text-slate-600">
                                <p><strong className="font-bold text-slate-900">{selectedTrashedIds.length}件</strong> のシフトを完全削除します。</p>
                                <p className="mt-2 text-xs font-semibold text-rose-600">※ この操作は取り消せません</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton onClick={() => setIsForceDeleteConfirmOpen(false)}>キャンセル</SecondaryButton>
                        <DangerButton onClick={executeForceDelete}>完全削除する</DangerButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
