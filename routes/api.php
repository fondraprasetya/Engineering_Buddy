<?php

use App\Http\Controllers\Api\AssetHistoryController;
use App\Http\Controllers\Api\ChecklistResponseController;
use App\Http\Controllers\Api\DashboardSettingsController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TechnicianController;
use App\Http\Controllers\Api\TelegramController;
use App\Http\Controllers\Api\WorkOrderController;
use App\Http\Controllers\SubscriptionsController;
use Illuminate\Support\Facades\Route;

Route::get('v1/assets/{asset}/history', AssetHistoryController::class);
Route::put('v1/dashboard/settings', [DashboardSettingsController::class, 'update']);

Route::post('v1/billing/webhook', [SubscriptionsController::class, 'webhook']);

Route::prefix('v1')->group(function () {
    Route::get('projects', [ProjectController::class, 'index']);
    Route::post('projects', [ProjectController::class, 'store']);
    Route::get('projects/{project}', [ProjectController::class, 'show']);
    Route::post('projects/{project}/milestones', [ProjectController::class, 'addMilestone']);
    Route::put('milestones/{milestone}/status', [ProjectController::class, 'updateMilestoneStatus']);
    Route::post('milestones/{milestone}/photo', [ProjectController::class, 'uploadMilestonePhoto']);
    Route::put('projects/{project}/budget-items', [ProjectController::class, 'updateBudgetItems']);

    Route::post('telegram/link', [TelegramController::class, 'link'])->middleware('auth');
    Route::post('telegram/webhook', [TelegramController::class, 'webhook'])->withoutMiddleware('auth');
    Route::get('telegram/status', [TelegramController::class, 'status'])->middleware('auth');
    Route::post('telegram/unlink', [TelegramController::class, 'unlink'])->middleware('auth');

    Route::get('work-orders', [WorkOrderController::class, 'index'])->middleware('auth');
    Route::get('technicians/available', [TechnicianController::class, 'available'])->middleware('auth');
    Route::post('work-orders', [WorkOrderController::class, 'store'])->middleware('auth');
    Route::get('work-orders/{workOrder}', [WorkOrderController::class, 'show'])->middleware('auth');
    Route::post('work-orders/{workOrder}/approve', [WorkOrderController::class, 'approve'])->middleware('auth');
    Route::post('work-orders/{workOrder}/reject', [WorkOrderController::class, 'reject'])->middleware('auth');
    Route::post('work-orders/{workOrder}/assign', [WorkOrderController::class, 'assign'])->middleware('auth');
    Route::post('work-orders/{workOrder}/save-progress', [WorkOrderController::class, 'saveProgress'])->middleware('auth');
    Route::post('work-orders/{workOrder}/upload-photo', [WorkOrderController::class, 'uploadPhoto'])->middleware('auth');
    Route::post('work-orders/{workOrder}/checklist-responses', [ChecklistResponseController::class, 'store'])->middleware('auth');
    Route::post('work-orders/{workOrder}/checklist-photo', [ChecklistResponseController::class, 'uploadPhoto'])->middleware('auth');
    Route::delete('work-order-photos/{photo}', [WorkOrderController::class, 'deletePhoto'])->middleware('auth');
    Route::match(['PUT', 'POST'], 'work-orders/{workOrder}/status', [WorkOrderController::class, 'updateStatus'])->middleware('auth');
    Route::put('work-orders/{workOrder}/cost', [WorkOrderController::class, 'updateCost'])->middleware('auth');
});
