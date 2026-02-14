const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, queries } = require('./db');
const { verifyToken } = require('./auth');
const authRoutes = require('./authRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the built client in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// Auto-close month check function
async function checkAndAutoCloseMonth() {
  const now = new Date();
  const currentDay = now.getDate();

  // Only auto-close on the 1st of the month
  if (currentDay !== 1) return;

  // Calculate prior month (the month that just ended)
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  let priorMonth = currentMonth - 1;
  let priorYear = currentYear;
  if (priorMonth === 0) {
    priorMonth = 12;
    priorYear = currentYear - 1;
  }

  // Check if already closed
  const alreadyClosed = await queries.isMonthClosed(priorMonth, priorYear);
  if (alreadyClosed) {
    console.log(`Month ${priorMonth}/${priorYear} already closed, skipping auto-close`);
    return;
  }

  console.log(`Auto-closing month ${priorMonth}/${priorYear}...`);

  try {
    // Get active deals for snapshot
    const activeDeals = await queries.getActiveDealsForForecast();

    // Calculate weighted forecast totals
    let totalWeightedForecast = 0;
    const productBreakdown = {};
    const partnerBreakdown = {};

    activeDeals.forEach(deal => {
      const value = deal.deal_value || 0;
      const probability = (deal.deal_stage_probability || 0) / 100;
      const weightedValue = value * probability;
      totalWeightedForecast += weightedValue;

      const productName = deal.product_name || 'Unassigned';
      if (!productBreakdown[productName]) {
        productBreakdown[productName] = { count: 0, value: 0 };
      }
      productBreakdown[productName].count++;
      productBreakdown[productName].value += weightedValue;

      const partnerName = deal.partner_name || 'Unassigned';
      if (!partnerBreakdown[partnerName]) {
        partnerBreakdown[partnerName] = { count: 0, value: 0 };
      }
      partnerBreakdown[partnerName].count++;
      partnerBreakdown[partnerName].value += weightedValue;
    });

    // Create snapshot
    const snapshotResult = await queries.createSnapshot(
      priorMonth,
      priorYear,
      totalWeightedForecast,
      activeDeals.length
    );
    const snapshotId = snapshotResult.lastInsertRowid;

    // Create breakdowns
    for (const [name, data] of Object.entries(productBreakdown)) {
      await queries.createSnapshotBreakdown(snapshotId, 'product', name, data.count, data.value);
    }

    for (const [name, data] of Object.entries(partnerBreakdown)) {
      await queries.createSnapshotBreakdown(snapshotId, 'partner', name, data.count, data.value);
    }

    // Archive won/lost deals
    const wonLostDeals = await queries.getWonLostDeals();
    for (const deal of wonLostDeals) {
      await queries.createArchivedDeal({
        original_deal_id: deal.id,
        deal_name: deal.deal_name,
        contact_name: deal.contact_name,
        source_name: deal.source_name,
        partner_name: deal.partner_name,
        platform_name: deal.platform_name,
        product_name: deal.product_name,
        deal_stage_name: deal.deal_stage_name,
        status: deal.status,
        open_date: deal.open_date,
        close_month: deal.close_month,
        close_year: deal.close_year,
        deal_value: deal.deal_value,
        notes: deal.notes,
        archived_for_month: priorMonth,
        archived_for_year: priorYear
      });
      await queries.deleteDeal(deal.id);
    }

    // Log the close
    await queries.logClosedMonth(priorMonth, priorYear, 'auto');
    console.log(`Successfully auto-closed month ${priorMonth}/${priorYear}`);
  } catch (err) {
    console.error('Auto-close failed:', err);
  }
}

// Schedule auto-close check at midnight
function scheduleAutoClose() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const msUntilMidnight = tomorrow.getTime() - now.getTime();

  // Schedule first check at midnight
  setTimeout(() => {
    checkAndAutoCloseMonth();
    // Then check daily
    setInterval(checkAndAutoCloseMonth, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);

  console.log(`Auto-close scheduled for midnight (in ${Math.round(msUntilMidnight / 1000 / 60)} minutes)`);
}

// Initialize database and start server
initDb().then(() => {
  // Mount auth routes (public - no token required for login/setup)
  app.use('/api/auth', authRoutes);

  // Load protected routes after DB is initialized
  const routes = require('./routes');
  app.use('/api', verifyToken, routes);

  // Serve index.html for all other routes in production (client-side routing)
  if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    scheduleAutoClose();
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
