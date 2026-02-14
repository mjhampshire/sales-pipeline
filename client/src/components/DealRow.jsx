import { useRef, useState, useEffect } from 'react';
import EditableCell from './EditableCell';
import DropdownCell from './DropdownCell';

const STATUS_OPTIONS = [
  { id: 'won', value: 'Won' },
  { id: 'active', value: 'Active' },
  { id: 'keep_warm', value: 'Keep Warm' },
  { id: 'lost', value: 'Lost' }
];

const ROW_COLORS = [
  { id: null, value: 'None', color: null },
  { id: 'blue', value: 'Blue', color: '#e3f2fd' },
  { id: 'yellow', value: 'Yellow', color: '#fff9c4' },
  { id: 'orange', value: 'Orange', color: '#ffe0b2' },
  { id: 'purple', value: 'Purple', color: '#e1bee7' },
  { id: 'cyan', value: 'Cyan', color: '#b2ebf2' },
  { id: 'pink', value: 'Pink', color: '#f8bbd9' },
  { id: 'grey', value: 'Grey', color: '#e0e0e0' }
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Generate close date options: current year + 5 years, all months
const generateCloseDateOptions = () => {
  const options = [];
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year <= currentYear + 5; year++) {
    for (let month = 0; month < 12; month++) {
      options.push({
        id: `${year}-${month + 1}`,
        value: `${MONTHS[month]} ${year}`,
        month: month + 1,
        year: year
      });
    }
  }
  return options;
};

const CLOSE_DATE_OPTIONS = generateCloseDateOptions();

function formatCurrency(value) {
  if (value == null || isNaN(value)) return '-';
  return '$' + Math.round(value).toLocaleString('en-US');
}

