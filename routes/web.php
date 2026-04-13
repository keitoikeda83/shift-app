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
    // 従業員用
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/shifts', [ShiftController::class, 'store'])->name('shifts.store');
    Route::get('/shifts', [ShiftController::class, 'index'])->name('shifts.index');
    Route::get('/shifts/locked', [ShiftController::class, 'lockedPeriods'])->name('shifts.locked');
    // 管理者（店長）用
    Route::get('/admin/shifts', [ShiftController::class, 'adminIndex'])->name('admin.shifts.index');
    Route::get('/admin/shifts/pending', [ShiftController::class, 'pendingShifts'])->name('admin.shifts.pending');
    Route::put('/admin/shifts/{id}/update-status', [ShiftController::class, 'updateStatus'])->name('admin.shifts.updateStatus');
    Route::put('/admin/shifts/bulk-update', [ShiftController::class, 'bulkUpdate'])->name('admin.shifts.bulkUpdate');
    Route::post('/admin/shifts/publish', [ShiftController::class, 'publish'])->name('admin.shifts.publish');
});

require __DIR__.'/auth.php';
