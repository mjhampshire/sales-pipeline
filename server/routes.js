const express = require('express');
const { queries } = require('./db');

const router = express.Router();

// ============ DEALS ============

// Get all deals
router.get('/deals', async (req, res) => {
  try {
    const { sort = 'id', order = 'asc' } = req.query;
    const deals = await queries.getAllDeals(sort, order);
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create deal
router.post('/deals', async (req, res) => {
  try {
    const data = {
      deal_name: req.body.deal_name || 'New Deal',
      contact_name: req.body.contact_name || null,
      source_id: req.body.source_id || null,
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
      next_step_date: req.body.next_step_date || null,
      is_priority: req.body.is_priority || 0,
      row_color: req.body.row_color || null
    };
    const result = await queries.createDeal(data);
    const deal = await queries.getDealById(result.lastInsertRowid);
    res.status(201).json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update deal
router.put('/deals/:id', async (req, res) => {
  try {
    const existing = await queries.getDealById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Helper to get value from body or fall back to existing
    // Uses 'in' operator to allow explicit null values
    const getValue = (key) => key in req.body ? req.body[key] : existing[key];

    const data = {
      id: parseInt(req.params.id),
      deal_name: getValue('deal_name'),
      contact_name: getValue('contact_name'),
      source_id: getValue('source_id'),
      partner_id: getValue('partner_id'),
      platform_id: getValue('platform_id'),
      product_id: getValue('product_id'),
      deal_stage_id: getValue('deal_stage_id'),
      status: getValue('status'),
      open_date: getValue('open_date'),
      close_month: getValue('close_month'),
      close_year: getValue('close_year'),
      deal_value: getValue('deal_value'),
      notes: getValue('notes'),
      next_step_date: getValue('next_step_date'),
      is_priority: getValue('is_priority'),
      row_color: getValue('row_color')
    };

    // Validation: Deals at 40%+ probability must have close date and deal value
    if (data.deal_stage_id) {
      const stage = await queries.getStageById(data.deal_stage_id);
      if (stage && stage.probability >= 40) {
        const hasCloseDate = data.close_month && data.close_year;
        const hasDealValue = data.deal_value != null && data.deal_value !== '';

        if (!hasCloseDate || !hasDealValue) {
          const missing = [];
          if (!hasCloseDate) missing.push('close date');
          if (!hasDealValue) missing.push('deal value');
          return res.status(400).json({
            error: `Deals at 40% or above must have a ${missing.join(' and ')}`,
            validationError: true,
            missingFields: missing
          });
        }
      }
    }

    await queries.updateDeal(data);
    const deal = await queries.getDealById(req.params.id);
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete deal
router.delete('/deals/:id', async (req, res) => {
  try {
    // Check if deal exists first
    const existing = await queries.getDealById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    await queries.deleteDeal(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ DEAL NOTES ============

// Get all notes for a deal
router.get('/deals/:id/notes', async (req, res) => {
  try {
    const notes = await queries.getNotesByDealId(req.params.id);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new note for a deal
router.post('/deals/:id/notes', async (req, res) => {
  try {
    const { note_text, note_date } = req.body;
    if (!note_text || !note_text.trim()) {
      return res.status(400).json({ error: 'Note text is required' });
    }
    const note = await queries.createNote(req.params.id, note_text.trim(), note_date);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a note
router.put('/notes/:id', async (req, res) => {
  try {
    const { note_text, note_date } = req.body;
    if (!note_text || !note_text.trim()) {
      return res.status(400).json({ error: 'Note text is required' });
    }
    if (!note_date) {
      return res.status(400).json({ error: 'Note date is required' });
    }
    const note = await queries.updateNote(req.params.id, note_text.trim(), note_date);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a note
router.delete('/notes/:id', async (req, res) => {
  try {
    await queries.deleteNote(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ DEAL STAGES ============

// Get all stages
router.get('/stages', async (req, res) => {
  try {
    const stages = await queries.getAllStages();
    res.json(stages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create stage
router.post('/stages', async (req, res) => {
  try {
    const { name, probability = 0, sort_order = 0 } = req.body;
    const result = await queries.createStage(name, probability, sort_order);
    res.status(201).json({ id: result.lastInsertRowid, name, probability, sort_order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update stage
router.put('/stages/:id', async (req, res) => {
  try {
    const { name, probability, sort_order } = req.body;
    await queries.updateStage(name, probability, sort_order, req.params.id);
    res.json({ id: parseInt(req.params.id), name, probability, sort_order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete stage
router.delete('/stages/:id', async (req, res) => {
  try {
    await queries.deleteStage(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ LIST ITEMS ============

// Get list items by type
router.get('/lists/:type', async (req, res) => {
  try {
    const validTypes = ['partner', 'platform', 'product', 'source'];
    if (!validTypes.includes(req.params.type)) {
      return res.status(400).json({ error: 'Invalid list type' });
    }
    const items = await queries.getListItems(req.params.type);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create list item
router.post('/lists/:type', async (req, res) => {
  try {
    const validTypes = ['partner', 'platform', 'product', 'source'];
    if (!validTypes.includes(req.params.type)) {
      return res.status(400).json({ error: 'Invalid list type' });
    }
    const { value, sort_order = 0 } = req.body;
    const result = await queries.createListItem(req.params.type, value, sort_order);
    res.status(201).json({ id: result.lastInsertRowid, list_type: req.params.type, value, sort_order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update list item
router.put('/lists/:type/:id', async (req, res) => {
  try {
    const { value, sort_order } = req.body;
    await queries.updateListItem(value, sort_order, req.params.id);
    res.json({ id: parseInt(req.params.id), list_type: req.params.type, value, sort_order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete list item
router.delete('/lists/:type/:id', async (req, res) => {
  try {
    await queries.deleteListItem(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ MONTHLY SNAPSHOTS ============

// Get all monthly snapshots with breakdowns
router.get('/snapshots', async (req, res) => {
  try {
    const snapshots = await queries.getAllSnapshots();
    // Attach breakdowns to each snapshot
    const snapshotsWithBreakdowns = await Promise.all(snapshots.map(async snapshot => ({
      ...snapshot,
      breakdowns: await queries.getSnapshotBreakdowns(snapshot.id)
    })));
    res.json(snapshotsWithBreakdowns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ARCHIVED DEALS ============

// Get archived won deals
router.get('/archived/won', async (req, res) => {
  try {
    const deals = await queries.getArchivedDeals('won');
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get archived lost deals
router.get('/archived/lost', async (req, res) => {
  try {
    const deals = await queries.getArchivedDeals('lost');
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Directly archive a deal (for CSV import of old won/lost deals)
router.post('/archived', async (req, res) => {
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

    const result = await queries.createArchivedDeal(data);
    res.status(201).json({ id: result.lastInsertRowid, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update archived deal
router.put('/archived/:id', async (req, res) => {
  try {
    const existing = await queries.getArchivedDealById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Archived deal not found' });
    }

    const data = {
      id: parseInt(req.params.id),
      deal_name: req.body.deal_name ?? existing.deal_name,
      contact_name: req.body.contact_name ?? existing.contact_name,
      source_name: req.body.source_name ?? existing.source_name,
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

    await queries.updateArchivedDeal(data);
    const updated = await queries.getArchivedDealById(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete archived deal
router.delete('/archived/:id', async (req, res) => {
  try {
    const existing = await queries.getArchivedDealById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Archived deal not found' });
    }
    await queries.deleteArchivedDeal(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore archived deal back to active pipeline
router.post('/archived/:id/restore', async (req, res) => {
  try {
    const archived = await queries.getArchivedDealById(req.params.id);
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

    const result = await queries.createDeal(dealData);
    const newDeal = await queries.getDealById(result.lastInsertRowid);

    // Delete from archived
    await queries.deleteArchivedDeal(req.params.id);

    res.json(newDeal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ CLOSE MONTH ============

// Get close month status
router.get('/close-month/status', async (req, res) => {
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
    const priorMonthClosed = await queries.isMonthClosed(priorMonth, priorYear);

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
router.post('/update-prior-month', async (req, res) => {
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
    const existingSnapshot = await queries.getSnapshotByMonth(priorMonth, priorYear);
    if (!existingSnapshot) {
      return res.status(400).json({
        error: `No snapshot exists for ${priorMonth}/${priorYear}. Use Close Month first.`
      });
    }

    // Delete existing breakdowns for this snapshot
    await queries.deleteSnapshotBreakdowns(existingSnapshot.id);

    // Get active deals for forecast calculation (excluding won/lost)
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
    await queries.updateSnapshot(existingSnapshot.id, totalWeightedForecast, activeDeals.length);

    // Create new breakdowns
    for (const [name, data] of Object.entries(productBreakdown)) {
      await queries.createSnapshotBreakdown(existingSnapshot.id, 'product', name, data.count, data.value);
    }

    for (const [name, data] of Object.entries(partnerBreakdown)) {
      await queries.createSnapshotBreakdown(existingSnapshot.id, 'partner', name, data.count, data.value);
    }

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
router.post('/close-month', async (req, res) => {
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
    const alreadyClosed = await queries.isMonthClosed(priorMonth, priorYear);
    const existingSnapshot = await queries.getSnapshotByMonth(priorMonth, priorYear);

    // Get active deals for snapshot (excluding won/lost)
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
      await queries.deleteSnapshotBreakdowns(existingSnapshot.id);
      await queries.updateSnapshot(existingSnapshot.id, totalWeightedForecast, activeDeals.length);
      snapshotId = existingSnapshot.id;
    } else {
      // Create new snapshot
      const snapshotResult = await queries.createSnapshot(
        priorMonth,
        priorYear,
        totalWeightedForecast,
        activeDeals.length
      );
      snapshotId = snapshotResult.lastInsertRowid;
    }

    // Create breakdowns
    for (const [name, data] of Object.entries(productBreakdown)) {
      await queries.createSnapshotBreakdown(snapshotId, 'product', name, data.count, data.value);
    }

    for (const [name, data] of Object.entries(partnerBreakdown)) {
      await queries.createSnapshotBreakdown(snapshotId, 'partner', name, data.count, data.value);
    }

    // Archive won/lost deals
    const wonLostDeals = await queries.getWonLostDeals();
    let archivedCount = 0;

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

      // Delete from active deals
      await queries.deleteDeal(deal.id);
      archivedCount++;
    }

    // Log the close (only if not already logged)
    if (!alreadyClosed) {
      await queries.logClosedMonth(priorMonth, priorYear, closedBy);
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

// ============ LEADS ============

// Get all leads
router.get('/leads', async (req, res) => {
  try {
    const leads = await queries.getAllLeads();
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create lead (webhook endpoint for website form or manual entry)
router.post('/leads', async (req, res) => {
  try {
    const data = {
      firstname: req.body.firstname || req.body.firstName || null,
      lastname: req.body.lastname || req.body.lastName || null,
      email: req.body.email || null,
      mobile: req.body.mobile || req.body.phone || null,
      company: req.body.company || null,
      message: req.body.message || null,
      source: req.body.source || null,
      received_date: req.body.received_date || new Date().toISOString().split('T')[0]
    };

    const result = await queries.createLead(data);
    const lead = await queries.getLeadById(result.lastInsertRowid);
    res.status(201).json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update lead status (not_converted, new, etc.)
router.put('/leads/:id/status', async (req, res) => {
  try {
    const lead = await queries.getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const status = req.body.status;
    if (!['new', 'not_converted', 'converted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await queries.updateLeadStatus(req.params.id, status, lead.converted_deal_id);
    const updated = await queries.getLeadById(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete lead
router.delete('/leads/:id', async (req, res) => {
  try {
    const existing = await queries.getLeadById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    await queries.deleteLead(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if deal name exists
router.get('/deals/check-name', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Name parameter required' });
    }
    const deals = await queries.getAllDeals();
    const exists = deals.some(d => d.deal_name.toLowerCase().trim() === name.toLowerCase().trim());
    res.json({ exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Convert lead to deal
router.post('/leads/:id/convert', async (req, res) => {
  try {
    const lead = await queries.getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (lead.status === 'converted') {
      return res.status(400).json({ error: 'Lead already converted' });
    }

    // Use provided deal_name or default to company
    const dealName = req.body.deal_name || lead.company || 'New Deal';
    const contactName = [lead.firstname, lead.lastname].filter(Boolean).join(' ') || null;

    const dealData = {
      deal_name: dealName,
      contact_name: contactName,
      partner_id: null,
      platform_id: null,
      product_id: null,
      deal_stage_id: null,
      status: 'active',
      open_date: lead.received_date,
      close_month: null,
      close_year: null,
      deal_value: null,
      notes: lead.message || null,
      next_step_date: null
    };

    const result = await queries.createDeal(dealData);
    const deal = await queries.getDealById(result.lastInsertRowid);

    // Update lead status
    await queries.updateLeadStatus(req.params.id, 'converted', deal.id);

    res.json({ lead: await queries.getLeadById(req.params.id), deal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
