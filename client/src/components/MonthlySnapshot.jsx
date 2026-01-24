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
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
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

export default function MonthlySnapshot() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    try {
      const data = await api.getSnapshots();
      setSnapshots(data || []);
    } catch (err) {
      console.error('Failed to load snapshots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePriorMonth = async () => {
    setUpdating(true);
    try {
      await api.updatePriorMonth();
      await loadSnapshots();
      setUpdateConfirmOpen(false);
    } catch (err) {
      console.error('Failed to update prior month:', err);
      alert(err.message || 'Failed to update prior month');
    } finally {
      setUpdating(false);
    }
  };

  // Calculate prior month for display
  const getPriorMonthLabel = () => {
    const now = new Date();
    let priorMonth = now.getMonth(); // 0-indexed, so this is already prior month
    let priorYear = now.getFullYear();
    if (priorMonth === 0) {
      priorMonth = 12;
      priorYear--;
    }
    return `${SHORT_MONTH_NAMES[priorMonth - 1]} ${priorYear}`;
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Prepare chart data - historical trend (sorted chronologically)
  const historicalData = useMemo(() => {
    return [...snapshots]
      .sort((a, b) => {
        if (a.snapshot_year !== b.snapshot_year) {
          return a.snapshot_year - b.snapshot_year;
        }
        return a.snapshot_month - b.snapshot_month;
      })
      .map(s => ({
        name: `${SHORT_MONTH_NAMES[s.snapshot_month - 1]} ${s.snapshot_year}`,
        forecast: s.total_weighted_forecast,
        deals: s.total_deal_count
      }));
  }, [snapshots]);

  // Aggregate by product across all snapshots
  const productData = useMemo(() => {
    const productMap = {};
    snapshots.forEach(snapshot => {
      snapshot.breakdowns
        .filter(b => b.breakdown_type === 'product')
        .forEach(b => {
          if (!productMap[b.breakdown_name]) {
            productMap[b.breakdown_name] = { forecast: 0, deals: 0 };
          }
          productMap[b.breakdown_name].forecast += b.forecast_value;
          productMap[b.breakdown_name].deals += b.deal_count;
        });
    });

    return Object.entries(productMap)
      .sort((a, b) => b[1].forecast - a[1].forecast)
      .map(([name, data]) => ({
        name,
        forecast: data.forecast,
        deals: data.deals
      }));
  }, [snapshots]);

  // Aggregate by partner across all snapshots
  const partnerData = useMemo(() => {
    const partnerMap = {};
    snapshots.forEach(snapshot => {
      snapshot.breakdowns
        .filter(b => b.breakdown_type === 'partner')
        .forEach(b => {
          if (!partnerMap[b.breakdown_name]) {
            partnerMap[b.breakdown_name] = { forecast: 0, deals: 0 };
          }
          partnerMap[b.breakdown_name].forecast += b.forecast_value;
          partnerMap[b.breakdown_name].deals += b.deal_count;
        });
    });

    return Object.entries(partnerMap)
      .sort((a, b) => b[1].forecast - a[1].forecast)
      .map(([name, data]) => ({
        name,
        forecast: data.forecast,
        deals: data.deals
      }));
  }, [snapshots]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.name === 'Forecast'
              ? formatCurrency(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  };

  const renderChart = (title, data) => (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      {data.length === 0 ? (
        <div className="chart-empty">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 20, right: 60, left: 20, bottom: 60 }}>
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
              dataKey="forecast"
              name="Forecast"
              fill="#2196f3"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="deals"
              name="Deals"
              stroke="#4caf50"
              strokeWidth={2}
              dot={{ fill: '#4caf50' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (snapshots.length === 0) {
    return (
      <div className="snapshot-container">
        <div className="snapshot-empty">
          <h3>No Monthly Snapshots Yet</h3>
          <p>Snapshots are created when you close a month. Use the "Close Prior Month" button on the Pipeline page to create your first snapshot.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="snapshot-container">
      <div className="snapshot-header">
        <div className="snapshot-header-top">
          <div>
            <h2>Monthly Snapshots</h2>
            <p className="snapshot-description">
              Historical tracking of weighted pipeline forecast at month end
            </p>
          </div>
          <button
            className="update-prior-month-btn"
            onClick={() => setUpdateConfirmOpen(true)}
          >
            Update Prior Month
          </button>
        </div>
      </div>

      <div className="chart-grid snapshot-charts">
        {renderChart('Historical Weighted Forecast', historicalData)}
        {renderChart('Forecast by Product', productData)}
        {renderChart('Forecast by Partner', partnerData)}
      </div>

      <table className="snapshot-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}></th>
            <th>Month</th>
            <th style={{ textAlign: 'right' }}>Weighted Forecast</th>
            <th style={{ textAlign: 'right' }}>Deal Count</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map(snapshot => (
            <>
              <tr key={snapshot.id} className="snapshot-row">
                <td>
                  <button
                    className="expand-btn"
                    onClick={() => toggleRow(snapshot.id)}
                  >
                    {expandedRows.has(snapshot.id) ? '−' : '+'}
                  </button>
                </td>
                <td className="month-cell">
                  {MONTH_NAMES[snapshot.snapshot_month - 1]} {snapshot.snapshot_year}
                </td>
                <td className="value-cell">
                  {formatCurrency(snapshot.total_weighted_forecast)}
                </td>
                <td className="count-cell">
                  {snapshot.total_deal_count}
                </td>
              </tr>
              {expandedRows.has(snapshot.id) && (
                <tr key={`${snapshot.id}-breakdown`} className="breakdown-row">
                  <td colSpan="4">
                    <div className="breakdown-container">
                      <div className="breakdown-section">
                        <h4>By Product</h4>
                        <table className="breakdown-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th style={{ textAlign: 'right' }}>Deals</th>
                              <th style={{ textAlign: 'right' }}>Forecast</th>
                            </tr>
                          </thead>
                          <tbody>
                            {snapshot.breakdowns
                              .filter(b => b.breakdown_type === 'product')
                              .map((b, i) => (
                                <tr key={i}>
                                  <td>{b.breakdown_name}</td>
                                  <td style={{ textAlign: 'right' }}>{b.deal_count}</td>
                                  <td style={{ textAlign: 'right' }}>{formatCurrency(b.forecast_value)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="breakdown-section">
                        <h4>By Partner</h4>
                        <table className="breakdown-table">
                          <thead>
                            <tr>
                              <th>Partner</th>
                              <th style={{ textAlign: 'right' }}>Deals</th>
                              <th style={{ textAlign: 'right' }}>Forecast</th>
                            </tr>
                          </thead>
                          <tbody>
                            {snapshot.breakdowns
                              .filter(b => b.breakdown_type === 'partner')
                              .map((b, i) => (
                                <tr key={i}>
                                  <td>{b.breakdown_name}</td>
                                  <td style={{ textAlign: 'right' }}>{b.deal_count}</td>
                                  <td style={{ textAlign: 'right' }}>{formatCurrency(b.forecast_value)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>

      {updateConfirmOpen && (
        <div className="modal-overlay" onClick={() => setUpdateConfirmOpen(false)}>
          <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>Update Prior Month Snapshot?</h3>
            <p>
              This will recalculate the <strong>{getPriorMonthLabel()}</strong> snapshot
              using current pipeline data (excluding won/lost deals).
            </p>
            <p className="confirm-warning">
              The existing snapshot data will be replaced.
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setUpdateConfirmOpen(false)}
                disabled={updating}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleUpdatePriorMonth}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update Snapshot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
