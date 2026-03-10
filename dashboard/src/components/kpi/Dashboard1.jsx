import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell
} from 'recharts';
import {
  computeMonthlySummary, computeMonthlyByProperty, formatMonth, formatMonthShort,
  PROPERTY_COLORS, EXPENSE_GROUP_COLORS, getMonthKey
} from '../../utils/parseKpiExcel';

const fmt = (v) => {
  if (v == null) return '$0';
  const abs = Math.abs(v);
  if (abs >= 1000) return `${v < 0 ? '-' : ''}$${(abs / 1000).toFixed(1)}k`;
  return `${v < 0 ? '-' : ''}$${abs.toFixed(0)}`;
};

const fmtFull = (v) => {
  if (v == null) return '$0.00';
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

function SummaryTable({ monthlyData, months }) {
  const grandTotal = useMemo(() => {
    const totals = {};
    const keys = ['rentalIncome', 'maintenance', 'utilities', 'supplies', 'businessExpense',
      'totalOpEx', 'noi', 'mortgageInsurance', 'netCashFlow', 'renoFurnish', 'contribution', 'purchase', 'other', 'grandTotal'];
    for (const k of keys) {
      totals[k] = monthlyData.reduce((s, m) => s + m[k], 0);
    }
    return totals;
  }, [monthlyData]);

  const rows = [
    { label: 'Rental Income', key: 'rentalIncome', highlight: true },
    { label: 'Maintenance', key: 'maintenance' },
    { label: 'Utilities', key: 'utilities' },
    { label: 'Supplies', key: 'supplies' },
    { label: 'Business Expense', key: 'businessExpense' },
    { label: 'Total Operating Exp.', key: 'totalOpEx', bold: true },
    { label: 'Net Operating Income', key: 'noi', bold: true, highlight: true },
    { label: 'Mortgage/Insurance', key: 'mortgageInsurance' },
    { label: 'Net Cash Flow', key: 'netCashFlow', bold: true, highlight: true },
    { label: 'Reno/Furnish', key: 'renoFurnish' },
    { label: 'Contribution/Dist.', key: 'contribution' },
    { label: 'Purchase', key: 'purchase' },
    { label: 'Other', key: 'other' },
  ];

  return (
    <div className="kpi-card">
      <h2>Monthly Performance Summary</h2>
      <div className="kpi-table-scroll">
        <table className="kpi-table">
          <thead>
            <tr>
              <th className="kpi-table-label-col"></th>
              {monthlyData.map(m => (
                <th key={m.month}>{formatMonth(m.month)}</th>
              ))}
              <th className="kpi-table-total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key} className={`${row.bold ? 'kpi-row-bold' : ''} ${row.highlight ? 'kpi-row-highlight' : ''}`}>
                <td className="kpi-table-label-col">{row.label}</td>
                {monthlyData.map(m => (
                  <td key={m.month} className={m[row.key] >= 0 ? 'kpi-positive' : 'kpi-negative'}>
                    {fmtFull(m[row.key])}
                  </td>
                ))}
                <td className={`kpi-table-total-col ${grandTotal[row.key] >= 0 ? 'kpi-positive' : 'kpi-negative'}`}>
                  {fmtFull(grandTotal[row.key])}
                </td>
              </tr>
            ))}
            <tr className="kpi-row-grand-total">
              <td className="kpi-table-label-col">Grand Total</td>
              {monthlyData.map(m => (
                <td key={m.month} className={m.grandTotal >= 0 ? 'kpi-positive' : 'kpi-negative'}>
                  {fmtFull(m.grandTotal)}
                </td>
              ))}
              <td className={`kpi-table-total-col ${grandTotal.grandTotal >= 0 ? 'kpi-positive' : 'kpi-negative'}`}>
                {fmtFull(grandTotal.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CashFlowChart({ data, months, selectedProperties, isMultiProperty }) {
  const chartData = useMemo(() => {
    if (isMultiProperty) {
      // Multi-property: stack each metric by property
      const byProp = computeMonthlyByProperty(data.transactions, months, selectedProperties);
      return months.map(monthKey => {
        const entry = { month: formatMonthShort(monthKey) };
        for (const prop of selectedProperties) {
          const propData = byProp[monthKey]?.[prop] || {};
          entry[`${prop}_income`] = propData.rentalIncome || 0;
          entry[`${prop}_opex`] = propData.totalOpEx || 0;
          entry[`${prop}_noi`] = propData.noi || 0;
          entry[`${prop}_cashflow`] = propData.netCashFlow || 0;
        }
        return entry;
      });
    } else {
      // Single property: stack operating expenses by type
      const prop = selectedProperties[0];
      return months.map(monthKey => {
        const monthTxns = data.transactions.filter(t =>
          getMonthKey(t.date) === monthKey && t.property === prop
        );
        const byGroup = {};
        for (const tx of monthTxns) {
          const g = tx.group || '#N/A';
          byGroup[g] = (byGroup[g] || 0) + tx.amount;
        }
        const rentalIncome = byGroup['Trentalincome'] || 0;
        const maintenance = byGroup['Tmaintenance'] || 0;
        const utilities = byGroup['Tutilities'] || 0;
        const supplies = byGroup['Tsupplies'] || 0;
        const businessExpense = byGroup['tbusinessexpense'] || 0;
        const opEx = maintenance + utilities + supplies + businessExpense;
        const noi = rentalIncome + opEx;
        const mortIns = byGroup['Tmortgage/insurance'] || 0;

        return {
          month: formatMonthShort(monthKey),
          rentalIncome,
          maintenance,
          utilities,
          supplies,
          businessExpense,
          noi,
          netCashFlow: noi + mortIns,
        };
      });
    }
  }, [data, months, selectedProperties, isMultiProperty]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="kpi-tooltip">
        <p className="kpi-tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {fmtFull(p.value)}
          </p>
        ))}
      </div>
    );
  };

  if (isMultiProperty) {
    return (
      <div className="kpi-card">
        <h2>Cash Flow Overview</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={fmt} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine y={0} stroke="#666" />
            {selectedProperties.map((prop, i) => (
              <Bar key={`${prop}_income`} dataKey={`${prop}_income`} name={`${prop} Income`}
                stackId="income" fill={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} opacity={0.9} />
            ))}
            {selectedProperties.map((prop, i) => (
              <Bar key={`${prop}_opex`} dataKey={`${prop}_opex`} name={`${prop} OpEx`}
                stackId="opex" fill={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} opacity={0.5} />
            ))}
            {selectedProperties.map((prop, i) => (
              <Bar key={`${prop}_noi`} dataKey={`${prop}_noi`} name={`${prop} NOI`}
                stackId="noi" fill={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} opacity={0.7}
                stroke={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} strokeWidth={1} />
            ))}
            {selectedProperties.map((prop, i) => (
              <Bar key={`${prop}_cashflow`} dataKey={`${prop}_cashflow`} name={`${prop} Cash Flow`}
                stackId="cashflow" fill={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} opacity={0.3}
                stroke={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} strokeWidth={2} strokeDasharray="4 2" />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Single property view: show 4 distinct bar groups, with OpEx stacked by expense type
  return (
    <div className="kpi-card">
      <h2>Cash Flow Overview — {selectedProperties[0]}</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={fmt} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <ReferenceLine y={0} stroke="#666" />
          <Bar dataKey="rentalIncome" name="Rental Income" fill="#22c55e" />
          <Bar dataKey="maintenance" name="Maintenance" stackId="opex" fill={EXPENSE_GROUP_COLORS['Maintenance']} />
          <Bar dataKey="utilities" name="Utilities" stackId="opex" fill={EXPENSE_GROUP_COLORS['Utilities']} />
          <Bar dataKey="supplies" name="Supplies" stackId="opex" fill={EXPENSE_GROUP_COLORS['Supplies']} />
          <Bar dataKey="businessExpense" name="Business Expense" stackId="opex" fill={EXPENSE_GROUP_COLORS['Business Expense']} />
          <Bar dataKey="noi" name="NOI" fill="#3b82f6" />
          <Bar dataKey="netCashFlow" name="Net Cash Flow" fill="#8b5cf6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PropertyTable({ properties, transactions, months }) {
  const propertyMetrics = useMemo(() => {
    return properties.filter(p => p.type !== 'Admin').map(prop => {
      // Calculate trailing 12-month net cash flow
      const propTxns = transactions.filter(t => t.property === prop.name);
      const byGroup = {};
      for (const tx of propTxns) {
        const g = tx.group || '#N/A';
        byGroup[g] = (byGroup[g] || 0) + tx.amount;
      }
      const rentalIncome = byGroup['Trentalincome'] || 0;
      const opEx = (byGroup['Tmaintenance'] || 0) + (byGroup['Tutilities'] || 0) +
                   (byGroup['Tsupplies'] || 0) + (byGroup['tbusinessexpense'] || 0);
      const mortIns = byGroup['Tmortgage/insurance'] || 0;
      const netCashFlow = rentalIncome + opEx + mortIns;
      const cashOnEquity = prop.currentEquity > 0 ? (netCashFlow / prop.currentEquity) : 0;

      return { ...prop, netCashFlow, cashOnEquity };
    });
  }, [properties, transactions]);

  const totals = useMemo(() => ({
    units: propertyMetrics.reduce((s, p) => s + p.units, 0),
    currentValue: propertyMetrics.reduce((s, p) => s + p.currentValue, 0),
    currentEquity: propertyMetrics.reduce((s, p) => s + p.currentEquity, 0),
    mortgageBalance: propertyMetrics.reduce((s, p) => s + p.mortgageBalance, 0),
    netCashFlow: propertyMetrics.reduce((s, p) => s + p.netCashFlow, 0),
  }), [propertyMetrics]);

  return (
    <div className="kpi-card">
      <h2>Property Portfolio</h2>
      <div className="kpi-table-scroll">
        <table className="kpi-table kpi-property-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Type</th>
              <th>Units</th>
              <th>Purchased</th>
              <th>Current Value</th>
              <th>Equity</th>
              <th>Mortgage</th>
              <th>Net Cash Flow</th>
              <th>Cash/Equity</th>
            </tr>
          </thead>
          <tbody>
            {propertyMetrics.map(p => (
              <tr key={p.name}>
                <td className="kpi-table-label-col">{p.name}</td>
                <td>{p.type}</td>
                <td>{p.units}</td>
                <td>{p.datePurchased ? p.datePurchased.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-'}</td>
                <td>{fmtFull(p.currentValue)}</td>
                <td>{fmtFull(p.currentEquity)}</td>
                <td>{fmtFull(p.mortgageBalance)}</td>
                <td className={p.netCashFlow >= 0 ? 'kpi-positive' : 'kpi-negative'}>{fmtFull(p.netCashFlow)}</td>
                <td className={p.cashOnEquity >= 0 ? 'kpi-positive' : 'kpi-negative'}>
                  {(p.cashOnEquity * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
            <tr className="kpi-row-grand-total">
              <td className="kpi-table-label-col">Total</td>
              <td></td>
              <td>{totals.units}</td>
              <td></td>
              <td>{fmtFull(totals.currentValue)}</td>
              <td>{fmtFull(totals.currentEquity)}</td>
              <td>{fmtFull(totals.mortgageBalance)}</td>
              <td className={totals.netCashFlow >= 0 ? 'kpi-positive' : 'kpi-negative'}>{fmtFull(totals.netCashFlow)}</td>
              <td className={totals.currentEquity > 0 ? (totals.netCashFlow / totals.currentEquity >= 0 ? 'kpi-positive' : 'kpi-negative') : ''}>
                {totals.currentEquity > 0 ? `${((totals.netCashFlow / totals.currentEquity) * 100).toFixed(1)}%` : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPISummaryCards({ monthlyData }) {
  const totals = useMemo(() => {
    const t = {
      rentalIncome: 0, totalOpEx: 0, noi: 0, netCashFlow: 0, mortgageInsurance: 0, grandTotal: 0
    };
    for (const m of monthlyData) {
      t.rentalIncome += m.rentalIncome;
      t.totalOpEx += m.totalOpEx;
      t.noi += m.noi;
      t.netCashFlow += m.netCashFlow;
      t.mortgageInsurance += m.mortgageInsurance;
      t.grandTotal += m.grandTotal;
    }
    return t;
  }, [monthlyData]);

  const cards = [
    { label: 'Rental Income', value: totals.rentalIncome, color: '#22c55e' },
    { label: 'Operating Expenses', value: totals.totalOpEx, color: '#ef4444' },
    { label: 'Net Operating Income', value: totals.noi, color: '#3b82f6' },
    { label: 'Mortgage/Insurance', value: totals.mortgageInsurance, color: '#6366f1' },
    { label: 'Net Cash Flow', value: totals.netCashFlow, color: '#8b5cf6' },
    { label: 'Grand Total', value: totals.grandTotal, color: '#1a1a2e' },
  ];

  return (
    <div className="kpi-summary-cards">
      {cards.map(c => (
        <div key={c.label} className="kpi-summary-card">
          <div className="kpi-summary-label">{c.label}</div>
          <div className="kpi-summary-value" style={{ color: c.value >= 0 ? c.color : '#ef4444' }}>
            {fmtFull(c.value)}
          </div>
          <div className="kpi-summary-period">{monthlyData.length} months</div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard1({ data, selectedProperties, isMultiProperty }) {
  const monthlyData = useMemo(() =>
    computeMonthlySummary(data.transactions.filter(t => selectedProperties.includes(t.property)), data.months, null),
    [data, selectedProperties]
  );

  return (
    <div className="kpi-dashboard-content">
      <KPISummaryCards monthlyData={monthlyData} />
      <CashFlowChart
        data={data}
        months={data.months}
        selectedProperties={selectedProperties}
        isMultiProperty={isMultiProperty}
      />
      <SummaryTable monthlyData={monthlyData} months={data.months} />
      <PropertyTable
        properties={data.properties}
        transactions={data.transactions}
        months={data.months}
      />
    </div>
  );
}
