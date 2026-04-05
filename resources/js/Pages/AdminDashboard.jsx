import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import ShiftCalendar from '../ShiftCalendar';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

export default function AdminDashboard({ auth }) {
    const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' or 'pending'
    const [approvedShifts, setApprovedShifts] = useState([]);
    const [pendingShifts, setPendingShifts] = useState([]);

    // 編集モーダル用ステート
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');

    const fetchAdminData = async () => {
        try {
            const approvedRes = await axios.get('/admin/shifts');
            const pendingRes = await axios.get('/admin/shifts/pending');
            setApprovedShifts(approvedRes.data);
            setPendingShifts(pendingRes.data);
        } catch (error) {
            console.error("データ取得失敗", error);
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, []);

    // 承認（編集）モーダルを開く
    const openEditModal = (shift) => {
        setEditingShift(shift);
        setEditStartTime(shift.start_time || '');
        setEditEndTime(shift.end_time || '');
        setIsEditModalOpen(true);
    };

    // シフトを確定する
    const handleApprove = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/admin/shifts/${editingShift.id}/approve`, {
                start_time: editStartTime,
                end_time: editEndTime,
            });
            setIsEditModalOpen(false);
            fetchAdminData(); // データ再取得
            alert('シフトを確定しました');
        } catch (error) {
            console.error("承認エラー", error);
        }
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">店長ダッシュボード</h2>}>
            <Head title="Admin Dashboard" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    
                    {/* タブ切り替えボタン */}
                    <div className="flex space-x-4 mb-6 border-b pb-2">
                        <button 
                            className={`px-4 py-2 font-bold ${activeTab === 'calendar' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                            onClick={() => setActiveTab('calendar')}
                        >
                            確定済カレンダー
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

                    {/* カレンダー表示エリア */}
                    {activeTab === 'calendar' && (
                        <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                            <ShiftCalendar shifts={approvedShifts} onDateClick={() => {}} />
                            <p className="mt-4 text-sm text-gray-500">※ここでは確定済みのシフトのみ表示されています。</p>
                        </div>
                    )}

                    {/* 申請一覧エリア */}
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
                                                    {shift.status === 'work' ? `${shift.start_time} 〜 ${shift.end_time}` : '休み希望'}
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

            {/* 時間編集＆確定用モーダル */}
            <Modal show={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
                <form onSubmit={handleApprove} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 border-b pb-2">
                        シフトの確認と確定
                    </h2>
                    
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
                                    <p className="text-xs text-gray-500 mt-2">※時間を変更して確定すると、変更後の時間が反映されます。</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setIsEditModalOpen(false)}>キャンセル</SecondaryButton>
                        <PrimaryButton>この内容で確定する</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}