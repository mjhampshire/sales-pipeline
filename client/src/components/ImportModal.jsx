import { useState, useRef } from 'react';

const DEAL_FIELDS = [
  { key: '', label: '-- Skip this column --' },
  { key: 'deal_name', label: 'Deal Name' },
  { key: 'contact_name', label: 'Contact' },
  { key: 'partner', label: 'Partner', listType: 'partner' },
  { key: 'platform', label: 'Platform', listType: 'platform' },
  { key: 'product', label: 'Product', listType: 'product' },
  { key: 'stage', label: 'Stage', listType: 'stage' },
  { key: 'status', label: 'Status' },
  { key: 'open_date', label: 'Open Date' },
  { key: 'close_date', label: 'Close Date' },
  { key: 'deal_value', label: 'Deal Value' },
  { key: 'notes', label: 'Notes' },
  { key: 'next_step_date', label: 'Action Date' }
];

function parseCSV(text) {
  // Remove BOM if present (common in Excel-exported CSVs)
  const cleanText = text.replace(/^\uFEFF/, '');
  if (!cleanText.trim()) return { headers: [], rows: [] };

  // Parse CSV handling quoted fields that may contain newlines
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quoted field
        currentField += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      // End of row (handle \r\n, \r, or \n)
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip the \n in \r\n
      }
      // Push last field and complete the row
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      // Regular character (including newlines inside quotes)
      currentField += char;
    }
  }

  // Handle last field/row if file doesn't end with newline
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return { headers, rows: dataRows };
}

// Parse Australian date format (DD/MM/YYYY) and extract month/year
function parseAustralianDate(dateStr) {
  if (!dateStr) return null;

  // Try DD/MM/YYYY or D/M/YYYY format
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    return { month, year };
  }

  // Try MM/YYYY or M/YYYY format
  const monthYearMatch = dateStr.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYearMatch) {
    const month = parseInt(monthYearMatch[1], 10);
    const year = parseInt(monthYearMatch[2], 10);
    return { month, year };
  }

  return null;
}

// Parse date for open_date and next_step_date (keep full date)
function parseFullDate(dateStr) {
  if (!dateStr) return null;

  // Try DD/MM/YYYY format
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  return null;
}

const VALID_STATUSES = ['won', 'active', 'keep_warm', 'lost'];

// Check if a close date should be auto-archived (before preceding month)
function shouldAutoArchive(closeMonth, closeYear) {
  if (!closeMonth || !closeYear) return false;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Calculate preceding month (month before last)
  let precedingMonth = currentMonth - 2;
  let precedingYear = currentYear;
  if (precedingMonth <= 0) {
    precedingMonth += 12;
    precedingYear--;
  }

  // If close date is before or equal to preceding month, auto-archive
  if (closeYear < precedingYear) return true;
  if (closeYear === precedingYear && closeMonth <= precedingMonth) return true;
  return false;
}