export default function DealRow({ deal, stages, sources, partners, platforms, products, onUpdate, onDelete }) {
  const cellRefs = useRef([]);
  const colorPickerRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker]);

  const handleChange = (field, value) => {
    onUpdate(deal.id, { [field]: value });
  };

  const handleTogglePriority = () => {
    onUpdate(deal.id, { is_priority: deal.is_priority ? 0 : 1 });
  };

  const handleColorChange = (colorId) => {
    onUpdate(deal.id, { row_color: colorId });
    setShowColorPicker(false);
  };

  const handleCloseDateChange = (value) => {
    if (!value) {
      onUpdate(deal.id, { close_month: null, close_year: null });
    } else {
      const [year, month] = value.split('-').map(Number);
      onUpdate(deal.id, { close_month: month, close_year: year });
    }
  };

  const getCloseDateValue = () => {
    if (deal.close_month && deal.close_year) {
      return `${deal.close_year}-${deal.close_month}`;
    }
    return null;
  };

  const getCloseDateDisplay = () => {
    if (deal.close_month && deal.close_year) {
      return `${MONTHS[deal.close_month - 1]} ${deal.close_year}`;
    }
    return null;
  };

  const weightedForecast = deal.deal_value && deal.deal_stage_probability
    ? formatCurrency(deal.deal_value * deal.deal_stage_probability / 100)
    : '-';

  // Only apply status colors for won/lost
  const isWonOrLost = deal.status === 'won' || deal.status === 'lost';
  const statusClass = isWonOrLost ? `status-${deal.status}` : '';

  // Get background color from row_color (only if not won/lost)
  const rowColor = !isWonOrLost && deal.row_color
    ? ROW_COLORS.find(c => c.id === deal.row_color)?.color
    : null;

  // Priority styling
  const isPriority = deal.is_priority === 1;

  // Focus helpers for tab navigation
  const focusCell = (index) => {
    setTimeout(() => {
      const cell = cellRefs.current[index];
      if (cell) {
        const focusable = cell.querySelector('[tabindex="0"], input, button');
        if (focusable) focusable.focus();
      }
    }, 0);
  };

  const makeTabHandlers = (index) => ({
    onTab: () => focusCell(index + 1),
    onShiftTab: () => focusCell(index - 1)
  });

  return (
    <tr
      className={`${statusClass} ${isPriority ? 'priority-row' : ''}`}
      style={rowColor ? { backgroundColor: rowColor } : undefined}
    >
      <td className="flag-cell">
        <button
          className={`flag-btn ${isPriority ? 'flagged' : ''}`}
          onClick={handleTogglePriority}
          title={isPriority ? 'Remove priority' : 'Mark as priority'}
        >
          &#9873;
        </button>
      </td>
      <td className="color-cell">
        <div className="color-picker-container" ref={colorPickerRef}>
          <button
            className="color-btn"
            onClick={() => setShowColorPicker(!showColorPicker)}
            style={{ backgroundColor: rowColor || '#fff' }}
            title="Set row color"
          >
            &#9632;
          </button>
          {showColorPicker && (
            <div className="color-picker-dropdown">
              {ROW_COLORS.map(c => (
                <button
                  key={c.id || 'none'}
                  className={`color-option ${deal.row_color === c.id ? 'selected' : ''}`}
                  style={{ backgroundColor: c.color || '#fff' }}
                  onClick={() => handleColorChange(c.id)}
                  title={c.value}
                >
                  {c.id === null && '×'}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      <td ref={el => cellRefs.current[0] = el}>
        <EditableCell
          value={deal.deal_name}
          onChange={(v) => handleChange('deal_name', v)}
          placeholder="Deal name"
          {...makeTabHandlers(0)}
        />
      </td>
      <td ref={el => cellRefs.current[1] = el}>
        <EditableCell
          value={deal.contact_name}
          onChange={(v) => handleChange('contact_name', v)}
          placeholder="Contact"
          {...makeTabHandlers(1)}
        />
      </td>
      <td ref={el => cellRefs.current[2] = el}>
        <DropdownCell
          value={deal.source_id}
          displayValue={deal.source_name}
          options={sources}
          onChange={(v) => handleChange('source_id', v)}
          placeholder="Source"
          {...makeTabHandlers(2)}
        />
      </td>
      <td ref={el => cellRefs.current[3] = el}>
        <DropdownCell
          value={deal.partner_id}
          displayValue={deal.partner_name}
          options={partners}
          onChange={(v) => handleChange('partner_id', v)}
          placeholder="Partner"
          {...makeTabHandlers(3)}
        />
      </td>
      <td ref={el => cellRefs.current[4] = el}>
        <DropdownCell
          value={deal.platform_id}
          displayValue={deal.platform_name}
          options={platforms}
          onChange={(v) => handleChange('platform_id', v)}
          placeholder="Platform"
          {...makeTabHandlers(4)}
        />
      </td>
      <td ref={el => cellRefs.current[5] = el}>
        <DropdownCell
          value={deal.product_id}
          displayValue={deal.product_name}
          options={products}
          onChange={(v) => handleChange('product_id', v)}
          placeholder="Product"
          {...makeTabHandlers(5)}
        />
      </td>
      <td ref={el => cellRefs.current[6] = el}>
        <DropdownCell
          value={deal.deal_stage_id}
          displayValue={deal.deal_stage_name}
          options={stages}
          onChange={(v) => handleChange('deal_stage_id', v)}
          placeholder="Stage"
          {...makeTabHandlers(6)}
        />
      </td>
      <td ref={el => cellRefs.current[7] = el}>
        <DropdownCell
          value={deal.status}
          displayValue={STATUS_OPTIONS.find(s => s.id === deal.status)?.value}
          options={STATUS_OPTIONS}
          onChange={(v) => handleChange('status', v)}
          placeholder="Status"
          {...makeTabHandlers(7)}
        />
      </td>
      <td ref={el => cellRefs.current[8] = el}>
        <EditableCell
          value={deal.open_date}
          onChange={(v) => handleChange('open_date', v)}
          type="date"
          {...makeTabHandlers(8)}
        />
      </td>
      <td ref={el => cellRefs.current[9] = el}>
        <DropdownCell
          value={getCloseDateValue()}
          displayValue={getCloseDateDisplay()}
          options={CLOSE_DATE_OPTIONS}
          onChange={handleCloseDateChange}
          placeholder="Close Date"
          {...makeTabHandlers(9)}
        />
      </td>
      <td ref={el => cellRefs.current[10] = el}>
        <EditableCell
          value={deal.deal_value}
          onChange={(v) => handleChange('deal_value', v ? parseFloat(v) : null)}
          type="number"
          placeholder="0"
          {...makeTabHandlers(10)}
        />
      </td>
      <td className="forecast-cell">{weightedForecast}</td>
      <td ref={el => cellRefs.current[11] = el}>
        <EditableCell
          value={deal.notes}
          onChange={(v) => handleChange('notes', v)}
          placeholder="Notes"
          {...makeTabHandlers(11)}
        />
      </td>
      <td ref={el => cellRefs.current[12] = el}>
        <EditableCell
          value={deal.next_step_date}
          onChange={(v) => handleChange('next_step_date', v)}
          type="date"
          {...makeTabHandlers(12)}
        />
      </td>
      <td>
        <button className="delete-btn" onClick={() => onDelete(deal.id)}>×</button>
      </td>
    </tr>
  );
}
