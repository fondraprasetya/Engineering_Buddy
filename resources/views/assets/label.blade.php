<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Asset Label — {{ $asset->code }}</title>
<style>
  body { font-family: DejaVu Sans, sans-serif; text-align: center; }
  .label { display: inline-block; border: 2px solid #152D48; border-radius: 10px; padding: 18px 26px; margin-top: 30px; }
  .label h1 { font-size: 20px; color: #152D48; margin: 0 0 2px 0; }
  .label .code { font-size: 13px; color: #159075; font-weight: bold; margin-bottom: 10px; }
  .label img { width: 220px; height: 220px; }
  .label .hint { font-size: 11px; color: #666; margin-top: 8px; }
  .no-print { margin-top: 20px; }
  .no-print button { background: #159075; color: #fff; border: 0; border-radius: 8px; padding: 10px 28px; font-size: 15px; cursor: pointer; }
  @media print { .no-print { display: none; } .label { margin-top: 0; } }
</style>
</head>
<body>
<div class="label">
  <h1>{{ $asset->name }}</h1>
  <div class="code">{{ $asset->code }}{{ $asset->location ? ' · '.$asset->location->name : '' }}</div>
  <img src="{{ route('assets.qrcode', $asset) }}" alt="QR {{ $asset->code }}">
  <div class="hint">Scan for history &amp; tickets · Engineering Buddy</div>
</div>
<div class="no-print"><button onclick="window.print()">🖨️ Print sticker</button></div>
</body>
</html>
