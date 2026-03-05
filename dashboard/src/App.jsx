import { useState, useMemo } from 'react';
import SummaryCards from './components/SummaryCards';
import MonthlyRevenueChart from './components/MonthlyRevenueChart';
import BookingTimeline from './components/BookingTimeline';
import BookingTable from './components/BookingTable';
import PropertyBreakdown from './components/PropertyBreakdown';
import OccupancyRates from './components/OccupancyRates';
import RevenueProjector from './components/RevenueProjector';
import UploadScreen from './components/UploadScreen';
import './App.css';

function App() {
  const [bookings, setBookings] = useState([]);
  const [propertyFilter, setPropertyFilter] = useState('All');

  const properties = useMemo(() => {
    return [...new Set(bookings.map(b => b.property))];
  }, [bookings]);

  const filtered = useMemo(() => {
    if (propertyFilter === 'All') return bookings;
    return bookings.filter(b => b.property === propertyFilter);
  }, [bookings, propertyFilter]);

  const handleDataReady = (data) => {
    setBookings(data);
    setPropertyFilter('All');
  };

  const handleReset = () => {
    setBookings([]);
    setPropertyFilter('All');
  };

  if (bookings.length === 0) {
    return <UploadScreen onDataReady={handleDataReady} />;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>Airbnb Dashboard</h1>
          <span className="subtitle">Future Bookings Overview</span>
        </div>
        <div className="header-right">
          <div className="filter-group">
            {['All', ...properties].map(p => (
              <button
                key={p}
                className={`filter-btn ${propertyFilter === p ? 'active' : ''}`}
                onClick={() => setPropertyFilter(p)}
              >
                {p === 'All' ? (properties.length > 1 ? 'All Properties' : 'All') : p}
              </button>
            ))}
          </div>
          <button className="filter-btn upload-new-btn" onClick={handleReset}>
            Upload New Data
          </button>
        </div>
      </header>

      <SummaryCards bookings={filtered} />

      <div className="charts-row">
        <MonthlyRevenueChart bookings={filtered} showBoth={propertyFilter === 'All'} />
        <PropertyBreakdown bookings={bookings} />
      </div>

      <OccupancyRates bookings={filtered} />
      <RevenueProjector bookings={filtered} />
      <BookingTimeline bookings={filtered} />
      <BookingTable bookings={filtered} />
    </div>
  );
}

export default App;
