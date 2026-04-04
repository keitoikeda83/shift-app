<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            // どのユーザーのシフトか（usersテーブルのIDと紐付け）
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            $table->date('date');                          // シフトの日付
            $table->enum('status', ['work', 'off']);       // 'work'(出勤希望) か 'off'(休み希望)

            // 出勤希望の場合のみ使用（休み希望ならNULLを許可）
            $table->time('start_time')->nullable();        // 開始時間
            $table->time('end_time')->nullable();          // 終了時間

            $table->text('note')->nullable();              // 備考・メモ
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shifts');
    }
};
