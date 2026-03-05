import { useState, useCallback, useRef } from 'react';
import { parseCsv, guessPropertyName } from '../utils/parseCsv';
import { fetchIcal, parseIcal } from '../utils/parseIcal';

export default function UploadScreen({ onDataReady }) {
  const [files, setFiles] = useState([]); // [{ name, propertyName, bookingCount, bookings }]
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  // iCal state
  const [icalUrl, setIcalUrl] = useState('');
  const [icalProperty, setIcalProperty] = useState('');
  const [icalLoading, setIcalLoading] = useState(false);
  const [icalError, setIcalError] = useState('');

  const processFiles = useCallback(async (fileList) => {
    const newFiles = [];
    for (const file of fileList) {
      if (!file.name.endsWith('.csv')) continue;
      const text = await file.text();
      const propertyName = guessPropertyName(file.name);
      const bookings = parseCsv(text, propertyName);
      newFiles.push({
        name: file.name,
        propertyName,
        bookingCount: bookings.length,
        bookings,
      });
    }
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleFileInput = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const updatePropertyName = (index, newName) => {
    setFiles(prev => prev.map((f, i) => {
      if (i !== index) return f;
      const rebased = f.bookings.map(b => ({ ...b, property: newName }));
      return { ...f, propertyName: newName, bookings: rebased };
    }));
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleIcalSync = async () => {
    if (!icalUrl.trim() || !icalProperty.trim()) {
      setIcalError('Please enter both a URL and property name');
      return;
    }
    setIcalLoading(true);
    setIcalError('');
    try {
      const icsText = await fetchIcal(icalUrl.trim());
      const bookings = parseIcal(icsText, icalProperty.trim());
      if (bookings.length === 0) {
        setIcalError('No bookings found in iCal feed');
        setIcalLoading(false);
        return;
      }
      setFiles(prev => [...prev, {
        name: `iCal: ${icalProperty.trim()}`,
        propertyName: icalProperty.trim(),
        bookingCount: bookings.length,
        bookings,
      }]);
      setIcalUrl('');
      setIcalProperty('');
    } catch (err) {
      setIcalError(err.message || 'Failed to fetch iCal feed');
    }
    setIcalLoading(false);
  };

  const handleViewDashboard = () => {
    const allBookings = files.flatMap(f => f.bookings);
    onDataReady(allBookings);
  };

  const totalBookings = files.reduce((sum, f) => sum + f.bookingCount, 0);

  return (
    <div className="upload-screen">
      <div className="upload-container">
        <h1 className="upload-title">Airbnb Dashboard</h1>
        <p className="upload-subtitle">
          Upload your Airbnb CSV export files to view your booking analytics
        </p>

        <div
          className={`drop-zone ${dragOver ? 'drag-over' : ''} ${files.length > 0 ? 'drop-zone-compact' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            multiple
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          {files.length === 0 ? (
            <>
              <div className="drop-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="drop-text">Drag & drop CSV files here</p>
              <p className="drop-hint">or click to browse</p>
            </>
          ) : (
            <p className="drop-text">+ Add another CSV file</p>
          )}
        </div>

        {/* iCal sync – hidden until backend proxy is ready
        <div className="ical-section">
          <div className="ical-divider">
            <span>or sync via iCal</span>
          </div>
          <div className="ical-form">
            <input
              type="text"
              className="ical-input"
              placeholder="Paste Airbnb iCal URL"
              value={icalUrl}
              onChange={(e) => setIcalUrl(e.target.value)}
            />
            <input
              type="text"
              className="ical-input ical-property"
              placeholder="Property name"
              value={icalProperty}
              onChange={(e) => setIcalProperty(e.target.value)}
            />
            <button
              className="ical-sync-btn"
              onClick={handleIcalSync}
              disabled={icalLoading}
            >
              {icalLoading ? 'Syncing...' : 'Sync'}
            </button>
          </div>
          {icalError && <p className="ical-error">{icalError}</p>}
          <p className="ical-hint">
            Find this under Listing &rarr; Availability &rarr; Calendar sync in Airbnb.
            iCal provides dates only (no revenue data).
          </p>
        </div>
        */}

        {files.length > 0 && (
          <div className="file-list">
            {files.map((f, i) => (
              <div key={i} className="file-item">
                <div className="file-info">
                  <span className="file-name">{f.name}</span>
                  <span className="file-count">{f.bookingCount} bookings</span>
                </div>
                <div className="file-controls">
                  <label className="property-label">
                    Property:
                    <input
                      type="text"
                      className="property-input"
                      value={f.propertyName}
                      onChange={(e) => updatePropertyName(i, e.target.value)}
                    />
                  </label>
                  <button className="remove-btn" onClick={() => removeFile(i)} title="Remove file">
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <button className="view-dashboard-btn" onClick={handleViewDashboard}>
            View Dashboard ({totalBookings} bookings)
          </button>
        )}
      </div>
    </div>
  );
}
