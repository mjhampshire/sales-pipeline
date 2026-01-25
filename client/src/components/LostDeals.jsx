import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts';
import * as api from '../api';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
}

const formatAxisCurrency = (value) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
};

export default function LostDeals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDeal, setEditingDeal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sources, setSources] = useState([]);
  const [partners, setPartners] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dealsData, sourcesData, partnersData, platformsData, productsData] = await Promise.all([
        api.getArchivedLostDeals(),
        api.getListItems('source'),
        api.getListItems('partner'),
        api.getListItems('platform'),
        api.getListItems('product')
      ]);
      setDeals(dealsData || []);
      setSources(sourcesData || []);
      setPartners(partnersData || []);
      setPlatforms(platformsData || []);
      setProducts(productsData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDeals = async () => {
    try {
      const data = await api.getArchivedLostDeals();
      setDeals(data || []);
    } catch (err) {
      console.error('Failed to load lost deals:', err);
    }
  };

  const handleSave = async (updatedDeal) => {
    try {
      await api.updateArchivedDeal(updatedDeal.id, updatedDeal);
      setEditingDeal(null);
      loadDeals();
    } catch (err) {
      console.error('Failed to update deal:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteArchivedDeal(id);
      setDeleteConfirm(null);
      loadDeals();
    } catch (err) {
      console.error('Failed to delete deal:', err);
    }
  };

  const handleRestore = async (id) => {
    try {
      await api.restoreArchivedDeal(id);
      setEditingDeal(null);
      loadDeals();
    } catch (err) {
      console.error('Failed to restore deal:', err);
    }
  };

  // Calculate stats
  const totalValue = deals.reduce((sum, d) => sum + (d.deal_value || 0), 0);
  const totalCount = deals.length;

  // Group by month for chart
  const chartData = useMemo(() => {
    const monthlyData = {};
    deals.forEach(deal => {
      if (deal.close_month && deal.close_year) {
        const key = `${deal.close_year}-${String(deal.close_month).padStart(2, '0')}`;
        if (!monthlyData[key]) {
          monthlyData[key] = { value: 0, count: 0, month: deal.close_month, year: deal.close_year };
        }
        monthlyData[key].value += deal.deal_value || 0;
        monthlyData[key].count++;
      }
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, data]) => ({
        name: `${MONTH_NAMES[data.month - 1]} ${data.year}`,
        value: data.value,
        count: data.count
      }));
  }, [deals]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.name === 'Value'
              ? formatCurrency(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="archived-deals-container">
      <div className="archived-header">
        <h2>Lost Deals</h2>
        <div className="archived-stats">
          <div className="archived-stat">
            <span className="stat-label">Total Value</span>
            <span className="stat-value lost-value">{formatCurrency(totalValue)}</span>
          </div>
          <div className="archived-stat">
            <span className="stat-label">Total Deals</span>
            <span className="stat-value">{totalCount}</span>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="archived-chart">
          <h3>Monthly Lost Deals</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={formatAxisCurrency}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              <Bar
                yAxisId="left"
                dataKey="value"
                name="Value"
                fill="#f44336"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="count"
                name="Count"
                stroke="#ff9800"
                strokeWidth={2}
                dot={{ fill: '#ff9800' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {deals.length === 0 ? (
        <div className="archived-empty">
          <p>No lost deals archived yet. Lost deals are archived when you close a month.</p>
        </div>
      ) : (
        <table className="archived-table">
          <thead>
            <tr>
              <th>Deal Name</th>
              <th>Partner</th>
              <th>Platform</th>
              <th>Product</th>
              <th>Close Date</th>
              <th style={{ textAlign: 'right' }}>Value</th>
              <th>Notes</th>
              <th style={{ width: '80px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deals.map(deal => (
              <tr key={deal.id}>
                <td>{deal.deal_name}</td>
                <td>{deal.partner_name || '-'}</td>
                <td>{deal.platform_name || '-'}</td>
                <td>{deal.product_name || '-'}</td>
                <td>
                  {deal.close_month && deal.close_year
                    ? `${MONTH_NAMES[deal.close_month - 1]} ${deal.close_year}`
                    : '-'}
                </td>
                <td className="value-cell lost-value">{formatCurrency(deal.deal_value)}</td>
                <td className="notes-cell">{deal.notes || '-'}</td>
                <td className="actions-cell">
                  <button
                    className="btn-icon"
                    onClick={() => setEditingDeal(deal)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => setDeleteConfirm(deal)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingDeal && (
        <EditArchivedDealModal
          deal={editingDeal}
          onClose={() => setEditingDeal(null)}
          onSave={handleSave}
          onRestore={handleRestore}
          statusType="lost"
          sources={sources}
          partners={partners}
          platforms={platforms}
          products={products}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete Deal?</h3>
            <p>Are you sure you want to delete "{deleteConfirm.deal_name}"? This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditArchivedDealModal({ deal, onClose, onSave, onRestore, statusType, sources = [], partners = [], platforms = [], products = [] }) {
  const [formData, setFormData] = useState({
    deal_name: deal.deal_name || '',
    contact_name: deal.contact_name || '',
    source_name: deal.source_name || '',
    partner_name: deal.partner_name || '',
    platform_name: deal.platform_name || '',
    product_name: deal.product_name || '',
    deal_value: deal.deal_value || '',
    close_month: deal.close_month || '',
    close_year: deal.close_year || '',
    notes: deal.notes || ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: deal.id,
      ...formData,
      status: deal.status,
      deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
      close_month: formData.close_month ? parseInt(formData.close_month) : null,
      close_year: formData.close_year ? parseInt(formData.close_year) : null
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-archived-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit {statusType === 'won' ? 'Won' : 'Lost'} Deal</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body-scroll">
            <div className="form-grid">
              <div className="form-group">
                <label>Deal Name</label>
                <input
                  type="text"
                  value={formData.deal_name}
                  onChange={e => handleChange('deal_name', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Contact</label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={e => handleChange('contact_name', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Source</label>
                <select
                  value={formData.source_name}
                  onChange={e => handleChange('source_name', e.target.value)}
                >
                  <option value="">-</option>
                  {sources.map(s => (
                    <option key={s.id} value={s.value}>{s.value}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Partner</label>
                <select
                  value={formData.partner_name}
                  onChange={e => handleChange('partner_name', e.target.value)}
                >
                  <option value="">-</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.value}>{p.value}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Platform</label>
                <select
                  value={formData.platform_name}
                  onChange={e => handleChange('platform_name', e.target.value)}
                >
                  <option value="">-</option>
                  {platforms.map(p => (
                    <option key={p.id} value={p.value}>{p.value}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Product</label>
                <select
                  value={formData.product_name}
                  onChange={e => handleChange('product_name', e.target.value)}
                >
                  <option value="">-</option>
                  {products.map(p => (
                    <option key={p.id} value={p.value}>{p.value}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.deal_value}
                  onChange={e => handleChange('deal_value', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Close Month</label>
                <select
                  value={formData.close_month}
                  onChange={e => handleChange('close_month', e.target.value)}
                >
                  <option value="">-</option>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Close Year</label>
                <input
                  type="number"
                  value={formData.close_year}
                  onChange={e => handleChange('close_year', e.target.value)}
                  min="2020"
                  max="2030"
                />
              </div>
              <div className="form-group full-width">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn-restore"
              onClick={() => onRestore(deal.id)}
            >
              Move to Pipeline
            </button>
            <div className="action-spacer" />
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
