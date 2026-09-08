<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #111; }
        .header { margin-bottom: 12px; }
        .header h1 { font-size: 14px; margin: 0 0 6px; }
        .meta { width: 100%; font-size: 10px; color: #333; }
        .meta td { padding: 1px 0; }
        .meta .label { color: #666; padding-right: 10px; white-space: nowrap; }
        .page { margin-bottom: 8px; }
        .page-title { font-size: 12px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 8px; }
        .canvas { position: relative; }
        .field-label {
            position: absolute;
            font-weight: bold;
            font-size: 13px;
            color: #111;
            padding: 2px 4px;
        }
        .field-box {
            position: absolute;
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            padding: 3px 5px;
            box-sizing: border-box;
            overflow: hidden;
        }
        .field-label-text { font-size: 9px; color: #444; font-weight: bold; margin-bottom: 2px; }
        .field-value { font-size: 10px; color: #111; min-height: 14px; }
        .required { color: #b91c1c; }
        .value-empty { color: #aaa; font-size: 10px; }
        img.photo { max-width: 100%; max-height: 150px; }
        .page-break { page-break-before: always; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Checklist Report — {{ $workOrder->title }}</h1>
        <table class="meta">
            <tr><td class="label">Work Order</td><td>#{{ $workOrder->id }}</td></tr>
            <tr><td class="label">Asset</td><td>{{ $workOrder->asset?->name ?? 'N/A' }}{{ $workOrder->asset?->code ? ' ('.$workOrder->asset->code.')' : '' }}</td></tr>
            <tr><td class="label">Requester</td><td>{{ $workOrder->requester?->name ?? 'N/A' }}{{ $workOrder->requester?->department?->name ? ' — '.$workOrder->requester->department->name : '' }}</td></tr>
            <tr><td class="label">Technician</td><td>{{ $workOrder->technicianAssignments->first()?->technician?->name ?? 'N/A' }}</td></tr>
            <tr><td class="label">Status</td><td>{{ ucwords(str_replace('_', ' ', $workOrder->status)) }}</td></tr>
        </table>
    </div>

    @forelse ($fields as $page => $pageFields)
        @php
            $designW = 500;
            $printableW = 700;
            $printableH = 980;
            $pageHeight = 707;
            foreach ($pageFields as $f) {
                $pageHeight = max($pageHeight, ($f->y ?? 0) + 70);
            }
            $scale = min(1, $printableW / $designW, $printableH / $pageHeight);
        @endphp
        <div class="page {{ ! $loop->first ? 'page-break' : '' }}">
            <div class="page-title">Page {{ $page }}</div>
            <div class="canvas" style="width: {{ $designW * $scale }}px; height: {{ $pageHeight * $scale }}px;">
                @foreach ($pageFields as $field)
                    @php
                        $x = ($field->x ?? 0) * $scale;
                        $y = ($field->y ?? 0) * $scale;
                        $w = ($field->width ?? 220) * $scale;
                        $value = $responses->get($field->id)?->value;
                    @endphp
                    @if ($field->field_type === 'label')
                        <div class="field-label" style="left: {{ $x }}px; top: {{ $y }}px; width: {{ $w }}px;">{{ $field->label }}</div>
                    @else
                        <div class="field-box" style="left: {{ $x }}px; top: {{ $y }}px; width: {{ $w }}px;">
                            <div class="field-label-text">{{ $field->label }}@if ($field->required)<span class="required">*</span>@endif</div>
                            <div class="field-value">
                                @if ($field->field_type === 'checkbox')
                                    {{ in_array($value, ['1', 'true'], true) ? 'Yes' : 'No' }}
                                @elseif ($field->field_type === 'photo')
                                    @php
                                        $decoded = json_decode($value ?? '', true);
                                        $urls = is_array($decoded) ? $decoded : (($value && ! str_starts_with($value, '[')) ? [$value] : []);
                                    @endphp
                                    @forelse ($urls as $item)
                                        @php
                                            $url = is_array($item) ? ($item['url'] ?? '') : $item;
                                            $name = is_array($item) ? ($item['name'] ?? '') : basename($url);
                                            $path = str_starts_with($url, '/storage/')
                                                ? storage_path('app/public/'.substr($url, strlen('/storage/')))
                                                : null;
                                        @endphp
                                        @if ($path && file_exists($path))
                                            <img class="photo" src="data:image/{{ pathinfo($path, PATHINFO_EXTENSION) }};base64,{{ base64_encode(file_get_contents($path)) }}" />
                                        @else
                                            <span>{{ $name ?: basename($url) }}</span>
                                        @endif
                                    @empty
                                        <span class="value-empty">No photo</span>
                                    @endforelse
                                @elseif ($value !== null && $value !== '')
                                    {{ $value }}
                                @else
                                    <span class="value-empty">&nbsp;</span>
                                @endif
                            </div>
                        </div>
                    @endif
                @endforeach
            </div>
        </div>
    @empty
        <p>No checklist fields.</p>
    @endforelse
</body>
</html>
