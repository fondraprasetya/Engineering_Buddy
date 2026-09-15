<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title inertia>{{ config('app.name', 'Engineering Buddy') }}</title>
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="vapid-public-key" content="{{ config('services.vapid.public_key') }}">
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <link rel="manifest" href="/manifest.webmanifest">
        <meta name="theme-color" content="#159075">
        <link rel="apple-touch-icon" href="/icon-192.png">
        @viteReactRefresh
        @vite(['resources/js/app.jsx', 'resources/css/app.css'])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        <div id="initial-loader" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#f3f4f6;z-index:9999;transition:opacity .3s">
            <div style="width:28px;height:28px;border:3px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin .6s linear infinite"></div>
        </div>
        @inertia
        <script>window.addEventListener('load',()=>{const e=document.getElementById('initial-loader');if(e){e.style.opacity='0';setTimeout(()=>e.remove(),300)}})</script>
        <script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}</script>
    </body>
</html>
