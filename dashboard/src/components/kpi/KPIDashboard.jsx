import { useState, useMemo } from 'react';
import Dashboard1 from './Dashboard1';
import Dashboard2 from './Dashboard2';
import './kpi.css';

const CAPITAL_GROUPS = ['Tpurchase', 'Tcontribution/distribution', 'Treno/furnish'];

export default function KPIDashboard({ data, onReset }) {
  const [activeTab, setActiveTab] = useState(1);
  const [selectedProperties, setSelectedProperties] = useState(null); // null = all
  const [showCapitalItems, setShowCapitalItems] = useState(true);

  const allProperties = useMemo(() => data.propertyNames, [data]);

  // Filter out capital/one-time items when toggle is off
  const filteredData = useMemo(() => {
    if (showCapitalItems) return data;
    return {
      ...data,
      transactions: data.transactions.filter(t => !CAPITAL_GROUPS.includes(t.group)),
    };
  }, [data, showCapitalItems]);

  const toggleProperty = (prop) => {
    setSelectedProperties(prev => {
      if (prev === null) {
        // Switching from "all" to single selection
        return [prop];
      }
      if (prev.includes(prop)) {
        const next = prev.filter(p => p !== prop);
        return next.length === 0 ? null : next;
      }
      const next = [...prev, prop];
      if (next.length === allProperties.length) return null;
      return next;
    });
  };

  const effectiveProperties = selectedProperties || allProperties;

  return (
    <div className="kpi-app">
      <header className="kpi-header">
        <div className="kpi-header-left">
          <h1>Property KPI Dashboard</h1>
          <div className="kpi-tabs">
            <button
              className={`kpi-tab ${activeTab === 1 ? 'active' : ''}`}
              onClick={() => setActiveTab(1)}
            >
              Performance Summary
            </button>
            <button
              className={`kpi-tab ${activeTab === 2 ? 'active' : ''}`}
              onClick={() => setActiveTab(2)}
            >
              Detailed Performance
            </button>
          </div>
        </div>
        <div className="kpi-header-right">
          <div className="kpi-filter-group">
            <button
              className={`filter-btn ${selectedProperties === null ? 'active' : ''}`}
              onClick={() => setSelectedProperties(null)}
            >
              All Properties
            </button>
            {allProperties.map(p => (
              <button
                key={p}
                className={`filter-btn ${effectiveProperties.includes(p) && selectedProperties !== null ? 'active' : ''}`}
                onClick={() => toggleProperty(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <label className="kpi-toggle">
            <input
              type="checkbox"
              checked={showCapitalItems}
              onChange={() => setShowCapitalItems(v => !v)}
            />
            <span className="kpi-toggle-slider"></span>
            <span className="kpi-toggle-label">Capital Items</span>
          </label>
          <button className="filter-btn upload-new-btn" onClick={onReset}>
            Upload New Data
          </button>
        </div>
      </header>

      {activeTab === 1 ? (
        <Dashboard1
          data={filteredData}
          selectedProperties={effectiveProperties}
          isMultiProperty={selectedProperties === null || (selectedProperties && selectedProperties.length > 1)}
        />
      ) : (
        <Dashboard2
          data={filteredData}
          selectedProperties={effectiveProperties}
        />
      )}
    </div>
  );
}
