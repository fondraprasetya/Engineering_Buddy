# Engineering Buddy — Spreadsheet Setup Templates

Download each CSV, fill your rows (keep the header), and import in numeric order.
Import order matters: every sheet references codes defined in an earlier sheet.

## Order & linkage

| # | File | Creates | References |
|---|------|---------|------------|
| 1 | `01-locations.csv` | Buildings → areas → rooms | `parent_code` must appear in an earlier row of the same file |
| 2 | `02-assets.csv` | Equipment | `location_code` from sheet 1 |
| 3 | `03-users.csv` | Logins | `role` + `department` (departments auto-created if new) |
| 4 | `04-utility-rates.csv` | Energy tariffs | type: `electricity`, `water`, or `gas` |
| 5 | `05-maintenance-schedules.csv` | PM schedules | `asset_code` from sheet 2, `technician_email` from sheet 3 |
| 6 | `06-stock.csv` | Opening inventory | `category` auto-created if new |

## Column rules

- **Dates:** `YYYY-MM-DD` (e.g. `2026-10-01`). Leave `end_date` empty for open-ended rates.
- **Money:** plain numbers, no dots/commas (`8500000` = Rp8.500.000).
- **`code` columns:** optional — blank codes are auto-generated (`BLD-`, `AR-`, `RM-`). Fill them only when another sheet must reference the row.
- **`type` (locations):** exactly `building`, `area`, or `room`. Rooms should carry `floor_number`.
- **`status` (assets):** `active` or `inactive`.
- **`role` (users):** `employee`, `technician`, `dept-head`, `chief-engineer`, `eng-admin`, `gm`, `super-admin`. Passwords are temporary — users change them after first login.
- **`frequency_type`:** `daily`, `weekly`, `monthly`, `quarterly`, `bi-annual`, `annual`, `fixed_days`, `calendar`, or `usage`. `frequency_value` = every-N (usually `1`). `is_active`: `1` or `0`.
- **Excel Indonesia tip:** if columns collapse into one, use Data → Text to Columns with comma delimiter, or save as CSV UTF-8 from Google Sheets (recommended).

## Safety (built into the importer)

- Preview with per-row errors before anything is saved; nothing imports until you confirm.
- One failed row does not silently poison the rest — errors are reported, valid rows import.
- Everything lands in your property only; re-importing the same file will not duplicate linked rows.
