const express = require('express');
const { queries } = require('./db');

const router = express.Router();

// ============ DEALS ============

// Get all deals
router.get('/deals', (req, res) => {
  try {
    const { sort = 'id', order = 'asc' } = req.query;
    const deals = queries.getAllDeals(sort, order);
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create deal
router.post('/deals', (req, res) => {
  try {
    const data = {
      deal_name: req.body.deal_name || 'New Deal',
      contact_name: req.body.contact_name || null,
      partner_id: req.body.partner_id || null,
      platform_id: req.body.platform_id || null,
      product_id: req.body.product_id || null,
      deal_stage_id: req.body.deal_stage_id || null,
      status: req.body.status || 'active',
      open_date: req.body.open_date || new Date().toISOString().split('T')[0],
      close_month: req.body.close_month || null,
      close_year: req.body.close_year || null,
      deal_value: req.body.deal_value || null,
      notes: req.body.notes || null,
      next_step_date: req.body.next_step_date || null
    };
    const result = queries.createDeal(data);
    const deal = queries.getDealById(result.lastInsertRowid);
    res.status(201).json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update deal
router.put('/deals/:id', (req, res) => {
  try {
    const existing = queries.getDealById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const data = {
      id: parseInt(req.params.id),
      deal_name: req.body.deal_name ?? existing.deal_name,
      contact_name: req.body.contact_name ?? existing.contact_name,
      partner_id: req.body.partner_id ?? existing.partner_id,
      platform_id: req.body.platform_id ?? existing.platform_id,
      product_id: req.body.product_id ?? existing.product_id,
      deal_stage_id: req.body.deal_stage_id ?? existing.deal_stage_id,
      status: req.body.status ?? existing.status,
      open_date: req.body.open_date ?? existing.open_date,
      close_month: req.body.close_month ?? existing.close_month,
      close_year: req.body.close_year ?? existing.close_year,
      deal_value: req.body.deal_value ?? existing.deal_value,
      notes: req.body.notes ?? existing.notes,
      next_step_date: req.body.next_step_date ?? existing.next_step_date
    };

    queries.updateDeal(data);
    const deal = queries.getDealById(req.params.id);
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete deal
router.delete('/deals/:id', (req, res) => {
  try {
    // Check if deal exists first
    const existing = queries.getDealById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    queries.deleteDeal(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ DEAL STAGES ============

// Get all stages
router.get('/stages', (req, res) => {
  try {
    const stages = queries.getAllStages();
    res.json(stages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create stage
router.post('/stages', (req, res) => {
  try {
    const { name, probability = 0, sort_order = 0 } = req.body;
    const result = queries.createStage(name, probability, sort_order);
    res.status(201).json({ id: result.lastInsertRowid, name, probability, sort_order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update stage
router.put('/stages/:id', (req, res) => {
  try {
    const { name, probability, sort_order } = req.body;
    queries.updateStage(name, probability, sort_order, req.params.id);
    res.json({ id: parseInt(req.params.id), name, probability, sort_order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete stage
router.delete('/stages/:id', (req, res) => {
  try {
    queries.deleteStage(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ LIST ITEMS ============

// Get list items by type
router.get('/lists/:type', (req, res) => {
  try {
    const validTypes = ['partner', 'platform', 'product'];
    if (!validTypes.includes(req.params.type)) {
      return res.status(400).json({ error: 'Invalid list type' });
    }
    const items = queries.getListItems(req.params.type);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create list item
router.post('/lists/:type', (req, res) => {
  try {
    const validTypes = ['partner', 'platform', 'product'];
    if (!validTypes.includes(req.params.type)) {
      return res.status(400).json({ error: 'Invalid list type' });
    }
    const { value, sort_order = 0 } = req.body;
    const result = queries.createListItem(req.params.type, value, sort_order);
    res.status(201).json({ id: result.lastInsertRowid, list_type: req.params.type, value, sort_order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update list item
router.put('/lists/:type/:id', (req, res) => {
  try {
    const { value, sort_order } = req.body;
    queries.updateListItem(value, sort_order, req.params.id);
    res.json({ id: parseInt(req.params.id), list_type: req.params.type, value, sort_order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete list item
router.delete('/lists/:type/:id', (req, res) => {
  try {
    queries.deleteListItem(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ MONTHLY SNAPSHOTS ============

// Get all monthly snapshots with breakdowns
router.get('/snapshots', (req, res) => {
  try {
    const snapshots = queries.getAllSnapshots();
    // Attach breakdowns to each snapshot
    const snapshotsWithBreakdowns = snapshots.map(snapshot => ({
      ...snapshot,
      breakdowns: queries.getSnapshotBreakdowns(snapshot.id)
    }));
    res.json(snapshotsWithBreakdowns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ARCHIVED DEALS ============

// Get archived won deals
router.get('/archived/won', (req, res) => {
  try {
    const deals = queries.getArchivedDeals('won');
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get archived lost deals
router.get('/archived/lost', (req, res) => {
  try {
    const deals = queries.getArchivedDeals('lost');
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Directly archive a deal (for CSV import of old won/lost deals)
router.post('/archived', (req, res) => {
  try {
    const data = {
      original_deal_id: req.body.original_deal_id || null,
      deal_name: req.body.deal_name,
      contact_name: req.body.contact_name || null,
      partner_name: req.body.partner_name || null,
      platform_name: req.body.platform_name || null,
      product_name: req.body.product_name || null,
      deal_stage_name: req.body.deal_stage_name || null,
      status: req.body.status,
      open_date: req.body.open_date || null,
      close_month: req.body.close_month || null,
      close_year: req.body.close_year || null,
      deal_value: req.body.deal_value || null,
      notes: req.body.notes || null,
      archived_for_month: req.body.archived_for_month,
      archived_for_year: req.body.archived_for_year
    };

    const result = queries.createArchivedDeal(data);
    res.status(201).json({ id: result.lastInsertRowid, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update archived deal
router.put('/archived/:id', (req, res) => {
  try {
    const existing = queries.getArchivedDealById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Archived deal not found' });
    }

    const data = {
      id: parseInt(req.params.id),
      deal_name: req.body.deal_name ?? existing.deal_name,
      contact_name: req.body.contact_name ?? existing.contact_name,
      partner_name: req.body.partner_name ?? existing.partner_name,
      platform_name: req.body.platform_name ?? existing.platform_name,
      product_name: req.body.product_name ?? existing.product_name,
      deal_stage_name: req.body.deal_stage_name ?? existing.deal_stage_name,
      status: req.body.status ?? existing.status,
      open_date: req.body.open_date ?? existing.open_date,
      close_month: req.body.close_month ?? existing.close_month,
      close_year: req.body.close_year ?? existing.close_year,
      deal_value: req.body.deal_value ?? existing.deal_value,
      notes: req.body.notes ?? existing.notes
    };

    queries.updateArchivedDeal(data);
    const updated = queries.getArchivedDealById(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete archived deal
router.delete('/archived/:id', (req, res) => {
  try {
    const existing = queries.getArchivedDealById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Archived deal not found' });
    }
    queries.deleteArchivedDeal(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore archived deal back to active pipeline
router.post('/archived/:id/restore', (req, res) => {
  try {
    const archived = queries.getArchivedDealById(req.params.id);
    if (!archived) {
      return res.status(404).json({ error: 'Archived deal not found' });
    }

    // Create new active deal with status 'active'
    const dealData = {
      deal_name: archived.deal_name,
      contact_name: archived.contact_name,
      partner_id: null, // Names don't map back to IDs easily
      platform_id: null,
      product_id: null,
      deal_stage_id: null,
      status: 'active',
      open_date: archived.open_date,
      close_month: archived.close_month,
      close_year: archived.close_year,
      deal_value: archived.deal_value,
      notes: archived.notes,
      next_step_date: null
    };

    const result = queries.createDeal(dealData);
    const newDeal = queries.getDealById(result.lastInsertRowid);

    // Delete from archived
    queries.deleteArchivedDeal(req.params.id);

    res.json(newDeal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ CLOSE MONTH ============

// Get close month status
router.get('/close-month/status', (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Calculate prior month
    let priorMonth = currentMonth - 1;
    let priorYear = currentYear;
    if (priorMonth === 0) {
      priorMonth = 12;
      priorYear = currentYear - 1;
    }

    // Check if prior month is closed
    const priorMonthClosed = queries.isMonthClosed(priorMonth, priorYear);

    // Calculate days until end of current month
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysRemaining = lastDayOfMonth - now.getDate();

    // Should flash if < 5 days remaining and prior month not closed
    const shouldFlash = daysRemaining < 5 && !priorMonthClosed;

    res.json({
      currentMonth,
      currentYear,
      priorMonth,
      priorYear,
      priorMonthClosed,
      daysRemaining,
      shouldFlash
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update prior month snapshot (recalculate from current pipeline)
router.post('/update-prior-month', (req, res) => {
  try {
    // Calculate prior month
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let priorMonth = currentMonth - 1;
    let priorYear = currentYear;
    if (priorMonth === 0) {
      priorMonth = 12;
      priorYear = currentYear - 1;
    }

    // Check if snapshot exists for prior month
    const existingSnapshot = queries.getSnapshotByMonth(priorMonth, priorYear);
    if (!existingSnapshot) {
      return res.status(400).json({
        error: `No snapshot exists for ${priorMonth}/${priorYear}. Use Close Month first.`
      });
    }

    // Delete existing breakdowns for this snapshot
    queries.deleteSnapshotBreakdowns(existingSnapshot.id);

    // Get active deals for forecast calculation (excluding won/lost)
    const activeDeals = queries.getActiveDealsForForecast();

    // Calculate weighted forecast totals
    let totalWeightedForecast = 0;
    const productBreakdown = {};
    const partnerBreakdown = {};

    activeDeals.forEach(deal => {
      const value = deal.deal_value || 0;
      const probability = (deal.deal_stage_probability || 0) / 100;
      const weightedValue = value * probability;
      totalWeightedForecast += weightedValue;

      // Product breakdown
      const productName = deal.product_name || 'Unassigned';
      if (!productBreakdown[productName]) {
        productBreakdown[productName] = { count: 0, value: 0 };
      }
      productBreakdown[productName].count++;
      productBreakdown[productName].value += weightedValue;

      // Partner breakdown
      const partnerName = deal.partner_name || 'Unassigned';
      if (!partnerBreakdown[partnerName]) {
        partnerBreakdown[partnerName] = { count: 0, value: 0 };
      }
      partnerBreakdown[partnerName].count++;
      partnerBreakdown[partnerName].value += weightedValue;
    });

    // Update snapshot totals
    queries.updateSnapshot(existingSnapshot.id, totalWeightedForecast, activeDeals.length);

    // Create new breakdowns
    Object.entries(productBreakdown).forEach(([name, data]) => {
      queries.createSnapshotBreakdown(existingSnapshot.id, 'product', name, data.count, data.value);
    });

    Object.entries(partnerBreakdown).forEach(([name, data]) => {
      queries.createSnapshotBreakdown(existingSnapshot.id, 'partner', name, data.count, data.value);
    });

    res.json({
      success: true,
      updatedMonth: priorMonth,
      updatedYear: priorYear,
      totalWeightedForecast,
      dealCount: activeDeals.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Close prior month
router.post('/close-month', (req, res) => {
  try {
    const closedBy = req.body.closedBy || 'manual';

    // Calculate prior month
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let priorMonth = currentMonth - 1;
    let priorYear = currentYear;
    if (priorMonth === 0) {
      priorMonth = 12;
      priorYear = currentYear - 1;
    }

    // Check if already closed - if so, we'll update the existing snapshot
    const alreadyClosed = queries.isMonthClosed(priorMonth, priorYear);
    const existingSnapshot = queries.getSnapshotByMonth(priorMonth, priorYear);

    // Get active deals for snapshot (excluding won/lost)
    const activeDeals = queries.getActiveDealsForForecast();

    // Calculate weighted forecast totals
    let totalWeightedForecast = 0;
    const productBreakdown = {};
    const partnerBreakdown = {};

    activeDeals.forEach(deal => {
      const value = deal.deal_value || 0;
      const probability = (deal.deal_stage_probability || 0) / 100;
      const weightedValue = value * probability;
      totalWeightedForecast += weightedValue;

      // Product breakdown
      const productName = deal.product_name || 'Unassigned';
      if (!productBreakdown[productName]) {
        productBreakdown[productName] = { count: 0, value: 0 };
      }
      productBreakdown[productName].count++;
      productBreakdown[productName].value += weightedValue;

      // Partner breakdown
      const partnerName = deal.partner_name || 'Unassigned';
      if (!partnerBreakdown[partnerName]) {
        partnerBreakdown[partnerName] = { count: 0, value: 0 };
      }
      partnerBreakdown[partnerName].count++;
      partnerBreakdown[partnerName].value += weightedValue;
    });

    // Create or update snapshot
    let snapshotId;
    if (existingSnapshot) {
      // Update existing snapshot
      queries.deleteSnapshotBreakdowns(existingSnapshot.id);
      queries.updateSnapshot(existingSnapshot.id, totalWeightedForecast, activeDeals.length);
      snapshotId = existingSnapshot.id;
    } else {
      // Create new snapshot
      const snapshotResult = queries.createSnapshot(
        priorMonth,
        priorYear,
        totalWeightedForecast,
        activeDeals.length
      );
      snapshotId = snapshotResult.lastInsertRowid;
    }

    // Create breakdowns
    Object.entries(productBreakdown).forEach(([name, data]) => {
      queries.createSnapshotBreakdown(snapshotId, 'product', name, data.count, data.value);
    });

    Object.entries(partnerBreakdown).forEach(([name, data]) => {
      queries.createSnapshotBreakdown(snapshotId, 'partner', name, data.count, data.value);
    });

    // Archive won/lost deals
    const wonLostDeals = queries.getWonLostDeals();
    let archivedCount = 0;

    wonLostDeals.forEach(deal => {
      queries.createArchivedDeal({
        original_deal_id: deal.id,
        deal_name: deal.deal_name,
        contact_name: deal.contact_name,
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

      // Delete from active deals
      queries.deleteDeal(deal.id);
      archivedCount++;
    });

    // Log the close (only if not already logged)
    if (!alreadyClosed) {
      queries.logClosedMonth(priorMonth, priorYear, closedBy);
    }

    res.json({
      success: true,
      closedMonth: priorMonth,
      closedYear: priorYear,
      snapshotId,
      totalWeightedForecast,
      dealCount: activeDeals.length,
      archivedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
