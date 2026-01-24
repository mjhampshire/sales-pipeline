import { useRef } from 'react';
import EditableCell from './EditableCell';
import DropdownCell from './DropdownCell';

const STATUS_OPTIONS = [
  { id: 'won', value: 'Won' },
  { id: 'active', value: 'Active' },
  { id: 'keep_warm', value: 'Keep Warm' },
  { id: 'lost', value: 'Lost' }
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

export default function DealRow({ deal, stages, partners, platforms, products, onUpdate, onDelete }) {
  const cellRefs = useRef([]);

  const handleChange = (field, value) => {
    onUpdate(deal.id, { [field]: value });
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

  const statusClass = `status-${deal.status || 'active'}`;

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
    <tr className={statusClass}>
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
          value={deal.partner_id}
          displayValue={deal.partner_name}
          options={partners}
          onChange={(v) => handleChange('partner_id', v)}
          placeholder="Partner"
          {...makeTabHandlers(2)}
        />
      </td>
      <td ref={el => cellRefs.current[3] = el}>
        <DropdownCell
          value={deal.platform_id}
          displayValue={deal.platform_name}
          options={platforms}
          onChange={(v) => handleChange('platform_id', v)}
          placeholder="Platform"
          {...makeTabHandlers(3)}
        />
      </td>
      <td ref={el => cellRefs.current[4] = el}>
        <DropdownCell
          value={deal.product_id}
          displayValue={deal.product_name}
          options={products}
          onChange={(v) => handleChange('product_id', v)}
          placeholder="Product"
          {...makeTabHandlers(4)}
        />
      </td>
      <td ref={el => cellRefs.current[5] = el}>
        <DropdownCell
          value={deal.deal_stage_id}
          displayValue={deal.deal_stage_name}
          options={stages}
          onChange={(v) => handleChange('deal_stage_id', v)}
          placeholder="Stage"
          {...makeTabHandlers(5)}
        />
      </td>
      <td ref={el => cellRefs.current[6] = el}>
        <DropdownCell
          value={deal.status}
          displayValue={STATUS_OPTIONS.find(s => s.id === deal.status)?.value}
          options={STATUS_OPTIONS}
          onChange={(v) => handleChange('status', v)}
          placeholder="Status"
          {...makeTabHandlers(6)}
        />
      </td>
      <td ref={el => cellRefs.current[7] = el}>
        <EditableCell
          value={deal.open_date}
          onChange={(v) => handleChange('open_date', v)}
          type="date"
          {...makeTabHandlers(7)}
        />
      </td>
      <td ref={el => cellRefs.current[8] = el}>
        <DropdownCell
          value={getCloseDateValue()}
          displayValue={getCloseDateDisplay()}
          options={CLOSE_DATE_OPTIONS}
          onChange={handleCloseDateChange}
          placeholder="Close Date"
          {...makeTabHandlers(8)}
        />
      </td>
      <td ref={el => cellRefs.current[9] = el}>
        <EditableCell
          value={deal.deal_value}
          onChange={(v) => handleChange('deal_value', v ? parseFloat(v) : null)}
          type="number"
          placeholder="0"
          {...makeTabHandlers(9)}
        />
      </td>
      <td className="forecast-cell">{weightedForecast}</td>
      <td ref={el => cellRefs.current[10] = el}>
        <EditableCell
          value={deal.notes}
          onChange={(v) => handleChange('notes', v)}
          placeholder="Notes"
          {...makeTabHandlers(10)}
        />
      </td>
      <td ref={el => cellRefs.current[11] = el}>
        <EditableCell
          value={deal.next_step_date}
          onChange={(v) => handleChange('next_step_date', v)}
          type="date"
          {...makeTabHandlers(11)}
        />
      </td>
      <td>
        <button className="delete-btn" onClick={() => onDelete(deal.id)}>×</button>
      </td>
    </tr>
  );
}
