<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ShiftController extends Controller
{
    /**
     * シフト・休み希望を保存する
     */
    public function store(Request $request)
    {
        $dates = $request->has('dates') ? $request->dates : [$request->date];

        // ロックチェック（すでに確定済みの期間が含まれていないか確認）
        foreach ($dates as $date) {
            $day = (int)date('d', strtotime($date));
            $month = date('Y-m', strtotime($date));
            $isFirstHalf = $day <= 15;
            $start = $isFirstHalf ? "$month-01" : "$month-16";
            $end = $isFirstHalf ? "$month-15" : date('Y-m-t', strtotime($date));

            $isLocked = \App\Models\Shift::whereBetween('date', [$start, $end])
                ->where('admin_status', 'approved')
                ->exists();

            if ($isLocked) {
                return redirect()->back()->withErrors(['error' => 'すでにシフトが確定している期間が含まれているため、申請できません。']);
            }
        }

        // 保存処理
        foreach ($dates as $date) {
            \App\Models\Shift::updateOrCreate(
                ['user_id' => auth()->id(), 'date' => $date],
                [
                    'status' => $request->status,
                    'start_time' => $request->start_time,
                    'end_time' => $request->end_time,
                    'admin_status' => 'pending'
                ]
            );
        }
        return redirect()->back();
    }

    /**
     * 自分のシフト一覧を取得する（後でカレンダー表示に使用）
     */
    public function index()
    {
        // 確実にJSON形式で返す
        return response()->json(Shift::where('user_id', auth()->id())->get());
    }

    /**
     * 【店長用】確定済みシフト（カレンダー表示用）
     */
    public function adminIndex(Request $request)
    {
        // 画面から月（例: 2026-04）が送られてこなければ今月にする
        $month = $request->query('month', date('Y-m'));

        // roleが'user'（一般従業員）の人を全員取得し、対象月のシフト（未確定・確定すべて）を結合する
        $users = User::where('role', 'user')
            ->with(['shifts' => function ($query) use ($month) {
                // admin_status の絞り込みを外し、その月の全シフトを取得するように変更
                $query->where('date', 'like', $month . '%');
            }])
            ->get();

        return response()->json($users);
    }

    /**
     * 【店長用】未承認シフト（申請一覧用）
     */
    public function pendingShifts()
    {
        return response()->json(Shift::with('user')->where('admin_status', 'pending')->orderBy('date')->get());
    }

    /**
     * 確定済みの期間（前半/後半）を取得する
     */
    public function lockedPeriods()
    {
        $approvedDates = Shift::where('admin_status', 'approved')->pluck('date');
        $locked = [];
        foreach ($approvedDates as $date) {
            $day = (int)date('d', strtotime($date));
            $month = date('Y-m', strtotime($date));
            $half = $day <= 15 ? 1 : 2;
            $locked["{$month}-{$half}"] = true;
        }
        return response()->json(array_keys($locked));
    }

    /**
     * 【店長用】単一シフトのステータス更新（仮確定 / 未確定）
     */
    public function updateStatus(Request $request, $id)
    {
        $shift = Shift::findOrFail($id);
        $shift->update([
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'admin_status' => $request->admin_status // 'tentative' or 'pending'
        ]);
        return response()->json(['message' => 'シフトを更新しました']);
    }

    /**
     * 【店長用】複数シフトの一括ステータス更新
     */
    public function bulkUpdate(Request $request)
    {
        \App\Models\Shift::whereIn('id', $request->ids)
            ->update([
                'start_time' => $request->start_time ?? \DB::raw('start_time'),
                'end_time' => $request->end_time ?? \DB::raw('end_time'),
                'admin_status' => $request->admin_status
            ]);

        return response()->json(['message' => 'シフトを一括更新しました']);
    }

    /**
     * 【店長用】シフトの反映（仮確定→確定、未確定→削除）
     */
    public function publish(Request $request)
    {
        $month = $request->input('month'); // 例: 2026-04
        $period = $request->input('period'); // 1(前半) or 2(後半)

        $startDay = $period === 1 ? '01' : '16';
        $endDay = $period === 1 ? '15' : date('t', strtotime($month . '-01'));
        $startDate = "{$month}-{$startDay}";
        $endDate = "{$month}-{$endDay}";

        // 1. 未確定(pending)の申請を削除
        \App\Models\Shift::whereBetween('date', [$startDate, $endDate])
            ->where('admin_status', 'pending')
            ->delete();

        // 2. 仮確定(tentative)を確定(approved)へ変更
        \App\Models\Shift::whereBetween('date', [$startDate, $endDate])
            ->where('admin_status', 'tentative')
            ->update(['admin_status' => 'approved']);

        return response()->json(['message' => 'シフトを確定し、従業員画面に反映しました']);
    }
    
    /**
     * 【店長用】シフトを確定（時間を上書き保存）する
     */
    public function approve(Request $request, $id)
    {
        $validated = $request->validate([
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string',
        ]);

        $shift = Shift::findOrFail($id);
        $shift->update([
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'admin_status' => 'approved'
        ]);
    
        return response()->json(['message' => 'シフトを確定しました']);
    }

    /**
     * 【店長用】複数のシフトを一括で確定する
     */
    public function bulkApprove(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:shifts,id',
        ]);

        \App\Models\Shift::whereIn('id', $validated['ids'])
            ->where('admin_status', 'pending')
            ->update(['admin_status' => 'approved']);

        return response()->json(['message' => count($validated['ids']) . '件のシフトを確定しました']);
    }
}