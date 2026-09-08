export const WIDTH_OPTIONS = [
    { value: '1/4', label: 'Small', gridClass: 'col-span-12 md:col-span-3' },
    { value: '1/3', label: 'Medium', gridClass: 'col-span-12 md:col-span-4' },
    { value: '1/2', label: 'Large', gridClass: 'col-span-12 md:col-span-6' },
    { value: '2/3', label: 'X-Large', gridClass: 'col-span-12 md:col-span-8' },
    { value: 'full', label: 'Full', gridClass: 'col-span-12' },
];

export const WIDGETS = [
    { key: 'news', title: 'News', defaultWidth: '1/3' },
    { key: 'stats', title: 'Statistics', defaultWidth: 'full' },
    { key: 'utility', title: 'Utility Consumption', defaultWidth: 'full' },
    { key: 'activityOfWeek', title: 'Activity of the Week', defaultWidth: '1/3' },
    { key: 'costOverview', title: 'Cost Overview', defaultWidth: '1/3' },
    { key: 'workOrderTrend', title: 'Work Order Trend', defaultWidth: '1/3' },
    { key: 'workOrdersByStatus', title: 'Work Orders by Status', defaultWidth: '1/3' },
    { key: 'approvalQueue', title: 'Approval Queue', defaultWidth: '1/3' },
    { key: 'criticalAlerts', title: 'Critical Alerts', defaultWidth: '1/3' },
    { key: 'recentActivities', title: 'Recent Activities', defaultWidth: '1/3' },
    { key: 'topTechnicians', title: 'Top Technicians', defaultWidth: '1/2' },
    { key: 'heroOfDay', title: 'Hero of the Day', defaultWidth: '1/2' },
    { key: 'complianceChart', title: 'Maintenance Compliance', defaultWidth: '1/2' },
    { key: 'assetHealthChart', title: 'Asset Health', defaultWidth: '1/2' },
];

export const DEFAULT_ORDER = WIDGETS.map(w => w.key);

export const DEFAULT_HIDDEN = [];

export function defaultLayout(userOrder) {
    const order = userOrder ?? DEFAULT_ORDER;
    return order.map((key, i) => {
        const widget = WIDGETS.find(w => w.key === key);
        return {
            key,
            width: widget?.defaultWidth ?? '1/3',
            order: i,
        };
    });
}
