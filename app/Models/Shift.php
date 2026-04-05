<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    // 一括保存（Mass Assignment）を許可するカラムを指定します
    protected $fillable = [
        'user_id',
        'date',
        'status',
        'start_time',
        'end_time',
        'note',
    ];

    /**
     * リレーション設定：このシフトは一人のユーザーに属する
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}