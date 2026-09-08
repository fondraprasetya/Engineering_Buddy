# Task

Redesign and enhance ONLY the Dashboard page of the existing Engineering Buddy application.

Engineering Buddy is already a fully developed web application. Your task is ONLY to improve the Dashboard UI/UX while preserving the existing application architecture.

This is NOT a project rewrite.

## Existing Application Preservation Rules

Before making any changes:

1. Analyze the existing dashboard implementation.
2. Reuse all existing components whenever possible.
3. Do not rename files unless absolutely necessary.
4. Do not change existing APIs.
5. Do not change existing routes.
6. Do not change folder structure.
7. Do not remove existing functionality.
8. Preserve existing state management.
9. Preserve existing coding style and naming convention.
10. Implement the new dashboard as a UI enhancement only.
11. If additional reusable components are required, place them inside the existing dashboard/components directory.
12. Avoid introducing breaking changes.
13. Ensure all current dashboard features continue to work after the enhancement.
14. Minimize changes to unrelated files; prefer extending existing components over replacing them.
15. Maintain backward compatibility with existing API responses and data models.

---

# Important Constraints

You MUST NOT modify:

- Application routing
- Existing backend APIs
- Database schema
- Authentication
- Authorization
- Navigation structure
- Existing modules
- Existing business logic
- Existing services
- Existing repositories
- Existing controllers
- Existing models
- Existing permissions
- Existing menu hierarchy

The dashboard must consume the existing API/data sources.

If any required data is unavailable, create reusable placeholder components with mock data that can easily be connected later.

---

# Goal

Create a modern, executive-level operational dashboard for the Engineering Department.

The dashboard should allow Engineering Managers to understand operational status within 5 seconds.

The design language should be:

- Modern SaaS
- Clean
- Professional
- Data-driven
- Minimalistic
- Engineering-oriented
- Responsive
- Fast loading

Brand personality:

"Engineering Buddy"

Tagline:

Keep Things Running

---

# Layout

Use a responsive 12-column grid.

Recommended section order:

---------------------------------------------------

Header

Quick Access

Quick Stats

Utility Consumption Comparison

Cost Overview

Work Order Trend

Top Performance Technician

Hero of the Day

Approval Queue

Critical Alerts

Recent Activities

Maintenance Compliance

Asset Health

---------------------------------------------------

All cards should have consistent spacing, border radius, shadows, and typography.

---

# Header

Display:

- Greeting
- Current Hotel
- Current Date
- Shift
- Weather
- Notification
- User Profile

Example

Good Morning, Alex

Holiday Inn Cikarang

Morning Shift

26°C

---

# Section 1

Quick Access

Purpose:

Allow one-click navigation.

Cards:

- New Work Order
- Scheduled Maintenance
- Projects
- Assets
- Inventory
- Utilities
- Reports
- Approvals

Requirements

Each card contains

- icon
- title
- hover animation
- clickable

Do not change routing.

Use existing routes.

---

# Section 2

Quick Stats

Display KPI cards.

Cards

Pending Work Orders

Pending Projects

Scheduled Maintenance Due

Waiting Approval

Each KPI card includes

Large number

Small trend indicator

Comparison vs yesterday

Mini sparkline

Color based on status

Green

Amber

Red

Blue

Cards should be clickable.

---

# Section 3

Utility Consumption Comparison

Display three utility categories

Electricity

Water

Gas

Each category displays

Today

Month To Date

Year To Date

Comparison with same period last year

Visualize using

Grouped bar chart

Trend arrow

Percentage

Estimated saving

Do not hardcode values.

Read from existing API if available.

Otherwise create placeholder hooks.

---

# Section 4

Cost Overview

Display

Budget

Actual

Remaining Budget

Budget Utilization

Visualization

Gauge chart

Cost breakdown

Maintenance

Energy

Repair

Project

Inventory

---

# Section 5

Work Order Trend

Display

Created

Completed

Overdue

Last 30 Days

Use line chart.

---

# Section 6

Top Performance Technician

Display Top 5.

Each row displays

Profile picture

Name

Completed Tasks

Average Rating

Efficiency

Completion %

Use ranking medals for Top 3.

---

# Section 7

Hero of the Day

Display

Today's engineering team.

Include

Shift

Supervisor

Team Members

Today's Mission

Optional

Team photo

---

# Section 8

Approval Queue

Display pending approvals

Purchase Request

Budget

Project

Invoice

Show badge count.

Cards navigate to existing approval pages.

---

# Section 9

Critical Alerts

Display operational alerts

Examples

Generator PM overdue

Chiller alarm

Water leakage

High electricity consumption

Highest priority appears first.

---

# Section 10

Recent Activities

Timeline style

Examples

Work Order completed

Inventory received

Project approved

PM completed

Display latest activities.

---

# Section 11

Maintenance Compliance

Display

Scheduled

Completed

Overdue

Compliance %

Use donut chart.

---

# Section 12

Asset Health

Display

Healthy

Warning

Critical

Use donut chart.

---

# Design System

Style

Modern SaaS

Rounded cards

12-16px radius

Soft shadows

White background

Large spacing

Smooth hover animation

Professional icons

Primary color

#2563EB

Success

#22C55E

Warning

#F59E0B

Danger

#EF4444

Background

#F8FAFC

Text

#334155

Typography

Inter

or

Manrope

Use consistent spacing system.

---

# Responsive

Desktop

Large Desktop

Tablet

Laptop

Cards should rearrange automatically.

No horizontal scrolling.

---

# Performance

Lazy-load charts if necessary.

Reuse existing chart library.

Avoid unnecessary API calls.

Do not duplicate existing requests.

---

# Code Quality

Follow existing project conventions.

Reuse existing components whenever possible.

Do not introduce duplicate components.

Create reusable dashboard widgets.

Keep components modular.

Examples

DashboardHeader

QuickAccessCard

StatCard

UtilityComparisonCard

BudgetOverview

TechnicianRanking

HeroTeamCard

AlertCard

ActivityTimeline

ComplianceChart

AssetHealthChart

---

# Deliverables

Update ONLY:

Dashboard page

Dashboard widgets

Dashboard styles

Dashboard components

Do NOT modify any other module.

Maintain compatibility with the current application.

The final implementation should feel like an enhancement of the existing system rather than a redesign of the entire application.