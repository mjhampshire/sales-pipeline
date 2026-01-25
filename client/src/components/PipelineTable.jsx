import DealRow from './DealRow';

const COLUMNS = [
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
                className={col.sortable !== false ? 'sortable' : ''}
              >
                {col.label}{getSortIndicator(col.key)}
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
