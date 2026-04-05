<?php

namespace App\Http\Controllers;

use App\Models\Shift;
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
    public function adminIndex()
    {
        return response()->json(Shift::with('user')->where('admin_status', 'approved')->get());
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