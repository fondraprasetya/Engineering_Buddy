<?php

namespace App\Http\Controllers;

use App\Services\OwnerReportService;
use App\Tenancy\TenantContext;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;

class OwnerReportController extends Controller
{
    public function download(Request $request, OwnerReportService $reports)
    {
        abort_unless($request->user()->can('view org dashboards'), 403);

        $month = $this->parseMonth($request->input('month'));
        $tenant = \App\Models\Tenant::findOrFail(TenantContext::id());
        $data = $reports->forMonth($tenant, $month);

        $pdf = Pdf::loadView('reports.owner', $data)->setPaper('a4');

        return $pdf->download("owner-report-{$tenant->id}-{$month->format('Y-m')}.pdf");
    }

    public static function parseMonth(?string $input): Carbon
    {
        if ($input && preg_match('/^\d{4}-\d{2}$/', $input)) {
            return Carbon::createFromFormat('Y-m', $input)->startOfMonth();
        }

        return now()->startOfMonth();
    }
}
