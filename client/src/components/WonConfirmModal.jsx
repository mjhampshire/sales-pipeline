import { useState, useEffect, useRef } from 'react';

export default function WonConfirmModal({ isOpen, deal, onConfirm, onCancel }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && deal) {
      setValue(deal.deal_value ? String(deal.deal_value) : '');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, deal]);

  if (!isOpen || !deal) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numValue = parseFloat(value.replace(/[$,]/g, ''));
    onConfirm(deal.id, isNaN(numValue) ? null : numValue);
  };

  const formattedValue = deal.deal_value
    ? '$' + Math.round(deal.deal_value).toLocaleString('en-US')
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
            <p className="won-message">
              Please confirm the final deal value:
            </p>
            <p className="current-value">
              Current value: <strong>{formattedValue}</strong>
            </p>
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
