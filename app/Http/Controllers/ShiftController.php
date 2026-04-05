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
}