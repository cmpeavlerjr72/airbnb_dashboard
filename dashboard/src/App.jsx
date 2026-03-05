import { useState, useMemo } from 'react';
import { bookings } from './data/bookings';
import SummaryCards from './components/SummaryCards';
import MonthlyRevenueChart from './components/MonthlyRevenueChart';
import BookingTimeline from './components/BookingTimeline';
import BookingTable from './components/BookingTable';
import PropertyBreakdown from './components/PropertyBreakdown';
import OccupancyRates from './components/OccupancyRates';
import './App.css';

function App() {
  const [propertyFilter, setPropertyFilter] = useState('All');

  const filtered = useMemo(() => {
    if (propertyFilter === 'All') return bookings;
    return bookings.filter(b => b.property === propertyFilter);
  }, [propertyFilter]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>Airbnb Dashboard</h1>
          <span className="subtitle">Future Bookings Overview</span>
        </div>
        <div className="header-right">
          <div className="filter-group">
            {['All', 'Bolton', 'Vickery'].map(p => (
              <button
                key={p}
                className={`filter-btn ${propertyFilter === p ? 'active' : ''}`}
                onClick={() => setPropertyFilter(p)}
              >
                {p === 'All' ? 'Both Properties' : p === 'Bolton' ? '539 Bolton' : 'Vickery Lane'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <SummaryCards bookings={filtered} />

      <div className="charts-row">
        <MonthlyRevenueChart bookings={filtered} showBoth={propertyFilter === 'All'} />
        <PropertyBreakdown bookings={bookings} />
      </div>

      <OccupancyRates bookings={filtered} />
      <BookingTimeline bookings={filtered} />
      <BookingTable bookings={filtered} />
    </div>
  );
}

export default App;
