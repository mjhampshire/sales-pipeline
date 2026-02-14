import { useState, useEffect, useRef } from 'react';
import DealRow from './DealRow';

const COLUMNS = [
  { key: 'priority', label: '', sortable: true, width: '30px' },
  { key: 'color', label: '', sortable: true, width: '30px' },
  { key: 'deal_name', label: 'Deal Name' },
  { key: 'contact_name', label: 'Contact' },
  { key: 'source', label: 'Source', sortable: false },
  { key: 'partner', label: 'Partner', sortable: false },
  { key: 'platform', label: 'Platform' },
  { key: 'product', label: 'Product' },
  { key: 'stage', label: 'Stage' },
  { key: 'status', label: 'Status' },
  { key: 'open_date', label: 'Open Date' },
  { key: 'close_date', label: 'Close Date' },
  { key: 'deal_value', label: 'Value' },
  { key: 'forecast', label: 'Forecast', sortable: false },
  { key: 'notes', label: 'Notes', sortable: false },
  { key: 'next_step_date', label: 'Action Date' },
  { key: 'actions', label: '', sortable: false }
];

export default function PipelineTable({
  deals,
  stages,
  sources,
  partners,
  platforms,
  products,
  onUpdateDeal,
  onDeleteDeal,
  onAddDeal,
  onRefresh,
  sortConfig,
  onSort
}) {
  const [notesWidth, setNotesWidth] = useState(() => {
    const saved = localStorage.getItem('notesColumnWidth');
    return saved ? parseInt(saved, 10) : 200;
  });
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    localStorage.setItem('notesColumnWidth', notesWidth.toString());
  }, [notesWidth]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = notesWidth;
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResizeMove = (e) => {
    if (!resizingRef.current) return;
    const diff = e.clientX - startXRef.current;
    const newWidth = Math.max(100, Math.min(600, startWidthRef.current + diff));
    setNotesWidth(newWidth);
  };

  const handleResizeEnd = () => {
    resizingRef.current = false;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleHeaderClick = (col) => {
    if (col.sortable === false) return;
    onSort(col.key);
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.order === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="table-container">
      <table className="pipeline-table">
        <thead>
          <tr>
            {COLUMNS.map(col => (
              <th
                key={col.key}
                onClick={() => handleHeaderClick(col)}
                className={`${col.sortable !== false ? 'sortable' : ''} ${col.key === 'notes' ? 'resizable-header' : ''}`}
                style={col.key === 'notes' ? { width: notesWidth, minWidth: notesWidth, maxWidth: notesWidth } : undefined}
              >
                {col.label}{getSortIndicator(col.key)}
                {col.key === 'notes' && (
                  <div
                    className="resize-handle"
                    onMouseDown={handleResizeStart}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.map(deal => (
            <DealRow
              key={deal.id}
              deal={deal}
              stages={stages}
              sources={sources}
              partners={partners}
              platforms={platforms}
              products={products}
              onUpdate={onUpdateDeal}
              onDelete={onDeleteDeal}
              notesWidth={notesWidth}
            />
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={COLUMNS.length}>
              <div className="table-footer-actions">
                <button className="add-deal-btn" onClick={onAddDeal}>
                  + Add Deal
                </button>
                <button className="refresh-btn" onClick={onRefresh} title="Refresh data">
                  ↻ Refresh
                </button>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
