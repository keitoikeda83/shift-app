<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ShiftController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/login');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // 従業員用
    Route::post('/shifts', [ShiftController::class, 'store'])->name('shifts.store');
    Route::get('/shifts', [ShiftController::class, 'index'])->name('shifts.index');

    // 店長用 - マトリックス・申請一覧
    Route::get('/admin/shifts', [ShiftController::class, 'adminIndex'])->name('admin.shifts.index');
    Route::get('/admin/shifts/pending', [ShiftController::class, 'pendingShifts'])->name('admin.shifts.pending');
    Route::get('/admin/shifts/trashed', [ShiftController::class, 'trashedShifts'])->name('admin.shifts.trashed');

    // 店長用 - 仮シフト（draft）作成
    Route::post('/admin/shifts/draft', [ShiftController::class, 'storeDraft'])->name('admin.shifts.storeDraft');

    // 店長用 - 一括操作（{id} を含むルートより先に登録）
    Route::put('/admin/shifts/bulk-to-draft', [ShiftController::class, 'bulkMoveToDraft'])->name('admin.shifts.bulkToDraft');
    Route::put('/admin/shifts/bulk-approve', [ShiftController::class, 'bulkApprove'])->name('admin.shifts.bulkApprove');
    Route::put('/admin/shifts/approve-all-drafts', [ShiftController::class, 'approveAllDrafts'])->name('admin.shifts.approveAllDrafts');
    Route::put('/admin/shifts/bulk-restore', [ShiftController::class, 'bulkRestore'])->name('admin.shifts.bulkRestore');
    Route::delete('/admin/shifts/bulk-reject', [ShiftController::class, 'bulkReject'])->name('admin.shifts.bulkReject');
    Route::delete('/admin/shifts/bulk-force', [ShiftController::class, 'bulkForceDelete'])->name('admin.shifts.bulkForce');

    // 店長用 - 単一シフト操作（id は数値のみ）
    Route::put('/admin/shifts/{id}/to-draft', [ShiftController::class, 'moveToDraft'])->whereNumber('id')->name('admin.shifts.toDraft');
    Route::put('/admin/shifts/{id}/approve', [ShiftController::class, 'approve'])->whereNumber('id')->name('admin.shifts.approve');
    Route::put('/admin/shifts/{id}/restore', [ShiftController::class, 'restore'])->whereNumber('id')->name('admin.shifts.restore');
    Route::put('/admin/shifts/{id}', [ShiftController::class, 'updateShift'])->whereNumber('id')->name('admin.shifts.update');
    Route::delete('/admin/shifts/{id}/reject', [ShiftController::class, 'reject'])->whereNumber('id')->name('admin.shifts.reject');
    Route::delete('/admin/shifts/{id}/force', [ShiftController::class, 'forceDelete'])->whereNumber('id')->name('admin.shifts.force');
});

require __DIR__.'/auth.php';
