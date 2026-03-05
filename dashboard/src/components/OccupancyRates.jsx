import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function parseLocal(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 5 || day === 6; // Friday, Saturday
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getBookedNightDates(booking) {
  const dates = [];
  const start = parseLocal(booking.startDate);
  const end = parseLocal(booking.endDate);
  const current = new Date(start);
  while (current < end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export default function OccupancyRates({ bookings }) {
  const { monthlyData, overall } = useMemo(() => {
    const year = 2026;
    const properties = [...new Set(bookings.map(b => b.property))];
    const numProperties = properties.length || 1;

    // Collect all booked night dates
    const bookedDates = new Set();
    const bookedWeekend = new Set();
    const bookedWeekday = new Set();

    bookings.forEach(b => {
      const nights = getBookedNightDates(b);
      nights.forEach(d => {
        const key = `${b.property}-${dateKey(d)}`;
        bookedDates.add(key);
        if (isWeekend(d)) {
          bookedWeekend.add(key);
        } else {
          bookedWeekday.add(key);
        }
      });
    });

    // Calculate per-month
    const monthlyData = [];
    let totalAll = 0, totalWeekend = 0, totalWeekday = 0;
    let bookedAll = 0, bookedWeekendTotal = 0, bookedWeekdayTotal = 0;

    for (let m = 0; m < 12; m++) {
      const daysInMonth = getDaysInMonth(year, m);
      let monthTotal = 0, monthWeekend = 0, monthWeekday = 0;
      let monthBookedTotal = 0, monthBookedWeekend = 0, monthBookedWeekday = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, m, d);
        const dk = dateKey(date);
        const we = isWeekend(date);

        properties.forEach(prop => {
          const key = `${prop}-${dk}`;
          monthTotal++;
          if (we) {
            monthWeekend++;
            if (bookedWeekend.has(key)) monthBookedWeekend++;
          } else {
            monthWeekday++;
            if (bookedWeekday.has(key)) monthBookedWeekday++;
          }
          if (bookedDates.has(key)) monthBookedTotal++;
        });
      }

      totalAll += monthTotal;
      totalWeekend += monthWeekend;
      totalWeekday += monthWeekday;
      bookedAll += monthBookedTotal;
      bookedWeekendTotal += monthBookedWeekend;
      bookedWeekdayTotal += monthBookedWeekday;

      monthlyData.push({
        month: MONTHS[m],
        Total: monthTotal > 0 ? Math.round((monthBookedTotal / monthTotal) * 100) : 0,
        Weekend: monthWeekend > 0 ? Math.round((monthBookedWeekend / monthWeekend) * 100) : 0,
        Weekday: monthWeekday > 0 ? Math.round((monthBookedWeekday / monthWeekday) * 100) : 0,
      });
    }

    const overall = {
      total: totalAll > 0 ? Math.round((bookedAll / totalAll) * 100) : 0,
      weekend: totalWeekend > 0 ? Math.round((bookedWeekendTotal / totalWeekend) * 100) : 0,
      weekday: totalWeekday > 0 ? Math.round((bookedWeekdayTotal / totalWeekday) * 100) : 0,
    };

    return { monthlyData, overall };
  }, [bookings]);

  return (
    <div className="chart-card">
      <h2>Occupancy Rates</h2>
      <div className="occupancy-overall">
        <div className="occupancy-stat">
          <div className="occupancy-ring" style={{ '--pct': overall.total, '--color': '#6366f1' }}>
            <span>{overall.total}%</span>
          </div>
          <div className="occupancy-label">Total</div>
        </div>
        <div className="occupancy-stat">
          <div className="occupancy-ring" style={{ '--pct': overall.weekend, '--color': '#f59e0b' }}>
            <span>{overall.weekend}%</span>
          </div>
          <div className="occupancy-label">Weekend<br /><small>Fri–Sat</small></div>
        </div>
        <div className="occupancy-stat">
          <div className="occupancy-ring" style={{ '--pct': overall.weekday, '--color': '#8b5cf6' }}>
            <span>{overall.weekday}%</span>
          </div>
          <div className="occupancy-label">Weekday<br /><small>Sun–Thu</small></div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={monthlyData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
          <Tooltip formatter={(val) => `${val}%`} />
          <Legend />
          <Bar dataKey="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Weekend" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Weekday" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
