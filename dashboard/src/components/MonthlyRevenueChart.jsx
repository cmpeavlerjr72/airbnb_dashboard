import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;

export default function MonthlyRevenueChart({ bookings, showBoth }) {
  const data = useMemo(() => {
    const byMonth = {};
    MONTHS.forEach((m, i) => {
      byMonth[i] = { month: m, Bolton: 0, Vickery: 0, total: 0 };
    });

    bookings.forEach(b => {
      const monthIdx = new Date(b.startDate).getMonth();
      byMonth[monthIdx][b.property] += b.grossEarnings;
      byMonth[monthIdx].total += b.grossEarnings;
    });

    return Object.values(byMonth).filter(d => d.total > 0);
  }, [bookings]);

  return (
    <div className="chart-card">
      <h2>Monthly Gross Earnings</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={fmt} />
          <Tooltip formatter={(val) => fmt(val)} />
          {showBoth ? (
            <>
              <Legend />
              <Bar dataKey="Bolton" fill="#ff5a5f" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Vickery" fill="#00a699" radius={[4, 4, 0, 0]} />
            </>
          ) : (
            <Bar dataKey="total" name="Earnings" fill={bookings[0]?.property === 'Bolton' ? '#ff5a5f' : '#00a699'} radius={[4, 4, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
