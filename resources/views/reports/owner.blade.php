<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #222; }
  .header { background: #152D48; color: #fff; padding: 18px 22px; margin: -8px -8px 16px -8px; }
  .header h1 { font-size: 20px; margin: 0 0 2px 0; }
  .header p { margin: 0; font-size: 11px; color: #9FB8C8; }
  .kpis { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .kpis td { border: 1px solid #B9CBD2; padding: 8px 10px; width: 33%; }
  .kpis .v { font-size: 18px; font-weight: bold; color: #152D48; }
  .kpis .l { font-size: 10px; color: #5A6B7B; }
  h2 { font-size: 14px; color: #152D48; border-bottom: 2px solid #159075; padding-bottom: 3px; margin: 18px 0 8px 0; }
  table.data { width: 100%; border-collapse: collapse; }
  table.data th { background: #159075; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; }
  table.data td { border-bottom: 1px solid #dde5e9; padding: 6px 8px; }
  .right { text-align: right; }
  .good { color: #159075; font-weight: bold; }
  .bad { color: #C0392B; font-weight: bold; }
  .footer { margin-top: 20px; font-size: 9px; color: #888; border-top: 1px solid #dde5e9; padding-top: 6px; }
</style>
</head>
<body>
<div class="header">
  <h1>{{ $tenant['name'] }} — Monthly Owner Report</h1>
  <p>{{ $period }} · Generated {{ $generated_at }} · Engineering Buddy</p>
</div>

<table class="kpis">
  <tr>
    <td><div class="v">{{ $kpis['tickets_created'] }}</div><div class="l">Tickets created</div></td>
    <td><div class="v">{{ $kpis['tickets_completed'] }} ({{ $kpis['completion_pct'] }}%)</div><div class="l">Tickets completed</div></td>
    <td><div class="v">{{ $kpis['avg_days_to_close'] ?? '–' }}{{ $kpis['avg_days_to_close'] !== null ? ' days' : '' }}</div><div class="l">Avg days to close</div></td>
  </tr>
  <tr>
    <td><div class="v">{{ $kpis['open_critical'] }}</div><div class="l">Open critical/high tickets</div></td>
    <td><div class="v">{{ $kpis['overdue_pm'] }}</div><div class="l">Overdue PM schedules</div></td>
    <td><div class="v">{{ $kpis['mornings_covered'] }}</div><div class="l">Mornings with cover (days)</div></td>
  </tr>
</table>

<h2>Tickets by Status</h2>
<table class="data">
  <tr><th>Status</th><th class="right">Count</th></tr>
  @forelse($by_status as $status => $count)
  <tr><td>{{ $status }}</td><td class="right">{{ $count }}</td></tr>
  @empty
  <tr><td colspan="2">No tickets this month.</td></tr>
  @endforelse
</table>

<h2>Costs vs Budget (IDR)</h2>
<table class="data">
  <tr><th>Category</th><th class="right">Actual</th></tr>
  <tr><td>Maintenance</td><td class="right">{{ number_format($costs['maintenance'], 0, ',', '.') }}</td></tr>
  <tr><td>Energy</td><td class="right">{{ number_format($costs['energy'], 0, ',', '.') }}</td></tr>
  <tr><td>Projects</td><td class="right">{{ number_format($costs['projects'], 0, ',', '.') }}</td></tr>
  <tr><td>Other expenses</td><td class="right">{{ number_format($costs['other'], 0, ',', '.') }}</td></tr>
  <tr><td><strong>Total actual</strong></td><td class="right"><strong>{{ number_format($costs['total'], 0, ',', '.') }}</strong></td></tr>
  <tr><td>Monthly budget</td><td class="right">{{ number_format($costs['budget'], 0, ',', '.') }}</td></tr>
  <tr><td><strong>Remaining</strong></td><td class="right"><span class="{{ $costs['variance'] >= 0 ? 'good' : 'bad' }}">{{ number_format($costs['variance'], 0, ',', '.') }}</span></td></tr>
</table>

<h2>Utilities</h2>
<table class="data">
  <tr><th>Type</th><th class="right">Consumption</th><th class="right">Cost (IDR)</th></tr>
  @forelse($utilities as $type => $u)
  <tr><td>{{ ucfirst($type) }}</td><td class="right">{{ number_format($u->consumption, 1) }}</td><td class="right">{{ number_format($u->cost, 0, ',', '.') }}</td></tr>
  @empty
  <tr><td colspan="3">No utility readings this month.</td></tr>
  @endforelse
</table>

<h2>Repeat-Breakdown Assets (Top 5)</h2>
<table class="data">
  <tr><th>Asset</th><th class="right">Tickets</th></tr>
  @forelse($repeat_offenders as $r)
  <tr><td>{{ $r->asset }}</td><td class="right">{{ $r->tickets }}</td></tr>
  @empty
  <tr><td colspan="2">No repeat offenders this month — all clear.</td></tr>
  @endforelse
</table>

<div class="footer">Confidential — prepared automatically by Engineering Buddy for {{ $tenant['name'] }}.</div>
</body>
</html>