export default function ImportModal({
  isOpen,
  onClose,
  stages,
  partners,
  platforms,
  products,
  deals,
  onCreateStage,
  onCreateListItem,
  onCreateDeal,
  onCreateArchivedDeal,
  onReloadData
}) {
  const [step, setStep] = useState('upload'); // upload, map, importing, done
  const [csvData, setCsvData] = useState({ headers: [], rows: [] });
  const [mappings, setMappings] = useState({});
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState({ success: 0, errors: [] });
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseCSV(text);
      setCsvData(parsed);

      // Auto-map columns based on header names
      const autoMappings = {};
      parsed.headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().replace(/[_\s]+/g, '');
        const matchedField = DEAL_FIELDS.find(f => {
          if (!f.key) return false;
          const normalizedKey = f.key.toLowerCase().replace(/[_\s]+/g, '');
          const normalizedLabel = f.label.toLowerCase().replace(/[_\s]+/g, '');
          return normalizedHeader === normalizedKey ||
                 normalizedHeader === normalizedLabel ||
                 normalizedHeader.includes(normalizedKey) ||
                 normalizedKey.includes(normalizedHeader);
        });
        autoMappings[index] = matchedField ? matchedField.key : '';
      });
      setMappings(autoMappings);
      setStep('map');
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (columnIndex, fieldKey) => {
    setMappings(prev => ({ ...prev, [columnIndex]: fieldKey }));
  };

  const handleImport = async () => {
    setStep('importing');
    setImportProgress({ current: 0, total: csvData.rows.length });
    setImportResults({ success: 0, errors: [] });

    let successCount = 0;
    const errors = [];

    // Build lookup maps from current data (use value property for list items)
    const partnerMap = new Map();
    partners.forEach(p => partnerMap.set((p.value || '').toLowerCase().trim(), p.id));

    const platformMap = new Map();
    platforms.forEach(p => platformMap.set((p.value || '').toLowerCase().trim(), p.id));

    const productMap = new Map();
    products.forEach(p => productMap.set((p.value || '').toLowerCase().trim(), p.id));

    const stageMap = new Map();
    stages.forEach(s => stageMap.set((s.name || '').toLowerCase().trim(), s.id));

    // Build set of existing deal names for duplicate checking
    const existingDealNames = new Set();
    deals.forEach(d => {
      if (d.deal_name) {
        existingDealNames.add(d.deal_name.toLowerCase().trim());
      }
    });

    // Track deal names imported in this batch
    const importedDealNames = new Set();

    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i];
      setImportProgress({ current: i + 1, total: csvData.rows.length });

      try {
        const dealData = {};

        // Process each mapped column
        for (const [colIndex, fieldKey] of Object.entries(mappings)) {
          if (!fieldKey) continue;

          const value = row[parseInt(colIndex)];
          if (value === undefined || value === '') continue;

          const fieldDef = DEAL_FIELDS.find(f => f.key === fieldKey);

          if (fieldKey === 'close_date') {
            const parsed = parseAustralianDate(value);
            if (parsed) {
              dealData.close_month = parsed.month;
              dealData.close_year = parsed.year;
            }
          } else if (fieldKey === 'open_date' || fieldKey === 'next_step_date') {
            const parsed = parseFullDate(value);
            if (parsed) {
              dealData[fieldKey] = parsed;
            }
          } else if (fieldKey === 'deal_value') {
            // Remove currency symbols, spaces, and parse number
            const cleanValue = value.replace(/[$,\s]/g, '');
            const numValue = parseFloat(cleanValue);
            if (!isNaN(numValue)) {
              dealData.deal_value = numValue;
            }
          } else if (fieldKey === 'status') {
            // Normalize status value
            const normalizedStatus = value.toLowerCase().trim().replace(/[\s_-]+/g, '_');
            if (VALID_STATUSES.includes(normalizedStatus)) {
              dealData.status = normalizedStatus;
            } else {
              // Try to match partial status names
              const statusMatch = VALID_STATUSES.find(s =>
                s.includes(normalizedStatus) || normalizedStatus.includes(s.replace('_', ''))
              );
              if (statusMatch) {
                dealData.status = statusMatch;
              }
            }
          } else if (fieldDef?.listType === 'partner') {
            const normalizedName = value.trim().toLowerCase();
            let partnerId = partnerMap.get(normalizedName);
            if (partnerId === undefined) {
              // Create new partner
              try {
                const newItem = await onCreateListItem('partner', { value: value.trim() });
                if (newItem && newItem.id != null) {
                  partnerId = newItem.id;
                  partnerMap.set(normalizedName, partnerId);
                }
              } catch (err) {
                console.error('Failed to create partner:', err);
              }
            }
            if (partnerId != null) dealData.partner_id = partnerId;
          } else if (fieldDef?.listType === 'platform') {
            const normalizedName = value.trim().toLowerCase();
            let platformId = platformMap.get(normalizedName);
            if (platformId === undefined) {
              // Create new platform
              try {
                const newItem = await onCreateListItem('platform', { value: value.trim() });
                if (newItem && newItem.id != null) {
                  platformId = newItem.id;
                  platformMap.set(normalizedName, platformId);
                }
              } catch (err) {
                console.error('Failed to create platform:', err);
              }
            }
            if (platformId != null) dealData.platform_id = platformId;
          } else if (fieldDef?.listType === 'product') {
            const normalizedName = value.trim().toLowerCase();
            let productId = productMap.get(normalizedName);
            if (productId === undefined) {
              // Create new product
              try {
                const newItem = await onCreateListItem('product', { value: value.trim() });
                if (newItem && newItem.id != null) {
                  productId = newItem.id;
                  productMap.set(normalizedName, productId);
                }
              } catch (err) {
                console.error('Failed to create product:', err);
              }
            }
            if (productId != null) dealData.product_id = productId;
          } else if (fieldDef?.listType === 'stage') {
            const normalizedName = value.trim().toLowerCase();
            let stageId = stageMap.get(normalizedName);
            if (stageId === undefined) {
              // Create new stage with default probability
              try {
                const newStage = await onCreateStage({ name: value.trim(), probability: 50 });
                if (newStage && newStage.id != null) {
                  stageId = newStage.id;
                  stageMap.set(normalizedName, stageId);
                }
              } catch (err) {
                console.error('Failed to create stage:', err);
              }
            }
            if (stageId != null) dealData.deal_stage_id = stageId;
          } else {
            dealData[fieldKey] = value;
          }
        }

        // Validate deal
        if (!dealData.deal_name) {
          errors.push(`Row ${i + 2}: No deal name provided`);
          continue;
        }

        const normalizedDealName = dealData.deal_name.toLowerCase().trim();

        // Check for duplicate against existing deals
        if (existingDealNames.has(normalizedDealName)) {
          errors.push(`Row ${i + 2}: Deal "${dealData.deal_name}" already exists`);
          continue;
        }

        // Check for duplicate within this import batch
        if (importedDealNames.has(normalizedDealName)) {
          errors.push(`Row ${i + 2}: Duplicate deal "${dealData.deal_name}" in import file`);
          continue;
        }

        // Check if this is an old won/lost deal that should be auto-archived
        const isWonOrLost = dealData.status === 'won' || dealData.status === 'lost';
        const shouldArchive = isWonOrLost && shouldAutoArchive(dealData.close_month, dealData.close_year);

        if (shouldArchive && onCreateArchivedDeal) {
          // Calculate the archive month (prior month from current)
          const now = new Date();
          const currentMonth = now.getMonth() + 1;
          const currentYear = now.getFullYear();
          let archivedForMonth = currentMonth - 1;
          let archivedForYear = currentYear;
          if (archivedForMonth === 0) {
            archivedForMonth = 12;
            archivedForYear = currentYear - 1;
          }

          // Get names for the archived deal
          const partnerName = dealData.partner_id ?
            partners.find(p => p.id === dealData.partner_id)?.value || null : null;
          const platformName = dealData.platform_id ?
            platforms.find(p => p.id === dealData.platform_id)?.value || null : null;
          const productName = dealData.product_id ?
            products.find(p => p.id === dealData.product_id)?.value || null : null;
          const stageName = dealData.deal_stage_id ?
            stages.find(s => s.id === dealData.deal_stage_id)?.name || null : null;

          await onCreateArchivedDeal({
            deal_name: dealData.deal_name,
            contact_name: dealData.contact_name || null,
            partner_name: partnerName,
            platform_name: platformName,
            product_name: productName,
            deal_stage_name: stageName,
            status: dealData.status,
            open_date: dealData.open_date || null,
            close_month: dealData.close_month || null,
            close_year: dealData.close_year || null,
            deal_value: dealData.deal_value || null,
            notes: dealData.notes || null,
            archived_for_month: archivedForMonth,
            archived_for_year: archivedForYear
          });
        } else {
          await onCreateDeal(dealData);
        }
        importedDealNames.add(normalizedDealName);
        existingDealNames.add(normalizedDealName);
        successCount++;
      } catch (err) {
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    setImportResults({ success: successCount, errors });
    setStep('done');
    await onReloadData();
  };

  const handleClose = () => {
    setStep('upload');
    setCsvData({ headers: [], rows: [] });
    setMappings({});
    setImportProgress({ current: 0, total: 0 });
    setImportResults({ success: 0, errors: [] });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content import-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Deals from CSV</h2>
          <button className="modal-close" onClick={handleClose}>&times;</button>
        </div>

        <div className="modal-body">
          {step === 'upload' && (
            <div className="import-upload">
              <p>Select a CSV file to import deals. The first row should contain column headers.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="file-input"
              />
            </div>
          )}

          {step === 'map' && (
            <div className="import-mapping">
              <p>Map your CSV columns to deal fields. Columns mapped to "Skip" will be ignored.</p>
              <p className="import-info">Found {csvData.rows.length} rows to import.</p>

              <div className="mapping-list">
                {csvData.headers.map((header, index) => (
                  <div key={index} className="mapping-row">
                    <span className="csv-column">{header}</span>
                    <span className="mapping-arrow">→</span>
                    <select
                      value={mappings[index] || ''}
                      onChange={(e) => handleMappingChange(index, e.target.value)}
                      className="mapping-select"
                    >
                      {DEAL_FIELDS.map(field => (
                        <option key={field.key} value={field.key}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="import-preview">
                <h4>Preview (first 3 rows)</h4>
                <div className="preview-table-container">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        {csvData.headers.map((header, i) => (
                          <th key={i}>{mappings[i] ? DEAL_FIELDS.find(f => f.key === mappings[i])?.label : <em>Skip</em>}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.rows.slice(0, 3).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className={!mappings[cellIndex] ? 'skipped' : ''}>
                              {cell || <em>empty</em>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="import-actions">
                <button className="btn-secondary" onClick={() => setStep('upload')}>
                  Back
                </button>
                <button className="btn-primary" onClick={handleImport}>
                  Import {csvData.rows.length} Deals
                </button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="import-progress">
              <p>Importing deals...</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
              <p className="progress-text">
                {importProgress.current} of {importProgress.total}
              </p>
            </div>
          )}

          {step === 'done' && (
            <div className="import-results">
              <h3>Import Complete</h3>
              <p className="success-count">
                Successfully imported {importResults.success} deal{importResults.success !== 1 ? 's' : ''}.
              </p>
              {importResults.errors.length > 0 && (
                <div className="error-list">
                  <h4>Errors ({importResults.errors.length})</h4>
                  <ul>
                    {importResults.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="import-actions">
                <button className="btn-primary" onClick={handleClose}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
