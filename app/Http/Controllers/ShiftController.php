<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ShiftController extends Controller
{
    /**
     * シフト・休み希望を保存する（従業員）
     */
    public function store(Request $request)
    {
        // 「一括申請（dates）」と「単一申請（date）」の両方に対応させる
        $dates = $request->has('dates') ? $request->dates : [$request->date];

        foreach ($dates as $date) {
            Shift::updateOrCreate(
                [
                    'user_id' => auth()->id(),
                    'date' => $date,
                ],
                [
                    'status' => $request->status,
                    'start_time' => $request->start_time,
                    'end_time' => $request->end_time,
                    'admin_status' => 'pending' // 未確定状態
                ]
            );
        }

        return redirect()->back();
    }

    /**
     * 自分のシフト一覧を取得する（従業員カレンダー表示用）
     */
    public function index()
    {
        return response()->json(Shift::where('user_id', auth()->id())->get());
    }

    /**
     * 【店長用】月別シフト一覧（マトリックス表示用）
     */
    public function adminIndex(Request $request)
    {
        $month = $request->query('month', date('Y-m'));

        // role='user'の従業員と、対象月のシフト（pending/draft/approved すべて）を取得
        $users = User::where('role', 'user')
            ->with(['shifts' => function ($query) use ($month) {
                $query->where('date', 'like', $month . '%');
            }])
            ->get();

        return response()->json($users);
    }

    /**
     * 【店長用】未承認（pending）シフト一覧
     */
    public function pendingShifts()
    {
        return response()->json(
            Shift::with('user')
                ->where('admin_status', 'pending')
                ->orderBy('date')
                ->get()
        );
    }

    /**
     * 【店長用】仮シフト（draft）を新規作成する
     * 申請がない日付に店長判断で直接シフトを組むためのエンドポイント
     */
    public function storeDraft(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'status' => 'required|in:work,off',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string',
        ]);

        // 既に同日同ユーザーのシフトがある場合は上書きで draft 化
        $shift = Shift::updateOrCreate(
            [
                'user_id' => $validated['user_id'],
                'date' => $validated['date'],
            ],
            [
                'status' => $validated['status'],
                'start_time' => $validated['status'] === 'work' ? ($validated['start_time'] ?? null) : null,
                'end_time' => $validated['status'] === 'work' ? ($validated['end_time'] ?? null) : null,
                'admin_status' => 'draft',
            ]
        );

        return response()->json(['message' => '仮シフトを作成しました', 'shift' => $shift]);
    }

    /**
     * 【店長用】既存シフトの内容を更新する（仮シフトの編集）
     */
    public function updateShift(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:work,off',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string',
            'admin_status' => 'sometimes|in:pending,draft,approved',
        ]);

        $shift = Shift::findOrFail($id);
        $shift->update($validated);

        return response()->json(['message' => 'シフトを更新しました', 'shift' => $shift]);
    }

    /**
     * 【店長用】シフトを「仮シフト（draft）」に変更する
     * pending → draft（仮確定）または approved → draft（差し戻し）に使用
     */
    public function moveToDraft(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'nullable|in:work,off',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string',
        ]);

        $shift = Shift::findOrFail($id);
        $shift->update([
            'status' => $validated['status'] ?? $shift->status,
            'start_time' => $validated['start_time'] ?? $shift->start_time,
            'end_time' => $validated['end_time'] ?? $shift->end_time,
            'admin_status' => 'draft',
        ]);

        return response()->json(['message' => '仮シフトに変更しました', 'shift' => $shift]);
    }

    /**
     * 【店長用】複数シフトを一括で draft 化する
     */
    public function bulkMoveToDraft(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:shifts,id',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string',
        ]);

        $update = ['admin_status' => 'draft'];
        if (array_key_exists('start_time', $validated)) {
            $update['start_time'] = $validated['start_time'];
        }
        if (array_key_exists('end_time', $validated)) {
            $update['end_time'] = $validated['end_time'];
        }

        Shift::whereIn('id', $validated['ids'])->update($update);

        return response()->json([
            'message' => count($validated['ids']) . '件を仮シフトに変更しました'
        ]);
    }

    /**
     * 【店長用】仮シフト（draft）を未確定（pending）に戻す
     */
    public function moveToPending($id)
    {
        $shift = Shift::findOrFail($id);

        if ($shift->admin_status !== 'draft') {
            return response()->json(['message' => '仮シフト以外は未確定に戻せません'], 422);
        }

        $shift->update(['admin_status' => 'pending']);

        return response()->json(['message' => '未確定に戻しました', 'shift' => $shift]);
    }

    /**
     * 【店長用】複数の仮シフトを一括で未確定に戻す
     * draft 以外は対象外（pending/approved は変更しない）
     */
    public function bulkMoveToPending(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:shifts,id',
        ]);

        $count = Shift::whereIn('id', $validated['ids'])
            ->where('admin_status', 'draft')
            ->update(['admin_status' => 'pending']);

        return response()->json(['message' => "{$count}件を未確定に戻しました"]);
    }

    /**
     * 【店長用】シフトを確定する（pending/draft → approved）
     */
    public function approve(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'nullable|in:work,off',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string',
        ]);

        $shift = Shift::findOrFail($id);
        $newStatus = $validated['status'] ?? $shift->status;

        $shift->update([
            'status' => $newStatus,
            'start_time' => $newStatus === 'work' ? ($validated['start_time'] ?? $shift->start_time) : null,
            'end_time' => $newStatus === 'work' ? ($validated['end_time'] ?? $shift->end_time) : null,
            'admin_status' => 'approved'
        ]);

        return response()->json(['message' => 'シフトを確定しました']);
    }

    /**
     * 【店長用】複数のシフトを一括で確定する
     * pending/draft どちらからでも approved に昇格させる
     */
    public function bulkApprove(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:shifts,id',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string',
        ]);

        $update = ['admin_status' => 'approved'];
        // 時間が指定されているときだけ上書きする（指定なしなら個々のシフトの時間を保持）
        if (!empty($validated['start_time'])) {
            $update['start_time'] = $validated['start_time'];
        }
        if (!empty($validated['end_time'])) {
            $update['end_time'] = $validated['end_time'];
        }

        Shift::whereIn('id', $validated['ids'])
            ->whereIn('admin_status', ['pending', 'draft'])
            ->update($update);

        return response()->json(['message' => count($validated['ids']) . '件のシフトを確定しました']);
    }

    /**
     * 【店長用】月内のすべての draft を一括確定し、pending はゴミ箱へ移動する
     */
    public function approveAllDrafts(Request $request)
    {
        $validated = $request->validate([
            'month' => 'required|string', // 形式: yyyy-MM
        ]);

        $approvedCount = Shift::where('admin_status', 'draft')
            ->where('date', 'like', $validated['month'] . '%')
            ->update(['admin_status' => 'approved']);

        $rejectedCount = Shift::where('admin_status', 'pending')
            ->where('date', 'like', $validated['month'] . '%')
            ->delete();

        $messages = [];
        if ($approvedCount > 0) {
            $messages[] = "{$approvedCount}件の仮シフトを確定しました";
        }
        if ($rejectedCount > 0) {
            $messages[] = "未確定の申請{$rejectedCount}件をゴミ箱へ移動しました";
        }
        $message = $messages ? implode(' / ', $messages) : '対象のシフトはありませんでした';

        return response()->json([
            'message' => $message,
            'approved_count' => $approvedCount,
            'rejected_count' => $rejectedCount,
        ]);
    }

    /**
     * 【店長用】単一シフトを却下する（論理削除）
     */
    public function reject($id)
    {
        $shift = Shift::findOrFail($id);
        $shift->delete();

        return response()->json(['message' => '申請を却下しました']);
    }

    /**
     * 【店長用】複数シフトを一括で却下する（論理削除）
     */
    public function bulkReject(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:shifts,id',
        ]);

        Shift::whereIn('id', $validated['ids'])->delete();

        return response()->json(['message' => count($validated['ids']) . '件の申請を却下しました']);
    }

    /**
     * 【店長用】ゴミ箱（論理削除済みシフト）一覧
     */
    public function trashedShifts()
    {
        return response()->json(
            Shift::onlyTrashed()
                ->with('user')
                ->orderBy('deleted_at', 'desc')
                ->get()
        );
    }

    /**
     * 【店長用】ゴミ箱から復元する
     */
    public function restore($id)
    {
        $shift = Shift::onlyTrashed()->findOrFail($id);
        $shift->restore();

        return response()->json(['message' => 'シフトを復元しました', 'shift' => $shift]);
    }

    /**
     * 【店長用】複数シフトを一括復元する
     */
    public function bulkRestore(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer',
        ]);

        $count = Shift::onlyTrashed()->whereIn('id', $validated['ids'])->restore();

        return response()->json(['message' => "{$count}件のシフトを復元しました"]);
    }

    /**
     * 【店長用】完全削除（物理削除）
     */
    public function forceDelete($id)
    {
        $shift = Shift::onlyTrashed()->findOrFail($id);
        $shift->forceDelete();

        return response()->json(['message' => 'シフトを完全削除しました']);
    }

    /**
     * 【店長用】複数シフトを一括完全削除
     */
    public function bulkForceDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer',
        ]);

        $count = Shift::onlyTrashed()->whereIn('id', $validated['ids'])->forceDelete();

        return response()->json(['message' => "{$count}件のシフトを完全削除しました"]);
    }
}
