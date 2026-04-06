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

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');

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
        setEditingShift(shift);
        setEditStartTime(shift.start_time ? shift.start_time.substring(0, 5) : '');
        setEditEndTime(shift.end_time ? shift.end_time.substring(0, 5) : '');
        setIsEditModalOpen(true);
    };

    const handleApprove = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/admin/shifts/${editingShift.id}/approve`, {
                start_time: editStartTime,
                end_time: editEndTime,
            });
            setIsEditModalOpen(false);
            fetchAdminData();
            alert('シフトを確定しました');
        } catch (error) {
            console.error("承認エラー", error);
        }
    };

    // CSVエクスポート処理
    const handleExportCSV = () => {
        if (employees.length === 0) {
            alert('出力するデータがありません。');
            return;
        }

        const daysInMonth = getDaysInMonth(currentMonth);
        
        // ヘッダー行を作成（従業員名, 1日, 2日, 3日...）
        const header = ['従業員名', ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}日`)];
        let csvContent = header.join(',') + '\n';

        // 各従業員のデータ行を作成
        employees.forEach(employee => {
            const row = [employee.name]; // 1列目は従業員名
            
            for (let day = 1; day <= daysInMonth; day++) {
                // 日付の文字列を作成 (例: 2026-04-01)
                const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const shift = employee.shifts?.find(s => s.date === dateStr);
                
                if (shift) {
                    if (shift.status === 'work') {
                        // 出勤の場合は「09:00〜18:00」のように結合して出力
                        const start = shift.start_time ? shift.start_time.substring(0, 5) : '';
                        const end = shift.end_time ? shift.end_time.substring(0, 5) : '';
                        row.push(`"${start}\n〜\n${end}"`);
                    } else {
                        // 休みの場合は「休」
                        row.push('休');
                    }
                } else {
                    // シフトが入っていない日は空欄
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
                            {/* CSV出力ボタン */}
                            <div className="flex justify-between">
                                <div></div>
                                <button 
                                    onClick={handleExportCSV} 
                                    className="px-4 py-2 mb-4 bg-gray-600 text-white font-semibold rounded hover:bg-gray-700 shadow-sm transition-colors flex items-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    CSV出力
                                </button>
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
                                                            <td key={day} className="whitespace-nowrap px-2 py-3 text-sm text-center border-r">
                                                                {shift ? (
                                                                    shift.status === 'work' ? (
                                                                        // 出勤の場合は時間を縦に並べて見やすくする
                                                                        <div className="flex flex-col items-center justify-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                                            <span>{shift.start_time.substring(0, 5)}</span>
                                                                            <span className="text-[10px] text-blue-400">|</span>
                                                                            <span>{shift.end_time.substring(0, 5)}</span>
                                                                        </div>
                                                                    ) : (
                                                                        // 休みの場合
                                                                        <div className="flex items-center justify-center rounded-md bg-red-50 px-2 py-3 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                                                                            休
                                                                        </div>
                                                                    )
                                                                ) : (
                                                                    <span className="text-gray-300">-</span>
                                                                )}
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
                <form onSubmit={handleApprove} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 border-b pb-2">シフトの確認と確定</h2>
                    {editingShift && (
                        <div className="mt-4 space-y-4">
                            <p><strong>従業員:</strong> {editingShift.user?.name}</p>
                            <p><strong>日付:</strong> {editingShift.date}</p>
                            <p><strong>希望種類:</strong> {editingShift.status === 'work' ? '出勤' : '休み'}</p>

                            {editingShift.status === 'work' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">時間の修正（必要に応じて）</label>
                                    <div className="flex items-center gap-2">
                                        <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} required className="border-gray-300 rounded-md shadow-sm" />
                                        <span>〜</span>
                                        <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} required className="border-gray-300 rounded-md shadow-sm" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsEditModalOpen(false)}>キャンセル</SecondaryButton>
                        <PrimaryButton>確定する</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}