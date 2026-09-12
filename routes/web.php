<?php

use App\Http\Controllers\ActualExpenseController;
use App\Http\Controllers\AssetController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RegisteredController;
use App\Http\Controllers\SubscriptionsController;
use App\Http\Controllers\CalendarEventController;
use App\Http\Controllers\ChecklistTemplateController;
use App\Http\Controllers\DailyLogController;
use App\Http\Controllers\DailyUtilityController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\MaintenanceScheduleController;
use App\Http\Controllers\MonthlyBudgetController;
use App\Http\Controllers\MyTaskController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PostAccountController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\RosterController;
use App\Http\Controllers\StoreController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UtilityRateController;
use App\Http\Controllers\WorkOrderController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('login', [AuthController::class, 'create'])->name('login');
    Route::post('login', [AuthController::class, 'store'])->middleware('throttle:login');
    Route::get('register', [RegisteredController::class, 'create'])->name('register');
    Route::post('register', [RegisteredController::class, 'store'])->middleware('throttle:login');
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthController::class, 'destroy'])->name('logout');
    Route::get('billing', [SubscriptionsController::class, 'index'])->name('billing');
    Route::post('billing/checkout', [SubscriptionsController::class, 'checkout'])->name('billing.checkout');
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('help', fn () => \Inertia\Inertia::render('Help'))->name('help');
    Route::redirect('/', '/dashboard');

    Route::get('work-orders', [WorkOrderController::class, 'index'])->name('work-orders.index');
    Route::get('work-orders/create', [WorkOrderController::class, 'create'])->name('work-orders.create');
    Route::post('work-orders', [WorkOrderController::class, 'store'])->name('work-orders.store');
    Route::get('work-orders/{workOrder}', [WorkOrderController::class, 'show'])->name('work-orders.show');
    Route::get('work-orders/{workOrder}/checklist-pdf', [WorkOrderController::class, 'checklistPdf'])->name('work-orders.checklist-pdf');

    Route::get('assets', [AssetController::class, 'index'])->name('assets.index');
    Route::get('assets/create', [AssetController::class, 'create'])->name('assets.create');
    Route::post('assets', [AssetController::class, 'store'])->name('assets.store');
    Route::get('assets/{asset}', [AssetController::class, 'show'])->name('assets.show');
    Route::get('assets/{asset}/edit', [AssetController::class, 'edit'])->name('assets.edit');
    Route::post('assets/{asset}', [AssetController::class, 'update'])->name('assets.update');

    Route::get('checklist-templates', [ChecklistTemplateController::class, 'index'])->name('checklist-templates.index');
    Route::get('checklist-templates/create', [ChecklistTemplateController::class, 'create'])->name('checklist-templates.create');
    Route::post('checklist-templates', [ChecklistTemplateController::class, 'store'])->name('checklist-templates.store');
    Route::get('checklist-templates/{checklistTemplate}', [ChecklistTemplateController::class, 'show'])->name('checklist-templates.show');
    Route::get('checklist-templates/{checklistTemplate}/edit', [ChecklistTemplateController::class, 'edit'])->name('checklist-templates.edit');
    Route::post('checklist-templates/{checklistTemplate}', [ChecklistTemplateController::class, 'update'])->name('checklist-templates.update');
    Route::post('checklist-templates/{checklistTemplate}/duplicate', [ChecklistTemplateController::class, 'duplicate'])->name('checklist-templates.duplicate');
    Route::delete('checklist-templates/{checklistTemplate}', [ChecklistTemplateController::class, 'destroy'])->name('checklist-templates.destroy');

    Route::get('my-tasks', [MyTaskController::class, 'index'])->name('my-tasks.index');
    Route::get('my-tasks/{workOrder}', [MyTaskController::class, 'show'])->name('my-tasks.show');

    Route::get('maintenance-schedules', [MaintenanceScheduleController::class, 'index'])->name('maintenance-schedules.index');
    Route::get('maintenance-schedules/create', [MaintenanceScheduleController::class, 'create'])->name('maintenance-schedules.create');
    Route::post('maintenance-schedules', [MaintenanceScheduleController::class, 'store'])->name('maintenance-schedules.store');
    Route::get('maintenance-schedules/{maintenanceSchedule}/edit', [MaintenanceScheduleController::class, 'edit'])->name('maintenance-schedules.edit');
    Route::post('maintenance-schedules/{maintenanceSchedule}', [MaintenanceScheduleController::class, 'update'])->name('maintenance-schedules.update');
    Route::post('maintenance-schedules/{maintenanceSchedule}/toggle-active', [MaintenanceScheduleController::class, 'toggleActive'])->name('maintenance-schedules.toggle-active');
    Route::post('maintenance-schedules/{maintenanceSchedule}/assign', [MaintenanceScheduleController::class, 'assignTechnician'])->name('maintenance-schedules.assign');

    Route::get('daily-logs', [DailyLogController::class, 'index'])->name('daily-logs.index');
    Route::get('daily-logs/create', [DailyLogController::class, 'create'])->name('daily-logs.create');
    Route::post('daily-logs', [DailyLogController::class, 'store'])->name('daily-logs.store');

    Route::middleware('plan:utilities')->group(function () {
        Route::get('utilities', [DailyUtilityController::class, 'index'])->name('utilities.index');
        Route::get('utilities/export', [DailyUtilityController::class, 'export'])->name('utilities.export');
        Route::post('utilities/import', [DailyUtilityController::class, 'import'])->name('utilities.import');
        Route::get('utilities/create', [DailyUtilityController::class, 'create'])->name('utilities.create');
        Route::post('utilities', [DailyUtilityController::class, 'store'])->name('utilities.store');
        Route::get('utilities/{dailyUtility}/edit', [DailyUtilityController::class, 'edit'])->name('utilities.edit');
        Route::put('utilities/{dailyUtility}', [DailyUtilityController::class, 'update'])->name('utilities.update');
        Route::get('utilities/previous-stand', [DailyUtilityController::class, 'previousStand'])->name('utilities.previous-stand');
    });

    Route::get('utility-rates', [UtilityRateController::class, 'index'])->name('utility-rates.index');
    Route::get('utility-rates/create', [UtilityRateController::class, 'create'])->name('utility-rates.create');
    Route::post('utility-rates', [UtilityRateController::class, 'store'])->name('utility-rates.store');
    Route::get('utility-rates/{utilityRate}/edit', [UtilityRateController::class, 'edit'])->name('utility-rates.edit');
    Route::put('utility-rates/{utilityRate}', [UtilityRateController::class, 'update'])->name('utility-rates.update');
    Route::delete('utility-rates/{utilityRate}', [UtilityRateController::class, 'destroy'])->name('utility-rates.destroy');

    Route::middleware('plan:projects')->group(function () {
        Route::get('projects', [ProjectController::class, 'index'])->name('projects.index');
        Route::get('projects/create', [ProjectController::class, 'create'])->name('projects.create');
        Route::post('projects', [ProjectController::class, 'store'])->name('projects.store');
        Route::get('projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
        Route::post('projects/{project}/budget-items', [ProjectController::class, 'updateBudgetItems'])->name('projects.budget-items');
        Route::get('projects/{project}/timeline', [ProjectController::class, 'editTimeline'])->name('projects.timeline.edit');
        Route::put('projects/{project}/timeline', [ProjectController::class, 'updateTimeline'])->name('projects.timeline.update');
    });

    Route::get('roster', [RosterController::class, 'index'])->name('roster.index');
    Route::post('roster', [RosterController::class, 'store'])->name('roster.store');
    Route::delete('roster/{rosterEntry}', [RosterController::class, 'destroy'])->name('roster.destroy');

    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');

    Route::get('profile', [ProfileController::class, 'show'])->name('profile');
    Route::post('profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password');
    Route::post('profile/photo', [ProfileController::class, 'updatePhoto'])->name('profile.photo');
    Route::post('profile/update', [ProfileController::class, 'updateProfile'])->name('profile.update');
    Route::get('assets/{asset}/history', [AssetController::class, 'history'])->name('assets.history');
    Route::get('assets/{asset}/qrcode', [AssetController::class, 'qrcode'])->name('assets.qrcode');

    Route::get('users', [UserController::class, 'index'])->name('users.index');
    Route::get('users/create', [UserController::class, 'create'])->name('users.create');
    Route::post('users', [UserController::class, 'store'])->name('users.store');
    Route::get('users/{user}/edit', [UserController::class, 'edit'])->name('users.edit');
    Route::post('users/{user}', [UserController::class, 'update'])->name('users.update');

    Route::get('locations', [LocationController::class, 'index'])->name('locations.index');
    Route::get('locations/create', [LocationController::class, 'create'])->name('locations.create');
    Route::post('locations', [LocationController::class, 'store'])->name('locations.store');
    Route::get('locations/{location}/edit', [LocationController::class, 'edit'])->name('locations.edit');
    Route::post('locations/{location}', [LocationController::class, 'update'])->name('locations.update');

    Route::middleware('plan:budgets')->group(function () {
        Route::get('budgets', [MonthlyBudgetController::class, 'index'])->name('budgets.index');
        Route::get('budgets/create', [MonthlyBudgetController::class, 'create'])->name('budgets.create');
        Route::post('budgets', [MonthlyBudgetController::class, 'store'])->name('budgets.store');
        Route::get('budgets/{budget}/edit', [MonthlyBudgetController::class, 'edit'])->name('budgets.edit');
        Route::put('budgets/{budget}', [MonthlyBudgetController::class, 'update'])->name('budgets.update');
        Route::get('budgets/export', [MonthlyBudgetController::class, 'export'])->name('budgets.export');
        Route::post('budgets/import', [MonthlyBudgetController::class, 'import'])->name('budgets.import');
        Route::delete('budgets/{budget}', [MonthlyBudgetController::class, 'destroy'])->name('budgets.destroy');
    });

    Route::get('post-accounts', [PostAccountController::class, 'index'])->name('post-accounts.index');
    Route::get('post-accounts/create', [PostAccountController::class, 'create'])->name('post-accounts.create');
    Route::post('post-accounts', [PostAccountController::class, 'store'])->name('post-accounts.store');
    Route::get('post-accounts/{postAccount}/edit', [PostAccountController::class, 'edit'])->name('post-accounts.edit');
    Route::put('post-accounts/{postAccount}', [PostAccountController::class, 'update'])->name('post-accounts.update');
    Route::delete('post-accounts/{postAccount}', [PostAccountController::class, 'destroy'])->name('post-accounts.destroy');

    Route::middleware('plan:expenses')->group(function () {
        Route::get('expenses', [ActualExpenseController::class, 'index'])->name('expenses.index');
        Route::get('expenses/create', [ActualExpenseController::class, 'create'])->name('expenses.create');
        Route::post('expenses', [ActualExpenseController::class, 'store'])->name('expenses.store');
        Route::get('expenses/{expense}/edit', [ActualExpenseController::class, 'edit'])->name('expenses.edit');
        Route::put('expenses/{expense}', [ActualExpenseController::class, 'update'])->name('expenses.update');
        Route::delete('expenses/{expense}', [ActualExpenseController::class, 'destroy'])->name('expenses.destroy');
    });

    Route::get('store', [StoreController::class, 'index'])->name('store.index');
    Route::get('store/categories', [StoreController::class, 'categories'])->name('store.categories');
    Route::post('store/categories', [StoreController::class, 'storeCategory'])->name('store.categories.store');
    Route::delete('store/categories/{storeCategory}', [StoreController::class, 'deleteCategory'])->name('store.categories.delete');
    Route::get('store/items/create', [StoreController::class, 'createItem'])->name('store.items.create');
    Route::post('store/items', [StoreController::class, 'storeItem'])->name('store.items.store');
    Route::get('store/items/{storeItem}/edit', [StoreController::class, 'editItem'])->name('store.items.edit');
    Route::put('store/items/{storeItem}', [StoreController::class, 'updateItem'])->name('store.items.update');
    Route::get('store/items/{storeItem}/mutations', [StoreController::class, 'itemMutations'])->name('store.items.mutations');
    Route::get('store/receivings/create', [StoreController::class, 'createReceiving'])->name('store.receivings.create');
    Route::post('store/receivings', [StoreController::class, 'storeReceiving'])->name('store.receivings.store');
    Route::get('store/requests/create', [StoreController::class, 'createRequest'])->name('store.requests.create');
    Route::post('store/requests', [StoreController::class, 'storeRequest'])->name('store.requests.store');
    Route::get('store/my-requests', [StoreController::class, 'myRequests'])->name('store.requests.my');
    Route::post('store/requests/{storeRequest}/approve', [StoreController::class, 'approveRequest'])->name('store.requests.approve');
    Route::post('store/requests/{storeRequest}/fulfill', [StoreController::class, 'fulfillRequest'])->name('store.requests.fulfill');
    Route::post('store/requests/{storeRequest}/reject', [StoreController::class, 'rejectRequest'])->name('store.requests.reject');
    Route::get('store/adjustments', [StoreController::class, 'adjustments'])->name('store.adjustments.index');
    Route::post('store/adjustments', [StoreController::class, 'storeAdjustment'])->name('store.adjustments.store');
    Route::post('store/adjustments/{storeStockAdjustment}/approve', [StoreController::class, 'approveAdjustment'])->name('store.adjustments.approve');
    Route::post('store/adjustments/{storeStockAdjustment}/reject', [StoreController::class, 'rejectAdjustment'])->name('store.adjustments.reject');

    Route::get('calendar', [CalendarEventController::class, 'index'])->name('calendar.index');
    Route::get('calendar/events', [CalendarEventController::class, 'events'])->name('calendar.events');
    Route::post('calendar/events', [CalendarEventController::class, 'store'])->name('calendar.events.store');
    Route::put('calendar/events/{calendarEvent}', [CalendarEventController::class, 'update'])->name('calendar.events.update');
    Route::delete('calendar/events/{calendarEvent}', [CalendarEventController::class, 'destroy'])->name('calendar.events.destroy');
});
