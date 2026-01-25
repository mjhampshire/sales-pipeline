import { useState, useEffect, useRef } from 'react';

export default function LostConfirmModal({ isOpen, deal, onConfirm, onCancel }) {
  const [lossReason, setLossReason] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && deal) {
      setLossReason('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, deal]);

  if (!isOpen || !deal) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(deal.id, lossReason.trim());
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content lost-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Mark Deal as Lost</h2>
          <button className="modal-close" onClick={onCancel}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="lost-deal-name">{deal.deal_name}</p>

            <div className="lost-field">
              <label className="lost-label">Loss Reason</label>
              <textarea
                ref={inputRef}
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
                placeholder="Why was this deal lost?"
                className="lost-reason-input"
                rows={3}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-lost">
              Mark as Lost
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
