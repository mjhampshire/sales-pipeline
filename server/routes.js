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

module.exports = router;
