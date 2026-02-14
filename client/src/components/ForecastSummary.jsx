import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const formatCurrency = (value) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

const formatTooltipCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const CHART_COLORS = {
  forecast: '#2196f3',
  count: '#4caf50'
};

export default function ForecastSummary({ deals, stages }) {
  // Filter deals with valid values and calculate weighted forecast
  // Only include deals with 'active' status
  const validDeals = useMemo(() => {
    return deals
      .filter(d => d.status === 'active' && d.deal_value != null && d.deal_stage_probability != null)
      .map(d => ({
        ...d,
        weighted_forecast: d.deal_value * (d.deal_stage_probability / 100)
      }));
  }, [deals]);

  // By Month - Future months only, sorted chronologically
  const byMonth = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed to match close_month

    const monthMap = {};
    validDeals.forEach(deal => {
      if (!deal.close_month || !deal.close_year) return;

      // Only include future months (current month and beyond)
      const isFuture = deal.close_year > currentYear ||
        (deal.close_year === currentYear && deal.close_month >= currentMonth);

      if (isFuture) {
        const key = `${deal.close_year}-${deal.close_month}`;
        const date = new Date(deal.close_year, deal.close_month - 1, 1);
        if (!monthMap[key]) {
          monthMap[key] = { date, forecast: 0, count: 0 };
        }
        monthMap[key].forecast += deal.weighted_forecast;
        monthMap[key].count += 1;
      }
    });

    return Object.values(monthMap)
      .sort((a, b) => a.date - b.date)
      .map(item => ({
        name: item.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        forecast: Math.round(item.forecast),
        count: item.count
      }));
  }, [validDeals]);

  // By Deal Stage - Grouped by stage name
  const byStage = useMemo(() => {
    const stageMap = {};
    validDeals.forEach(deal => {
      const stageName = deal.deal_stage_name || 'Unknown';
      if (!stageMap[stageName]) {
        stageMap[stageName] = { forecast: 0, count: 0 };
      }
      stageMap[stageName].forecast += deal.weighted_forecast;
      stageMap[stageName].count += 1;
    });

    // Sort by stage probability (using stages array) or alphabetically
    const stageOrder = stages.reduce((acc, s, idx) => {
      acc[s.name] = idx;
      return acc;
    }, {});

    return Object.entries(stageMap)
      .sort((a, b) => (stageOrder[a[0]] ?? 999) - (stageOrder[b[0]] ?? 999))
      .map(([name, data]) => ({
        name,
        forecast: Math.round(data.forecast),
        count: data.count
      }));
  }, [validDeals, stages]);

  // By Partner - Grouped by partner, sorted by forecast value
  const byPartner = useMemo(() => {
    const partnerMap = {};
    validDeals.forEach(deal => {
      const partnerName = deal.partner_name || 'No Partner';
      if (!partnerMap[partnerName]) {
        partnerMap[partnerName] = { forecast: 0, count: 0 };
      }
      partnerMap[partnerName].forecast += deal.weighted_forecast;
      partnerMap[partnerName].count += 1;
    });

    return Object.entries(partnerMap)
      .sort((a, b) => b[1].forecast - a[1].forecast)
      .map(([name, data]) => ({
        name,
        forecast: Math.round(data.forecast),
        count: data.count
      }));
  }, [validDeals]);

  // By Product - Grouped by product, sorted by forecast value
  const byProduct = useMemo(() => {
    const productMap = {};
    validDeals.forEach(deal => {
      const productName = deal.product_name || 'No Product';
      if (!productMap[productName]) {
        productMap[productName] = { forecast: 0, count: 0 };
      }
      productMap[productName].forecast += deal.weighted_forecast;
      productMap[productName].count += 1;
    });

    return Object.entries(productMap)
      .sort((a, b) => b[1].forecast - a[1].forecast)
      .map(([name, data]) => ({
        name,
        forecast: Math.round(data.forecast),
        count: data.count
      }));
  }, [validDeals]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.name === 'Forecast'
              ? formatTooltipCurrency(entry.value)
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
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
              tickFormatter={formatCurrency}
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
              fill={CHART_COLORS.forecast}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="count"
              name="Deal Count"
              fill={CHART_COLORS.count}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  const totalForecast = validDeals.reduce((sum, d) => sum + d.weighted_forecast, 0);
  const totalDeals = validDeals.length;

  return (
    <div className="forecast-summary">
      <div className="forecast-header">
        <div className="forecast-stat">
          <span className="stat-label">Total Weighted Forecast</span>
          <span className="stat-value">{formatTooltipCurrency(totalForecast)}</span>
        </div>
        <div className="forecast-stat">
          <span className="stat-label">Active Deals</span>
          <span className="stat-value">{totalDeals}</span>
        </div>
      </div>
      <div className="chart-grid">
        {renderChart('Forecast by Month', byMonth)}
        {renderChart('Forecast by Deal Stage', byStage)}
        {renderChart('Forecast by Partner', byPartner)}
        {renderChart('Forecast by Product', byProduct)}
      </div>
    </div>
  );
}
