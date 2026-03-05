import { useMemo } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#ff5a5f', '#00a699', '#4a90d9', '#f5a623', '#7b61ff', '#e86c8d'];
const fmt = (n) => `$${Math.round(n).toLocaleString()}`;

export default function BookingTimeline({ bookings }) {
  const propertyColors = useMemo(() => {
    const props = [...new Set(bookings.map(b => b.property))];
    return Object.fromEntries(props.map((p, i) => [p, COLORS[i % COLORS.length]]));
  }, [bookings]);
  const grouped = useMemo(() => {
    const byMonth = {};
    bookings.forEach(b => {
      const d = new Date(b.startDate);
      const key = d.getMonth();
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(b);
    });

    return Object.entries(byMonth)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([monthIdx, items]) => ({
        month: MONTHS[Number(monthIdx)],
        items: items.sort((a, b) => new Date(a.startDate) - new Date(b.startDate)),
      }));
  }, [bookings]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="timeline-card">
      <h2>Booking Timeline</h2>
      <div className="timeline-months">
        {grouped.map(({ month, items }) => (
          <div key={month} className="timeline-month">
            <div className="timeline-month-label">{month}</div>
            <div className="timeline-bars">
              {items.map(b => (
                <div
                  key={b.confirmationCode}
                  className="timeline-bar"
                  style={{ background: propertyColors[b.property] || COLORS[0] }}
                  title={`${b.guest} | ${formatDate(b.startDate)}-${formatDate(b.endDate)} | ${b.nights}n | ${fmt(b.grossEarnings)}`}
                >
                  <span>{b.guest} ({formatDate(b.startDate)}–{formatDate(b.endDate)}, {b.nights}n)</span>
                  <span className="bar-amount">{fmt(b.grossEarnings)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
