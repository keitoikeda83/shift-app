import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
// 日付操作用ライブラリ（date-fns）の機能を追加
import { format, getDaysInMonth, addMonths, subMonths } from 'date-fns';

export default function AdminDashboard({ auth }) {
    const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' or 'pending'
    const [currentMonth, setCurrentMonth] = useState(new Date()); // 表示対象の月
    const [employees, setEmployees] = useState([]); // 従業員とシフトのデータ
    const [pendingShifts, setPendingShifts] = useState([]);
    const [shiftFilter, setShiftFilter] = useState('all'); // 'all', 'approved', 'pending'
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [flashMessage, setFlashMessage] = useState('');
    const [isBulkMode, setIsBulkMode] = useState(false); // 一括確定モード
    const [selectedShiftIds, setSelectedShiftIds] = useState([]); // 選択されたシフトのID
    const [isBulkEdit, setIsBulkEdit] = useState(false);

    // セルをクリックした時の処理
    const handleShiftClick = (shift) => {
        const isApproved = shift.admin_status === 'approved';
        
        if (!isBulkMode) {
            // 通常モード：確定済み（緑）でなければ編集モーダルを開く
            if (!isApproved) openEditModal(shift);
            return;
        }

        // 一括選択モード：確定済み以外（未確定・仮確定）を選択可能にする
        if (!isApproved) {
            setSelectedShiftIds(prev => 
                prev.includes(shift.id) 
                    ? prev.filter(id => id !== shift.id) 
                    : [...prev, shift.id]
            );
        }
    };

    // // 一括確定を実行する処理
    // const handleBulkApprove = async () => {
    //     try {
    //         await axios.put('/admin/shifts/bulk-approve', { ids: selectedShiftIds });
    //         setSelectedShiftIds([]);
    //         setIsBulkMode(false);
    //         fetchAdminData();
    //         setFlashMessage(`${selectedShiftIds.length}件のシフトを確定しました`);
    //         setTimeout(() => setFlashMessage(''), 3000);
    //     } catch (error) {
    //         console.error("一括確定エラー", error);
    //     }
    // };

    // データの取得
    const fetchAdminData = async () => {
        try {
            const monthStr = format(currentMonth, 'yyyy-MM');
            // 月を指定してマトリックス用データを取得
            const approvedRes = await axios.get('/admin/shifts', { params: { month: monthStr } });
            const pendingRes = await axios.get('/admin/shifts/pending');
            setEmployees(approvedRes.data);
            setPendingShifts(pendingRes.data);
        } catch (error) {
            console.error("データ取得失敗", error);
        }
    };

    // currentMonth（表示している月）が変わるたびにデータを再取得
    useEffect(() => {
        fetchAdminData();
    }, [currentMonth]);

    const openEditModal = (shift) => {
        setIsBulkEdit(false);
        setEditingShift(shift);
        setEditStartTime(shift.start_time ? shift.start_time.substring(0, 5) : '');
        setEditEndTime(shift.end_time ? shift.end_time.substring(0, 5) : '');
        setIsEditModalOpen(true);
    };

    const handleBulkConfirmClick = () => {
        setIsBulkEdit(true);
        setEditingShift(null);
        setEditStartTime('18:00'); // 一括編集時のデフォルト開始時間
        setEditEndTime('23:00');   // 一括編集時のデフォルト終了時間
        setIsEditModalOpen(true);
    };

    // ステータス更新（仮確定にする / 未確定に戻す）
    const handleStatusUpdate = async (e, targetStatus) => {
        e.preventDefault();
        try {
            if (isBulkEdit) {
                // 一括更新のAPIを叩く
                await axios.put('/admin/shifts/bulk-update', {
                    ids: selectedShiftIds,
                    start_time: editStartTime,
                    end_time: editEndTime,
                    admin_status: targetStatus // 'tentative' または 'pending'
                });
                setSelectedShiftIds([]);
                setIsBulkMode(false);
            } else {
                // 単一更新のAPIを叩く
                await axios.put(`/admin/shifts/${editingShift.id}/update-status`, {
                    start_time: editStartTime,
                    end_time: editEndTime,
                    admin_status: targetStatus
                });
            }

            setIsEditModalOpen(false);
            fetchAdminData();
            setFlashMessage(targetStatus === 'tentative' ? '仮確定にしました' : '未確定に戻しました');
            setTimeout(() => setFlashMessage(''), 3000);
        } catch (error) {
            console.error("ステータス更新エラー", error);
        }
    };

    // シフト反映（確定して従業員画面へ反映、未確定を削除）
    const handlePublish = async (period) => {
        const periodText = period === 1 ? '前半(1日~15日)' : '後半(16日~末日)';
        if (!window.confirm(`本当に${periodText}のシフトを確定し、反映しますか？\n※残っている未確定申請は削除され、従業員は申請不可になります。`)) return;
        
        try {
            await axios.post('/admin/shifts/publish', {
                month: format(currentMonth, 'yyyy-MM'),
                period: period // 1:前半, 2:後半
            });
            fetchAdminData();
            setFlashMessage('シフトを確定し、反映しました');
            setTimeout(() => setFlashMessage(''), 3000);
        } catch (error) {
            console.error("反映エラー", error);
        }
    };

    // CSVエクスポート処理
    const handleExportCSV = () => {
        if (employees.length === 0) {
            alert('出力するデータがありません。');
            return;
        }

        const daysInMonth = getDaysInMonth(currentMonth);
        
        // ヘッダー行を作成（空白, 1日, 2日, 3日...）
        const header = ['', ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}日`)];
        let csvContent = header.join(',') + '\n';

        // 各従業員のデータ行を作成
        employees.forEach(employee => {
            const row = [employee.name]; // 1列目は従業員名
            
            for (let day = 1; day <= daysInMonth; day++) {
                // 日付の文字列を作成 (例: 2026-04-01)
                const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const shift = employee.shifts?.find(s => s.date === dateStr);
                
                // シフトが存在し、かつ「確定済み（approved）」の場合のみ出力する
                if (shift && shift.admin_status === 'approved') {
                    if (shift.status === 'work') {
                        // 出勤の場合は時間を改行して出力
                        const start = shift.start_time ? shift.start_time.substring(0, 5) : '';
                        const end = shift.end_time ? shift.end_time.substring(0, 5) : '';
                        row.push(`"${start}\n〜\n${end}"`);
                    } else {
                        // 休みの場合は「休」
                        row.push('休');
                    }
                } else {
                    // シフトが入っていない日、または「未確定」の日は空欄にする
                    row.push('');
                }
            }
            csvContent += row.join(',') + '\n';
        });

        // Excelでの文字化けを防ぐためのBOM（Byte Order Mark）を付与
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // ダウンロード用のリンクを生成して自動クリック
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `シフト表_${format(currentMonth, 'yyyy年MM月')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">シフト管理</h2>}>
            <Head title="シフト管理" />

            {flashMessage && (
                <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center space-x-2 transition-all">
                    {/* チェックマークのアイコン */}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    <span className="font-bold text-sm">{flashMessage}</span>
                </div>
            )}

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    
                    {/* タブ切り替えボタン */}
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
                    </div>

                    {/* === マトリックス表示エリア === */}
                    {activeTab === 'matrix' && (
                        <div>
                            {/* コントロールエリア */}
                            <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
                                <label className="flex items-center cursor-pointer bg-white px-4 py-2 rounded-full shadow-sm border">
                                    <span className="mr-3 text-sm font-bold text-gray-700">一括選択モード</span>
                                    <div className="relative">
                                        <input type="checkbox" className="sr-only" checked={isBulkMode} onChange={() => { setIsBulkMode(!isBulkMode); setSelectedShiftIds([]); }} />
                                        <div className={`block w-12 h-6 rounded-full transition-colors ${isBulkMode ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isBulkMode ? 'transform translate-x-6' : ''}`}></div>
                                    </div>
                                </label>
                                
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handlePublish(1)} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded shadow-sm hover:bg-indigo-700">前半を反映(1~15日)</button>
                                    <button onClick={() => handlePublish(2)} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded shadow-sm hover:bg-indigo-700">後半を反映(16~末日)</button>
                                    <button onClick={handleExportCSV} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded hover:bg-gray-700 shadow-sm flex items-center">
                                        CSV出力
                                    </button>
                                </div>
                            </div>
                            <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                                {/* 月切り替えコントロール */}
                                <div className="flex justify-between items-center mb-4">
                                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="px-4 py-2 border rounded hover:bg-gray-50">
                                        &lt; 前月
                                    </button>
                                    <h3 className="text-xl font-bold">{format(currentMonth, 'yyyy年 MM月')}</h3>
                                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="px-4 py-2 border rounded hover:bg-gray-50">
                                        次月 &gt;
                                    </button>
                                </div>

                                {/* テーブル本体（横スクロールコンテナ） */}
                                <div className="overflow-x-auto relative shadow ring-1 ring-black ring-opacity-5 rounded">
                                    <table className="min-w-full divide-y divide-gray-300 border-collapse">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {/* 左端固定の従業員列 */}
                                                <th scope="col" className="sticky left-0 z-10 bg-gray-100 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 border-b border-r shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]">
                                                    従業員
                                                </th>
                                                {/* 日付の列（1日〜月末まで生成） */}
                                                {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
                                                    // その日の曜日を計算（0:日, 1:月, ..., 6:土）
                                                    const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                                    const weekDayIndex = dateObj.getDay();
                                                    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

                                                    // 土日の文字色を変える
                                                    let textColor = "text-gray-900";
                                                    if (weekDayIndex === 0) textColor = "text-red-600"; // 日曜は赤
                                                    if (weekDayIndex === 6) textColor = "text-blue-600"; // 土曜は青
                                                
                                                    return (
                                                        <th key={day} scope="col" className={`px-3 py-2 text-center border-b border-r min-w-[90px] ${textColor}`}>
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
                                                    {/* 左端固定の従業員名 */}
                                                    <td className="sticky left-0 z-10 bg-white whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-gray-900 border-r shadow-[1px_0_0_0_#e5e7eb]">
                                                        {employee.name}
                                                    </td>
                                                    {/* 各日のシフト内容 */}
                                                    {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
                                                        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                        const shift = employee.shifts?.find(s => s.date === dateStr);

                                                        return (
                                                            <td key={day} className="whitespace-nowrap px-1 py-2 text-sm text-center border-r">
                                                                {(() => {
                                                                    // ① フィルター設定に合わないものは非表示（null）にする
                                                                    if (shiftFilter !== 'all' && shift?.admin_status !== shiftFilter) {
                                                                        return <span className="text-gray-200">-</span>;
                                                                    }

                                                                    if (shift) {
                                                                        const isPending = shift.admin_status === 'pending'; 
                                                                        const isTentative = shift.admin_status === 'tentative';
                                                                        const isApproved = shift.admin_status === 'approved';

                                                                        return (
                                                                            <div 
                                                                                onClick={() => handleShiftClick({ ...shift, user: employee })}
                                                                                className={`flex flex-col items-center justify-center rounded-md px-1 py-1 text-xs font-medium ring-1 ring-inset ${
                                                                                    !isApproved ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''
                                                                                } ${
                                                                                    selectedShiftIds.includes(shift.id)
                                                                                        ? 'relative bg-blue-100 text-blue-700 ring-transparent after:absolute after:inset-0 after:rounded-md after:ring-2 after:ring-blue-500 after:animate-pulse after:pointer-events-none'
                                                                                        : isApproved 
                                                                                            ? (shift.status === 'work' ? 'bg-green-50 text-green-600 ring-green-600/10' : 'bg-gray-50 text-gray-700 ring-gray-700/10')
                                                                                            : isTentative
                                                                                                // 出勤・休みを問わず、仮確定はすべて黄色で統一します
                                                                                                ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/30'
                                                                                                : 'bg-red-50 text-red-600 ring-red-600/10'
                                                                                }`}
                                                                            >
                                                                                {isPending && <span className="text-[9px] mb-0.5 font-bold text-red-600">未確定</span>}
                                                                                {isTentative && <span className="text-[9px] mb-0.5 font-bold text-yellow-600">仮確定</span>}

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
                                                                    }
                                                                    // シフトが何も入っていない場合
                                                                    return <span className="text-gray-200">-</span>;
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

                    {/* === 申請一覧エリア === */}
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
                                                    {shift.status === 'work' ? `${shift.start_time.substring(0, 5)} 〜 ${shift.end_time.substring(0, 5)}` : '休み希望'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button onClick={() => openEditModal(shift)} className="text-blue-600 hover:text-blue-900">
                                                        確認・確定
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* モーダル */}
            <Modal show={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
                <form className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 border-b pb-2">
                        {isBulkEdit ? 'シフト一括確定' : 'シフト確認と確定'}
                    </h2>
                    
                    <div className="mt-4 space-y-4">
                        {isBulkEdit ? (
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                                <p className="text-blue-700 font-bold">
                                    {selectedShiftIds.length} 件の申請をまとめて確定します。
                                </p>
                             
                                <p className="text-xs text-blue-600 mt-1">※設定した時間は選択したすべてのシフトに適用されます。</p>
                            </div>
                        ) : (
                            editingShift && (
                                <>
                                    <p className="text-gray-700"><strong>従業員:</strong> {editingShift.user?.name}</p>
                                    <p className="text-gray-700"><strong>日付:</strong> {editingShift.date}</p>
                                    <p className="text-gray-700"><strong>希望種類:</strong> {editingShift.status === 'work' ? '出勤' : '休み'}</p>
                                </>
                            )
                        )}

                    {isBulkEdit && (
                        <div className="mt-2 text-gray-700">
                            <strong>希望種類:</strong> {
                                [...new Set(
                                    employees.flatMap(e => e.shifts || [])
                                        .filter(s => selectedShiftIds.includes(s.id))
                                        .map(s => s.status === 'work' ? '出勤' : '休み')
                                )].join('、')
                            }
                        </div>
                    )}
                    {((!isBulkEdit && editingShift?.status === 'work') || 
                      (isBulkEdit && employees.flatMap(e => e.shifts || []).filter(s => selectedShiftIds.includes(s.id)).some(s => s.status === 'work'))) && (
                        <div>
                            <label className="block font-medium text-gray-700 mb-1 mt-3">
                                <strong>シフト時間の{isBulkEdit ? '一括' : ''}編集</strong>
                            </label>
                            <div className="flex items-center gap-2">
                                <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} required className="border-gray-300 rounded-md shadow-sm" />
                                <span>〜</span>
                                <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} required className="border-gray-300 rounded-md shadow-sm" />
                            </div>
                        </div>
                    )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setIsEditModalOpen(false)}>キャンセル</SecondaryButton>

                        {/* 👇 未確定に戻すボタン：一括編集時、または個別編集で現在が未確定以外の場合に表示 */}
                        {(isBulkEdit || (editingShift && editingShift.admin_status !== 'pending')) && (
                            <button type="button" onClick={(e) => handleStatusUpdate(e, 'pending')} className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm font-semibold hover:bg-gray-600">
                                未確定に戻す
                            </button>
                        )}

                        {/* 👇 仮確定にするボタン：一括編集時、または個別編集で現在が仮確定以外の場合に表示 */}
                        {(isBulkEdit || (editingShift && editingShift.admin_status !== 'tentative')) && (
                            <button type="button" onClick={(e) => handleStatusUpdate(e, 'tentative')} className="px-4 py-2 bg-yellow-500 text-white rounded-md text-sm font-semibold hover:bg-yellow-600">
                                仮確定にする
                            </button>
                        )}
                    </div>
                </form>
            </Modal>
            {isBulkMode && selectedShiftIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white px-6 py-4 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-blue-200 z-[90] flex items-center space-x-4 w-max">
                    <span className="font-bold text-gray-700 text-sm">{selectedShiftIds.length}件を選択中</span>
                    <PrimaryButton onClick={handleBulkConfirmClick}>まとめて確定</PrimaryButton>
                </div>
            )}
        </AuthenticatedLayout>
    );
}