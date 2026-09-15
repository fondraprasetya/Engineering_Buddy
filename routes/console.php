<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('maintenance:roll')->dailyAt('00:01');
Schedule::command('maintenance:process')->dailyAt('00:02');
Schedule::command('billing:expire-trials')->hourly();
// 03:00 UTC = 10:00 WIB (app timezone is UTC; tenants are Indonesia-based)
Schedule::command('billing:send-reminders')->dailyAt('03:00');
Schedule::command('report:owner-monthly')->monthlyOn(1, '07:00');
