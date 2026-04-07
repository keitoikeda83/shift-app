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
        // バリデーション
        $validated = $request->validate([
            'date' => 'required|date',
            'status' => 'required|in:work,off',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string',
        ]); 

        // データの保存
        Shift::updateOrCreate(
            [
                'user_id' => Auth::id(),
                'date' => $validated['date']
            ],
            [
                'status' => $validated['status'],
                // statusがworkの時だけ時間を入れ、それ以外はnullにする
                'start_time' => ($validated['status'] === 'work') ? $validated['start_time'] : null,
                'end_time' => ($validated['status'] === 'work') ? $validated['end_time'] : null,
            ]
        );  

        return back();
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