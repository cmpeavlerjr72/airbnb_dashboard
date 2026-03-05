import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#ff5a5f', '#00a699', '#4a90d9', '#f5a623', '#7b61ff', '#e86c8d'];

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;

export default function MonthlyRevenueChart({ bookings, showBoth }) {
  const properties = useMemo(() => [...new Set(bookings.map(b => b.property))], [bookings]);

  const data = useMemo(() => {
    const byMonth = {};
    MONTHS.forEach((m, i) => {
      const entry = { month: m, total: 0 };
      properties.forEach(p => { entry[p] = 0; });
      byMonth[i] = entry;
    });

    bookings.forEach(b => {
      const monthIdx = new Date(b.startDate).getMonth();
      byMonth[monthIdx][b.property] = (byMonth[monthIdx][b.property] || 0) + b.grossEarnings;
      byMonth[monthIdx].total += b.grossEarnings;
    });

    return Object.values(byMonth).filter(d => d.total > 0);
  }, [bookings, properties]);

  return (
    <div className="chart-card">
      <h2>Monthly Gross Earnings</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={fmt} />
          <Tooltip formatter={(val) => fmt(val)} />
          {showBoth && properties.length > 1 ? (
            <>
              <Legend />
              {properties.map((p, i) => (
                <Bar key={p} dataKey={p} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </>
          ) : (
            <Bar dataKey="total" name="Earnings" fill={COLORS[properties.indexOf(bookings[0]?.property)] || COLORS[0]} radius={[4, 4, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
