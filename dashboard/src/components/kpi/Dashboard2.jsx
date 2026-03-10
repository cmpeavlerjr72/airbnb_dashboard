import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  computeDetailedHierarchy, formatMonth, formatMonthShort, getMonthKey,
  getGroupDisplayName, PROPERTY_COLORS, EXPENSE_GROUP_COLORS
} from '../../utils/parseKpiExcel';

const fmtFull = (v) => {
  if (v == null || v === 0) return '-';
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const fmt = (v) => {
  if (v == null) return '$0';
  const abs = Math.abs(v);
  if (abs >= 1000) return `${v < 0 ? '-' : ''}$${(abs / 1000).toFixed(1)}k`;
  return `${v < 0 ? '-' : ''}$${abs.toFixed(0)}`;
};

// Drill-down levels: 'overview' → 'group' → 'category'
function DetailedChart({ data, months, selectedProperties }) {
  const [drillLevel, setDrillLevel] = useState('overview');
  const [drillGroup, setDrillGroup] = useState(null);
  const [drillCategory, setDrillCategory] = useState(null);

  const resetDrill = () => {
    setDrillLevel('overview');
    setDrillGroup(null);
    setDrillCategory(null);
  };

  // Get expense groups that exist in the data
  const expenseGroups = useMemo(() => {
    const groups = new Set();
    for (const tx of data.transactions) {
      if (tx.group && tx.group !== 'Trentalincome' && selectedProperties.includes(tx.property)) {
        groups.add(tx.groupDisplay);
      }
    }
    return [...groups].sort();
  }, [data, selectedProperties]);

  // Get categories for a given group
  const categoriesForGroup = useMemo(() => {
    if (!drillGroup) return [];
    const cats = new Set();
    for (const tx of data.transactions) {
      if (tx.groupDisplay === drillGroup && selectedProperties.includes(tx.property)) {
        cats.add(tx.category);
      }
    }
    return [...cats].sort();
  }, [data, drillGroup, selectedProperties]);

  const chartData = useMemo(() => {
    if (drillLevel === 'overview') {
      // Level 1: For each month, one green income bar + one red expense bar per property
      return months.map(monthKey => {
        const entry = { month: formatMonthShort(monthKey) };
        for (const prop of selectedProperties) {
          const txns = data.transactions.filter(t =>
            getMonthKey(t.date) === monthKey && t.property === prop
          );
          // Rental income (positive)
          entry[`${prop}_income`] = txns
            .filter(t => t.group === 'Trentalincome')
            .reduce((s, t) => s + t.amount, 0);

          // Total expenses (negative, single bar)
          entry[`${prop}_expenses`] = txns
            .filter(t => t.group && t.group !== 'Trentalincome')
            .reduce((s, t) => s + t.amount, 0);
        }
        return entry;
      });
    }

    if (drillLevel === 'group') {
      // Level 2: Show expense groups stacked per property
      return months.map(monthKey => {
        const entry = { month: formatMonthShort(monthKey) };
        for (const prop of selectedProperties) {
          const txns = data.transactions.filter(t =>
            getMonthKey(t.date) === monthKey && t.property === prop &&
            t.group && t.group !== 'Trentalincome'
          );
          for (const group of expenseGroups) {
            const sum = txns.filter(t => t.groupDisplay === group).reduce((s, t) => s + t.amount, 0);
            if (sum !== 0) {
              entry[`${prop}_${group}`] = sum;
            }
          }
        }
        return entry;
      });
    }

    if (drillLevel === 'category') {
      // Level 3: Show categories within a specific group
      return months.map(monthKey => {
        const entry = { month: formatMonthShort(monthKey) };
        for (const prop of selectedProperties) {
          const txns = data.transactions.filter(t =>
            getMonthKey(t.date) === monthKey && t.property === prop && t.groupDisplay === drillGroup
          );
          for (const cat of categoriesForGroup) {
            const sum = txns.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0);
            if (sum !== 0) {
              entry[`${prop}_${cat}`] = sum;
            }
          }
        }
        return entry;
      });
    }

    if (drillLevel === 'subcategory') {
      // Level 4: Show one category across properties
      return months.map(monthKey => {
        const entry = { month: formatMonthShort(monthKey) };
        for (const prop of selectedProperties) {
          const sum = data.transactions.filter(t =>
            getMonthKey(t.date) === monthKey && t.property === prop && t.category === drillCategory
          ).reduce((s, t) => s + t.amount, 0);
          if (sum !== 0) {
            entry[prop] = sum;
          }
        }
        return entry;
      });
    }

    return [];
  }, [data, months, selectedProperties, drillLevel, drillGroup, drillCategory, expenseGroups, categoriesForGroup]);

  const handleExpenseClick = () => {
    if (drillLevel === 'overview') {
      setDrillLevel('group');
    }
  };

  const handleGroupClick = (groupName) => {
    if (drillLevel === 'group' && expenseGroups.includes(groupName)) {
      setDrillGroup(groupName);
      setDrillLevel('category');
    }
  };

  const handleCategoryClick = (catName) => {
    if (drillLevel === 'category' && categoriesForGroup.includes(catName)) {
      setDrillCategory(catName);
      setDrillLevel('subcategory');
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="kpi-tooltip">
        <p className="kpi-tooltip-label">{label}</p>
        {payload.filter(p => p.value !== 0).map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {fmtFull(p.value)}
          </p>
        ))}
      </div>
    );
  };

  const CATEGORY_COLORS = ['#f97316', '#eab308', '#14b8a6', '#ec4899', '#6366f1', '#a855f7', '#0ea5e9', '#84cc16', '#dc2626', '#64748b'];

  const renderBars = () => {
    if (drillLevel === 'overview') {
      const bars = [];
      // One income bar + one expense bar per property
      for (let i = 0; i < selectedProperties.length; i++) {
        const prop = selectedProperties[i];
        const label = selectedProperties.length > 1 ? prop : '';
        bars.push(
          <Bar key={`${prop}_income`} dataKey={`${prop}_income`}
            name={label ? `${label} Income` : 'Rental Income'}
            fill={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} />
        );
        bars.push(
          <Bar key={`${prop}_expenses`} dataKey={`${prop}_expenses`}
            name={label ? `${label} Expenses` : 'Total Expenses'}
            fill={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} opacity={0.45}
            cursor="pointer"
            onClick={handleExpenseClick} />
        );
      }
      return bars;
    }

    if (drillLevel === 'group') {
      // Expense groups stacked per property
      const bars = [];
      for (let i = 0; i < selectedProperties.length; i++) {
        const prop = selectedProperties[i];
        for (let j = 0; j < expenseGroups.length; j++) {
          const group = expenseGroups[j];
          const dataKey = `${prop}_${group}`;
          bars.push(
            <Bar key={dataKey} dataKey={dataKey}
              name={selectedProperties.length > 1 ? `${prop} - ${group}` : group}
              stackId={`grp_${prop}`}
              fill={EXPENSE_GROUP_COLORS[group] || CATEGORY_COLORS[j % CATEGORY_COLORS.length]}
              cursor="pointer"
              onClick={() => handleGroupClick(group)} />
          );
        }
      }
      return bars;
    }

    if (drillLevel === 'category') {
      // Categories within a group, stacked per property
      const bars = [];
      for (let i = 0; i < selectedProperties.length; i++) {
        const prop = selectedProperties[i];
        for (let j = 0; j < categoriesForGroup.length; j++) {
          const cat = categoriesForGroup[j];
          const dataKey = `${prop}_${cat}`;
          bars.push(
            <Bar key={dataKey} dataKey={dataKey}
              name={selectedProperties.length > 1 ? `${prop} - ${cat}` : cat}
              stackId={`cat_${prop}`}
              fill={CATEGORY_COLORS[j % CATEGORY_COLORS.length]}
              cursor="pointer"
              onClick={() => handleCategoryClick(cat)} />
          );
        }
      }
      return bars;
    }

    if (drillLevel === 'subcategory') {
      return selectedProperties.map((prop, i) => (
        <Bar key={prop} dataKey={prop} name={prop}
          fill={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} />
      ));
    }

    return [];
  };

  const breadcrumb = [];
  if (drillLevel !== 'overview') {
    breadcrumb.push({ label: 'Overview', onClick: resetDrill });
  }
  if (['group'].includes(drillLevel)) {
    breadcrumb.push({ label: 'Expense Groups', onClick: null });
  }
  if (['category', 'subcategory'].includes(drillLevel)) {
    breadcrumb.push({ label: 'Expense Groups', onClick: () => { setDrillLevel('group'); setDrillGroup(null); setDrillCategory(null); } });
    breadcrumb.push({ label: drillGroup, onClick: drillLevel === 'subcategory' ? () => { setDrillLevel('category'); setDrillCategory(null); } : null });
  }
  if (drillLevel === 'subcategory') {
    breadcrumb.push({ label: drillCategory, onClick: null });
  }

  return (
    <div className="kpi-card">
      <div className="kpi-chart-header">
        <h2>
          {drillLevel === 'overview' && 'Cash Flow by Property'}
          {drillLevel === 'group' && 'Expenses by Group'}
          {drillLevel === 'category' && `${drillGroup} Breakdown`}
          {drillLevel === 'subcategory' && `${drillCategory} by Property`}
        </h2>
        {breadcrumb.length > 0 && (
          <div className="kpi-breadcrumb">
            {breadcrumb.map((b, i) => (
              <span key={i}>
                {i > 0 && <span className="kpi-breadcrumb-sep">/</span>}
                {b.onClick ? (
                  <button className="kpi-breadcrumb-btn" onClick={b.onClick}>{b.label}</button>
                ) : (
                  <span className="kpi-breadcrumb-current">{b.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="kpi-chart-hint">
        {drillLevel === 'overview' && 'Click an expense bar to drill into expense groups'}
        {drillLevel === 'group' && 'Click an expense group to see its categories'}
        {drillLevel === 'category' && 'Click a category to see it across properties'}
        {drillLevel === 'subcategory' && 'Showing individual category across properties'}
      </p>
      <ResponsiveContainer width="100%" height={420}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={fmt} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <ReferenceLine y={0} stroke="#666" />
          {renderBars()}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DetailedTable({ data, months, selectedProperties }) {
  const [expanded, setExpanded] = useState({});

  const hierarchy = useMemo(() =>
    computeDetailedHierarchy(data.transactions.filter(t => selectedProperties.includes(t.property)), months, data.tagToProperty),
    [data, months, selectedProperties]
  );

  const toggle = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderRows = () => {
    const rows = [];
    const props = Object.keys(hierarchy).sort();

    for (const prop of props) {
      const propData = hierarchy[prop];
      const propKey = prop;
      const propExpanded = expanded[propKey];

      // Property row
      rows.push(
        <tr key={propKey} className="kpi-detail-row kpi-detail-property" onClick={() => toggle(propKey)}>
          <td className="kpi-detail-name">
            <span className="kpi-expand-icon">{propExpanded ? '▼' : '▶'}</span>
            {prop}
          </td>
          {months.map(m => (
            <td key={m} className={propData.total[m] >= 0 ? 'kpi-positive' : 'kpi-negative'}>
              {fmtFull(propData.total[m])}
            </td>
          ))}
          <td className={Object.values(propData.total).reduce((s, v) => s + v, 0) >= 0 ? 'kpi-positive' : 'kpi-negative'}>
            {fmtFull(Object.values(propData.total).reduce((s, v) => s + v, 0))}
          </td>
        </tr>
      );

      if (!propExpanded) continue;

      const tags = Object.keys(propData.tags).sort();
      for (const tag of tags) {
        const tagData = propData.tags[tag];
        const tagKey = `${prop}|${tag}`;
        const tagExpanded = expanded[tagKey];

        // Tag row
        rows.push(
          <tr key={tagKey} className="kpi-detail-row kpi-detail-tag" onClick={() => toggle(tagKey)}>
            <td className="kpi-detail-name" style={{ paddingLeft: 28 }}>
              <span className="kpi-expand-icon">{tagExpanded ? '▼' : '▶'}</span>
              {tag}
            </td>
            {months.map(m => (
              <td key={m} className={tagData.total[m] >= 0 ? 'kpi-positive' : 'kpi-negative'}>
                {fmtFull(tagData.total[m])}
              </td>
            ))}
            <td className={Object.values(tagData.total).reduce((s, v) => s + v, 0) >= 0 ? 'kpi-positive' : 'kpi-negative'}>
              {fmtFull(Object.values(tagData.total).reduce((s, v) => s + v, 0))}
            </td>
          </tr>
        );

        if (!tagExpanded) continue;

        const groups = Object.keys(tagData.groups).sort();
        for (const group of groups) {
          const groupData = tagData.groups[group];
          const groupKey = `${prop}|${tag}|${group}`;
          const groupExpanded = expanded[groupKey];

          // Group row
          rows.push(
            <tr key={groupKey} className="kpi-detail-row kpi-detail-group" onClick={() => toggle(groupKey)}>
              <td className="kpi-detail-name" style={{ paddingLeft: 48 }}>
                <span className="kpi-expand-icon">{groupExpanded ? '▼' : '▶'}</span>
                {group}
              </td>
              {months.map(m => (
                <td key={m} className={(groupData.total[m] || 0) >= 0 ? 'kpi-positive' : 'kpi-negative'}>
                  {fmtFull(groupData.total[m])}
                </td>
              ))}
              <td className={Object.values(groupData.total).reduce((s, v) => s + v, 0) >= 0 ? 'kpi-positive' : 'kpi-negative'}>
                {fmtFull(Object.values(groupData.total).reduce((s, v) => s + v, 0))}
              </td>
            </tr>
          );

          if (!groupExpanded) continue;

          const cats = Object.keys(groupData.categories).sort();
          for (const cat of cats) {
            const catData = groupData.categories[cat];

            // Category row (leaf)
            rows.push(
              <tr key={`${groupKey}|${cat}`} className="kpi-detail-row kpi-detail-category">
                <td className="kpi-detail-name" style={{ paddingLeft: 68 }}>
                  {cat}
                </td>
                {months.map(m => (
                  <td key={m} className={(catData[m] || 0) >= 0 ? 'kpi-positive' : 'kpi-negative'}>
                    {fmtFull(catData[m])}
                  </td>
                ))}
                <td className={Object.values(catData).reduce((s, v) => s + v, 0) >= 0 ? 'kpi-positive' : 'kpi-negative'}>
                  {fmtFull(Object.values(catData).reduce((s, v) => s + v, 0))}
                </td>
              </tr>
            );
          }
        }
      }
    }

    // Grand total row
    const grandMonthly = {};
    for (const m of months) {
      grandMonthly[m] = data.transactions
        .filter(t => selectedProperties.includes(t.property) && getMonthKey(t.date) === m)
        .reduce((s, t) => s + t.amount, 0);
    }
    const grandTotal = Object.values(grandMonthly).reduce((s, v) => s + v, 0);

    rows.push(
      <tr key="grand-total" className="kpi-detail-row kpi-row-grand-total">
        <td className="kpi-detail-name">Grand Total</td>
        {months.map(m => (
          <td key={m} className={grandMonthly[m] >= 0 ? 'kpi-positive' : 'kpi-negative'}>
            {fmtFull(grandMonthly[m])}
          </td>
        ))}
        <td className={grandTotal >= 0 ? 'kpi-positive' : 'kpi-negative'}>
          {fmtFull(grandTotal)}
        </td>
      </tr>
    );

    return rows;
  };

  return (
    <div className="kpi-card">
      <h2>Detailed Transaction Breakdown</h2>
      <p className="kpi-chart-hint">Click rows to expand/collapse the hierarchy</p>
      <div className="kpi-table-scroll">
        <table className="kpi-table kpi-detail-table">
          <thead>
            <tr>
              <th className="kpi-detail-name-col"></th>
              {months.map(m => (
                <th key={m}>{formatMonth(m)}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {renderRows()}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Dashboard2({ data, selectedProperties }) {
  return (
    <div className="kpi-dashboard-content">
      <DetailedChart
        data={data}
        months={data.months}
        selectedProperties={selectedProperties}
      />
      <DetailedTable
        data={data}
        months={data.months}
        selectedProperties={selectedProperties}
      />
    </div>
  );
}
