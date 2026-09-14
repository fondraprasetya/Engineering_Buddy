<?php

namespace App\Console\Commands;

use App\Http\Controllers\OwnerReportController;
use App\Models\Tenant;
use App\Models\User;
use App\Services\OwnerReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendOwnerReports extends Command
{
    protected $signature = 'report:owner-monthly {--month= : YYYY-MM, defaults to previous month}';

    protected $description = 'Email the monthly owner report PDF to each active tenant';

    public function handle(OwnerReportService $reports): int
    {
        $month = OwnerReportController::parseMonth($this->option('month') ?: now()->subMonth()->format('Y-m'));
        $sent = 0;

        foreach (Tenant::all() as $tenant) {
            $owners = User::withoutGlobalScopes()->where('tenant_id', $tenant->id)
                ->whereHas('roles', fn ($q) => $q->whereIn('name', ['super-admin', 'gm']))
                ->whereNotNull('email')->get();

            if ($owners->isEmpty()) {
                continue;
            }

            $data = $reports->forMonth($tenant, $month);
            $pdf = Pdf::loadView('reports.owner', $data)->setPaper('a4')->output();
            $filename = "owner-report-{$month->format('Y-m')}.pdf";

            foreach ($owners as $owner) {
                Mail::raw(
                    "Hi {$owner->name},\n\nAttached is the {$data['period']} performance report for {$tenant->name}.\n\n— Engineering Buddy",
                    function ($m) use ($owner, $pdf, $filename, $data) {
                        $m->to($owner->email)
                            ->subject("Monthly owner report — {$data['period']}")
                            ->attachData($pdf, $filename, ['mime' => 'application/pdf']);
                    }
                );
                $sent++;
            }
        }

        $this->info("Sent {$sent} owner report(s) for {$month->format('Y-m')}.");

        return Command::SUCCESS;
    }
}
