import { useState, useEffect, useRef } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Generate close date options: current year + 5 years, all months
const generateCloseDateOptions = () => {
  const options = [];
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 1; year <= currentYear + 5; year++) {
    for (let month = 0; month < 12; month++) {
      options.push({
        id: `${year}-${month + 1}`,
        label: `${MONTHS[month]} ${year}`,
        month: month + 1,
        year: year
      });
    }
  }
  return options;
};

const CLOSE_DATE_OPTIONS = generateCloseDateOptions();

export default function WonConfirmModal({ isOpen, deal, onConfirm, onCancel }) {
  const [value, setValue] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && deal) {
      setValue(deal.deal_value ? String(deal.deal_value) : '');
      // Set current close date or default to current month
      if (deal.close_month && deal.close_year) {
        setCloseDate(`${deal.close_year}-${deal.close_month}`);
      } else {
        const now = new Date();
        setCloseDate(`${now.getFullYear()}-${now.getMonth() + 1}`);
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, deal]);

  if (!isOpen || !deal) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numValue = parseFloat(value.replace(/[$,]/g, ''));
    const [year, month] = closeDate.split('-').map(Number);
    onConfirm(deal.id, isNaN(numValue) ? null : numValue, month, year);
  };

  const formattedValue = deal.deal_value
    ? '$' + Math.round(deal.deal_value).toLocaleString('en-US')
    : 'not set';

  const currentCloseDate = deal.close_month && deal.close_year
    ? `${MONTHS[deal.close_month - 1]} ${deal.close_year}`
    : 'not set';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content won-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirm Won Deal</h2>
          <button className="modal-close" onClick={onCancel}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="won-deal-name">{deal.deal_name}</p>

            <div className="won-field">
              <label className="won-label">Deal Value</label>
              <p className="current-value">Current: <strong>{formattedValue}</strong></p>
              <div className="won-input-group">
                <span className="currency-prefix">$</span>
                <input
                  ref={inputRef}
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter deal value"
                  className="won-value-input"
                  min="0"
                  step="any"
                />
              </div>
            </div>

            <div className="won-field">
              <label className="won-label">Close Month</label>
              <p className="current-value">Current: <strong>{currentCloseDate}</strong></p>
              <select
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className="won-select"
              >
                {CLOSE_DATE_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-won">
              Mark as Won
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
