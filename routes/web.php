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
    Route::post('/shifts', [ShiftController::class, 'store'])->name('shifts.store');
    Route::get('/shifts', [ShiftController::class, 'index'])->name('shifts.index');
    // 【追加】管理者（店長）用ルート
    Route::get('/admin/shifts', [ShiftController::class, 'adminIndex'])->name('admin.shifts.index');
    Route::get('/admin/shifts/pending', [ShiftController::class, 'pendingShifts'])->name('admin.shifts.pending');
    Route::put('/admin/shifts/{id}/approve', [ShiftController::class, 'approve'])->name('admin.shifts.approve');
    Route::put('/admin/shifts/bulk-approve', [ShiftController::class, 'bulkApprove'])->name('admin.shifts.bulkApprove');
});

require __DIR__.'/auth.php';
