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
        // 「一括申請（dates）」と「単一申請（date）」の両方に対応させる
        $dates = $request->has('dates') ? $request->dates : [$request->date];

        foreach ($dates as $date) {
            \App\Models\Shift::updateOrCreate(
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
}