# KPI Dashboard - Documentation

## Overview

The KPI Dashboard is a second dashboard mode added to the existing Airbnb Dashboard app. It allows users to upload an Excel file (`.xlsx`) containing financial transaction data and property metadata, then visualizes two interactive dashboards:

1. **Dashboard 1 - Performance Summary**: High-level P&L view with monthly cash flow chart and property portfolio table
2. **Dashboard 2 - Detailed Performance**: Interactive drill-down chart and hierarchical transaction breakdown table

## How to Use

1. Open the app at `http://localhost:5173`
2. On the upload screen, drag & drop (or browse for) an `.xlsx` file
3. The Excel file must contain two tabs:
   - **Transactions** — raw transaction data
   - **Groups & Properties** — category-to-group mappings and property metadata

## Excel File Format

### Transactions Sheet

| Column | Field | Description |
|--------|-------|-------------|
| A | Date | Transaction date |
| B | Merchant | Merchant/vendor name |
| C | Category | Expense/income category (e.g., "Gas & Electric", "Rental Income - STVR") |
| D | Account | Bank account used |
| E | Original Statement | Raw bank statement text |
| F | Notes | Optional notes |
| G | Amount | Dollar amount (positive = income, negative = expense) |
| H | Tags | Property/unit tag (e.g., "P132", "P539Up") |
| I | Owner | Owner name |
| J | Business Entity | (optional, can be formula) |
| K | Group | (optional, auto-computed from category lookup) |
| L | Property | (optional, auto-computed from tag lookup) |

### Groups & Properties Sheet

This sheet serves three purposes:

#### 1. Category → Group Mapping (Columns A-B)
Maps each transaction category to its expense group:
- `Gas & Electric` → `Tutilities`
- `Cleaning` → `Tmaintenance`
- `Property Management` → `tbusinessexpense`
- etc.

#### 2. Tag → Property Mapping (Columns E-F)
Maps each unit tag to its property name:
- `P539Up` → `539 E Bolton`
- `P539Down` → `539 E Bolton`
- `P132` → `132 Vickery`
- etc.

#### 3. Property Metadata (Columns I-O, starting row 4)
| Column | Field |
|--------|-------|
| I | Property Name |
| J | Property Type (Single, Multi, Mixed Use, Admin) |
| K | Number of Units |
| L | Date Purchased |
| M | Current Value |
| N | Current Equity (formula: M-O) |
| O | Mortgage Balance |

## Dashboard 1 - Performance Summary

### Components

1. **Summary Cards** — Total rental income, operating expenses, NOI, mortgage/insurance, net cash flow, and grand total across all months

2. **Cash Flow Chart** — Bar chart with monthly data
   - **Multi-property view**: 4 bar groups per month (Income, OpEx, NOI, Cash Flow), each stacked by property
   - **Single-property view**: Income as solid bar, OpEx stacked by expense type (maintenance, utilities, supplies, business expense), plus NOI and Net Cash Flow bars

3. **Monthly Performance Table** — Detailed P&L breakdown by month with columns for each metric (rental income, maintenance, utilities, supplies, business expense, total OpEx, NOI, mortgage/insurance, net cash flow, reno/furnish, contribution/distribution, purchase)

4. **Property Portfolio Table** — Property metadata with computed net cash flow and cash-on-equity return

### Expense Group Hierarchy

| Group | Display Name | Included in Operating Expenses? |
|-------|-------------|------|
| Trentalincome | Rental Income | No (it's income) |
| Tmaintenance | Maintenance | Yes |
| Tutilities | Utilities | Yes |
| Tsupplies | Supplies | Yes |
| tbusinessexpense | Business Expense | Yes |
| Tmortgage/insurance | Mortgage/Insurance | No (below NOI line) |
| Treno/furnish | Reno/Furnish | No (capital expense) |
| Tpurchase | Purchase | No (capital expense) |
| Tcontribution/distribution | Contribution/Distribution | No (financing) |

### Key Calculations

- **Total Operating Expenses** = Maintenance + Utilities + Supplies + Business Expense
- **Net Operating Income (NOI)** = Rental Income + Total Operating Expenses
- **Net Cash Flow** = NOI + Mortgage/Insurance
- **Cash-on-Equity** = Net Cash Flow / Current Equity

## Dashboard 2 - Detailed Performance

### Interactive Drill-Down Chart

Three levels of drill-down:

1. **Overview** (default): For each month, shows a green income bar above zero and stacked expense bars below zero, grouped by property
2. **Group Level**: Click any expense group bar → drills into the categories within that group, stacked per property
3. **Category Level**: Click any category bar → shows that single category across all properties

A breadcrumb navigation allows going back to previous levels.

### Hierarchical Transaction Table

Expandable tree table with 4 levels:
- **Property** (e.g., "132 Vickery") — click to expand
  - **Tag/Unit** (e.g., "P132") — click to expand
    - **Group** (e.g., "Business Expense") — click to expand
      - **Category** (e.g., "Property Management") — leaf level with monthly values

## Property Filter

Both dashboards share a property filter in the header:
- **All Properties**: Shows aggregate data across all properties
- **Individual property buttons**: Click to toggle individual properties on/off
- Multi-select is supported (click multiple properties)

## Technical Architecture

### Files

| File | Purpose |
|------|---------|
| `src/utils/parseKpiExcel.js` | Excel parsing, data transformation, and computation utilities |
| `src/components/kpi/KPIDashboard.jsx` | Main KPI dashboard container with tab switching and property filter |
| `src/components/kpi/Dashboard1.jsx` | Performance Summary dashboard (summary cards, chart, tables) |
| `src/components/kpi/Dashboard2.jsx` | Detailed Performance dashboard (drill-down chart, tree table) |
| `src/components/kpi/kpi.css` | All KPI-specific styles |

### Dependencies

- `xlsx` (SheetJS) — Excel file parsing
- `recharts` — Charts (already in project)
- `react` — UI framework (already in project)

### Data Flow

1. User uploads `.xlsx` file on UploadScreen
2. `parseKpiExcel()` reads the file, builds lookup maps, parses transactions
3. Parsed data passed to `KPIDashboard` via `App.jsx` state
4. `Dashboard1` and `Dashboard2` compute their own aggregations from the raw transaction data using utility functions

## Future Considerations

- Add date range filter to focus on specific time periods
- Add export functionality (PDF, CSV)
- Add YoY comparison when multiple years of data are available
- Add budget/target lines on charts
- Consider code-splitting the xlsx library for better initial load performance
