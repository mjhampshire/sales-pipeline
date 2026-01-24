const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CloseMonthModal({ isOpen, priorMonth, priorYear, priorMonthClosed, onConfirm, onCancel }) {
  if (!isOpen) return null;

  const monthName = MONTH_NAMES[priorMonth - 1];

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content close-month-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{priorMonthClosed ? 'Resave' : 'Save'} {monthName} {priorYear}</h2>
          <button className="modal-close" onClick={onCancel}>&times;</button>
        </div>

        <div className="modal-body">
          <p className="close-month-warning">
            Are you sure the pipeline values, won and lost deals are up to date?
          </p>

          <p className="close-month-info">
            {priorMonthClosed ? 'Resaving' : 'Saving'} this month will:
          </p>
          <ul className="close-month-list">
            <li>{priorMonthClosed ? 'Update the snapshot' : 'Create a snapshot'} of the current weighted pipeline forecast</li>
            <li>Archive all won and lost deals</li>
            {!priorMonthClosed && <li>Record {monthName} {priorYear} as saved</li>}
          </ul>

          {priorMonthClosed && (
            <p className="close-month-reclose-note">
              Note: This month was previously saved. The snapshot will be updated with current data.
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary btn-close-month" onClick={onConfirm}>
            {priorMonthClosed ? 'Resave' : 'Save'} {monthName}
          </button>
        </div>
      </div>
    </div>
  );
}
