import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { route } from '../../vendor/tightenco/ziggy';

// Client-side error capture: report JS crashes back to the server log
// (throttled endpoint; capped per page-load so a loop can't spam).
let clientReportsSent = 0;
function reportClientError(kind, message, url, line, column, stack) {
    if (clientReportsSent >= 5) return;
    clientReportsSent += 1;
    try {
        const csrf = document.querySelector('meta[name=csrf-token]')?.content ?? '';
        fetch('/api/v1/client-errors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
            body: JSON.stringify({ kind, message: String(message ?? '').slice(0, 500), url, line, column, stack: String(stack ?? '').slice(0, 2000) }),
            keepalive: true,
        }).catch(() => {});
    } catch { /* never break the app for telemetry */ }
}
window.addEventListener('error', (e) => {
    if (e.filename && e.filename.includes('client-errors')) return;
    reportClientError('error', e.message, e.filename, e.lineno, e.colno, e.error?.stack);
});
window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    reportClientError('rejection', reason?.message ?? String(reason), undefined, undefined, undefined, reason?.stack);
});

createInertiaApp({
    resolve: (name) => resolvePageComponent(`./pages/${name}.jsx`, import.meta.glob('./pages/**/*.jsx')),
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#3B82F6',
        includeCSS: true,
        showSpinner: true,
    },
});
