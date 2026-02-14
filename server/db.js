const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'pipeline.db');
let db = null;

async function initDb() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS deal_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      probability INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_type TEXT NOT NULL,
      value TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deal_name TEXT NOT NULL,
      contact_name TEXT,
      source_id INTEGER REFERENCES list_items(id) ON DELETE SET NULL,
      partner_id INTEGER REFERENCES list_items(id) ON DELETE SET NULL,
      platform_id INTEGER REFERENCES list_items(id) ON DELETE SET NULL,
      product_id INTEGER REFERENCES list_items(id) ON DELETE SET NULL,
      deal_stage_id INTEGER REFERENCES deal_stages(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'active',
      open_date DATE DEFAULT (date('now')),
      close_month INTEGER,
      close_year INTEGER,
      deal_value DECIMAL,
      notes TEXT,
      next_step_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add source_id column if it doesn't exist (migration for existing databases)
  try {
    db.run('ALTER TABLE deals ADD COLUMN source_id INTEGER REFERENCES list_items(id) ON DELETE SET NULL');
  } catch (e) {
    // Column already exists, ignore
  }

  // Add is_priority column if it doesn't exist (migration for existing databases)
  try {
    db.run('ALTER TABLE deals ADD COLUMN is_priority INTEGER DEFAULT 0');
  } catch (e) {
    // Column already exists, ignore
  }

  // Add row_color column if it doesn't exist (migration for existing databases)
  try {
    db.run('ALTER TABLE deals ADD COLUMN row_color TEXT');
  } catch (e) {
    // Column already exists, ignore
  }

  // Monthly snapshot summary
  db.run(`
    CREATE TABLE IF NOT EXISTS monthly_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_month INTEGER NOT NULL,
      snapshot_year INTEGER NOT NULL,
      total_weighted_forecast DECIMAL DEFAULT 0,
      total_deal_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(snapshot_month, snapshot_year)
    )
  `);

  // Breakdowns by product/partner
  db.run(`
    CREATE TABLE IF NOT EXISTS monthly_snapshot_breakdowns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER REFERENCES monthly_snapshots(id) ON DELETE CASCADE,
      breakdown_type TEXT NOT NULL,
      breakdown_name TEXT NOT NULL,
      deal_count INTEGER DEFAULT 0,
      forecast_value DECIMAL DEFAULT 0
    )
  `);

  // Archived won/lost deals
  db.run(`
    CREATE TABLE IF NOT EXISTS archived_deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_deal_id INTEGER,
      deal_name TEXT NOT NULL,
      contact_name TEXT,
      source_name TEXT,
      partner_name TEXT,
      platform_name TEXT,
      product_name TEXT,
      deal_stage_name TEXT,
      status TEXT NOT NULL,
      open_date DATE,
      close_month INTEGER,
      close_year INTEGER,
      deal_value DECIMAL,
      notes TEXT,
      archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      archived_for_month INTEGER NOT NULL,
      archived_for_year INTEGER NOT NULL
    )
  `);

  // Add source_name column if it doesn't exist (migration for existing databases)
  try {
    db.run('ALTER TABLE archived_deals ADD COLUMN source_name TEXT');
  } catch (e) {
    // Column already exists, ignore
  }

  // Leads from website
  db.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstname TEXT,
      lastname TEXT,
      email TEXT,
      mobile TEXT,
      company TEXT,
      message TEXT,
      source TEXT,
      received_date DATE DEFAULT (date('now')),
      status TEXT DEFAULT 'new',
      converted_deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add source column if it doesn't exist (migration for existing databases)
  try {
    db.run('ALTER TABLE leads ADD COLUMN source TEXT');
  } catch (e) {
    // Column already exists, ignore
  }

  // Track closed months
  db.run(`
    CREATE TABLE IF NOT EXISTS close_month_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      closed_month INTEGER NOT NULL,
      closed_year INTEGER NOT NULL,
      closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      closed_by TEXT DEFAULT 'manual',
      UNIQUE(closed_month, closed_year)
    )
  `);

  // Users table for authentication
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      must_change_password INTEGER DEFAULT 0,
      is_disabled INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP
    )
  `);

  seedIfEmpty();
  saveDb();

  return db;
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function seedIfEmpty() {
  const stageResult = db.exec('SELECT COUNT(*) as count FROM deal_stages');
  const stageCount = stageResult[0]?.values[0][0] || 0;
  if (stageCount === 0) {
    const stages = [
      ['Prospect', 10, 1],
      ['Qualified', 25, 2],
      ['Proposal', 50, 3],
      ['Negotiation', 75, 4],
      ['Closed Won', 100, 5]
    ];
    const stmt = db.prepare('INSERT INTO deal_stages (name, probability, sort_order) VALUES (?, ?, ?)');
    stages.forEach(([name, prob, order]) => {
      stmt.run([name, prob, order]);
    });
    stmt.free();
  }

  const listResult = db.exec('SELECT COUNT(*) as count FROM list_items');
  const listCount = listResult[0]?.values[0][0] || 0;
  if (listCount === 0) {
    const items = [
      ['partner', 'Partner A', 1],
      ['partner', 'Partner B', 2],
      ['partner', 'Direct', 3],
      ['platform', 'Web', 1],
      ['platform', 'Mobile', 2],
      ['platform', 'Desktop', 3],
      ['product', 'Product X', 1],
      ['product', 'Product Y', 2],
      ['product', 'Service Z', 3]
    ];
    const stmt = db.prepare('INSERT INTO list_items (list_type, value, sort_order) VALUES (?, ?, ?)');
    items.forEach(([type, value, order]) => {
      stmt.run([type, value, order]);
    });
    stmt.free();
  }
}

// Helper to convert sql.js results to array of objects using prepared statements
function queryAll(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row);
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('Query error:', err, sql, params);
    return [];
  }
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || null;
}

function run(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    stmt.step();
    stmt.free();

    // Get last insert rowid
    const lastIdResult = db.exec('SELECT last_insert_rowid() as id');
    const lastInsertRowid = lastIdResult[0]?.values[0][0] || 0;

    saveDb();
    return { lastInsertRowid, changes: db.getRowsModified() };
  } catch (err) {
    console.error('Run error:', err, sql, params);
    throw err;
  }
}

// Query functions
const queries = {
  getAllDeals: (sort = 'id', order = 'asc') => {
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

    // Map sort keys to SQL ORDER BY clauses
    let orderByClause;
    switch (sort) {
      case 'close_date':
        // Sort by year first, then month
        orderByClause = `d.close_year ${sortOrder}, d.close_month ${sortOrder}`;
        break;
      case 'stage':
        // Sort by stage probability
        orderByClause = `ds.probability ${sortOrder}`;
        break;
      case 'platform':
        // Sort alphabetically by platform name
        orderByClause = `pl.value ${sortOrder}`;
        break;
      case 'product':
        // Sort alphabetically by product name
        orderByClause = `pr.value ${sortOrder}`;
        break;
      case 'partner':
        // Sort alphabetically by partner name
        orderByClause = `p.value ${sortOrder}`;
        break;
      case 'priority':
        // Sort by priority flag (priority items first when desc)
        orderByClause = `d.is_priority ${sortOrder}`;
        break;
      case 'color':
        // Sort by row color (nulls last)
        orderByClause = `CASE WHEN d.row_color IS NULL THEN 1 ELSE 0 END, d.row_color ${sortOrder}`;
        break;
      default:
        // Standard columns on deals table
        const validColumns = ['id', 'deal_name', 'contact_name', 'status', 'open_date', 'deal_value', 'next_step_date', 'created_at'];
        const sortCol = validColumns.includes(sort) ? sort : 'id';
        orderByClause = `d.${sortCol} ${sortOrder}`;
    }

    return queryAll(`
      SELECT
        d.*,
        ds.name as deal_stage_name,
        ds.probability as deal_stage_probability,
        src.value as source_name,
        p.value as partner_name,
        pl.value as platform_name,
        pr.value as product_name
      FROM deals d
      LEFT JOIN deal_stages ds ON d.deal_stage_id = ds.id
      LEFT JOIN list_items src ON d.source_id = src.id
      LEFT JOIN list_items p ON d.partner_id = p.id
      LEFT JOIN list_items pl ON d.platform_id = pl.id
      LEFT JOIN list_items pr ON d.product_id = pr.id
      ORDER BY ${orderByClause}
    `);
  },

  getDealById: (id) => queryOne(`
    SELECT
      d.*,
      ds.name as deal_stage_name,
      ds.probability as deal_stage_probability,
      src.value as source_name,
      p.value as partner_name,
      pl.value as platform_name,
      pr.value as product_name
    FROM deals d
    LEFT JOIN deal_stages ds ON d.deal_stage_id = ds.id
    LEFT JOIN list_items src ON d.source_id = src.id
    LEFT JOIN list_items p ON d.partner_id = p.id
    LEFT JOIN list_items pl ON d.platform_id = pl.id
    LEFT JOIN list_items pr ON d.product_id = pr.id
    WHERE d.id = ?
  `, [id]),

  createDeal: (data) => run(`
    INSERT INTO deals (deal_name, contact_name, source_id, partner_id, platform_id, product_id, deal_stage_id, status, open_date, close_month, close_year, deal_value, notes, next_step_date, is_priority, row_color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [data.deal_name, data.contact_name, data.source_id, data.partner_id, data.platform_id, data.product_id, data.deal_stage_id, data.status, data.open_date, data.close_month, data.close_year, data.deal_value, data.notes, data.next_step_date, data.is_priority || 0, data.row_color || null]),

  updateDeal: (data) => run(`
    UPDATE deals SET
      deal_name = ?,
      contact_name = ?,
      source_id = ?,
      partner_id = ?,
      platform_id = ?,
      product_id = ?,
      deal_stage_id = ?,
      status = ?,
      open_date = ?,
      close_month = ?,
      close_year = ?,
      deal_value = ?,
      notes = ?,
      next_step_date = ?,
      is_priority = ?,
      row_color = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [data.deal_name, data.contact_name, data.source_id, data.partner_id, data.platform_id, data.product_id, data.deal_stage_id, data.status, data.open_date, data.close_month, data.close_year, data.deal_value, data.notes, data.next_step_date, data.is_priority, data.row_color, data.id]),

  deleteDeal: (id) => run('DELETE FROM deals WHERE id = ?', [id]),

  // Deal Stages
  getAllStages: () => queryAll('SELECT * FROM deal_stages ORDER BY sort_order'),
  createStage: (name, probability, sort_order) => run('INSERT INTO deal_stages (name, probability, sort_order) VALUES (?, ?, ?)', [name, probability, sort_order]),
  updateStage: (name, probability, sort_order, id) => run('UPDATE deal_stages SET name = ?, probability = ?, sort_order = ? WHERE id = ?', [name, probability, sort_order, id]),
  deleteStage: (id) => run('DELETE FROM deal_stages WHERE id = ?', [id]),

  // List Items
  getListItems: (type) => queryAll('SELECT * FROM list_items WHERE list_type = ? ORDER BY sort_order', [type]),
  createListItem: (type, value, sort_order) => run('INSERT INTO list_items (list_type, value, sort_order) VALUES (?, ?, ?)', [type, value, sort_order]),
  updateListItem: (value, sort_order, id) => run('UPDATE list_items SET value = ?, sort_order = ? WHERE id = ?', [value, sort_order, id]),
  deleteListItem: (id) => run('DELETE FROM list_items WHERE id = ?', [id]),

  // Monthly Snapshots
  getAllSnapshots: () => queryAll(`
    SELECT * FROM monthly_snapshots
    ORDER BY snapshot_year DESC, snapshot_month DESC
  `),

  getSnapshotBreakdowns: (snapshotId) => queryAll(`
    SELECT * FROM monthly_snapshot_breakdowns
    WHERE snapshot_id = ?
    ORDER BY breakdown_type, forecast_value DESC
  `, [snapshotId]),

  createSnapshot: (month, year, totalForecast, dealCount) => run(`
    INSERT INTO monthly_snapshots (snapshot_month, snapshot_year, total_weighted_forecast, total_deal_count)
    VALUES (?, ?, ?, ?)
  `, [month, year, totalForecast, dealCount]),

  getSnapshotByMonth: (month, year) => queryOne(`
    SELECT * FROM monthly_snapshots
    WHERE snapshot_month = ? AND snapshot_year = ?
  `, [month, year]),

  updateSnapshot: (id, totalForecast, dealCount) => run(`
    UPDATE monthly_snapshots
    SET total_weighted_forecast = ?, total_deal_count = ?
    WHERE id = ?
  `, [totalForecast, dealCount, id]),

  deleteSnapshotBreakdowns: (snapshotId) => run(`
    DELETE FROM monthly_snapshot_breakdowns WHERE snapshot_id = ?
  `, [snapshotId]),

  createSnapshotBreakdown: (snapshotId, type, name, dealCount, forecastValue) => run(`
    INSERT INTO monthly_snapshot_breakdowns (snapshot_id, breakdown_type, breakdown_name, deal_count, forecast_value)
    VALUES (?, ?, ?, ?, ?)
  `, [snapshotId, type, name, dealCount, forecastValue]),

  // Archived Deals
  getArchivedDeals: (status) => queryAll(`
    SELECT * FROM archived_deals
    WHERE status = ?
    ORDER BY archived_for_year DESC, archived_for_month DESC, archived_at DESC
  `, [status]),

  getArchivedDealById: (id) => queryOne(`
    SELECT * FROM archived_deals WHERE id = ?
  `, [id]),

  updateArchivedDeal: (data) => run(`
    UPDATE archived_deals SET
      deal_name = ?,
      contact_name = ?,
      source_name = ?,
      partner_name = ?,
      platform_name = ?,
      product_name = ?,
      deal_stage_name = ?,
      status = ?,
      open_date = ?,
      close_month = ?,
      close_year = ?,
      deal_value = ?,
      notes = ?
    WHERE id = ?
  `, [data.deal_name, data.contact_name, data.source_name, data.partner_name, data.platform_name,
      data.product_name, data.deal_stage_name, data.status, data.open_date,
      data.close_month, data.close_year, data.deal_value, data.notes, data.id]),

  deleteArchivedDeal: (id) => run('DELETE FROM archived_deals WHERE id = ?', [id]),

  createArchivedDeal: (data) => run(`
    INSERT INTO archived_deals (
      original_deal_id, deal_name, contact_name, source_name, partner_name, platform_name,
      product_name, deal_stage_name, status, open_date, close_month, close_year,
      deal_value, notes, archived_for_month, archived_for_year
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.original_deal_id, data.deal_name, data.contact_name, data.source_name, data.partner_name,
    data.platform_name, data.product_name, data.deal_stage_name, data.status,
    data.open_date, data.close_month, data.close_year, data.deal_value,
    data.notes, data.archived_for_month, data.archived_for_year
  ]),

  // Close Month Log
  isMonthClosed: (month, year) => {
    const result = queryOne(`
      SELECT id FROM close_month_log
      WHERE closed_month = ? AND closed_year = ?
    `, [month, year]);
    return result !== null;
  },

  logClosedMonth: (month, year, closedBy = 'manual') => run(`
    INSERT INTO close_month_log (closed_month, closed_year, closed_by)
    VALUES (?, ?, ?)
  `, [month, year, closedBy]),

  getClosedMonths: () => queryAll(`
    SELECT * FROM close_month_log
    ORDER BY closed_year DESC, closed_month DESC
  `),

  // Get active deals with status won or lost
  getWonLostDeals: () => queryAll(`
    SELECT
      d.*,
      ds.name as deal_stage_name,
      ds.probability as deal_stage_probability,
      src.value as source_name,
      p.value as partner_name,
      pl.value as platform_name,
      pr.value as product_name
    FROM deals d
    LEFT JOIN deal_stages ds ON d.deal_stage_id = ds.id
    LEFT JOIN list_items src ON d.source_id = src.id
    LEFT JOIN list_items p ON d.partner_id = p.id
    LEFT JOIN list_items pl ON d.platform_id = pl.id
    LEFT JOIN list_items pr ON d.product_id = pr.id
    WHERE d.status IN ('won', 'lost')
  `),

  // Leads
  getAllLeads: () => queryAll(`
    SELECT * FROM leads ORDER BY
      CASE WHEN status = 'new' THEN 0 ELSE 1 END,
      received_date DESC, created_at DESC
  `),

  getLeadById: (id) => queryOne('SELECT * FROM leads WHERE id = ?', [id]),

  createLead: (data) => run(`
    INSERT INTO leads (firstname, lastname, email, mobile, company, message, source, received_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [data.firstname, data.lastname, data.email, data.mobile, data.company, data.message,
      data.source, data.received_date || new Date().toISOString().split('T')[0]]),

  deleteLead: (id) => run('DELETE FROM leads WHERE id = ?', [id]),

  updateLeadStatus: (id, status, convertedDealId = null) => run(`
    UPDATE leads SET status = ?, converted_deal_id = ? WHERE id = ?
  `, [status, convertedDealId, id]),

  // Get active deals for forecast calculation (excluding won/lost)
  getActiveDealsForForecast: () => queryAll(`
    SELECT
      d.*,
      ds.name as deal_stage_name,
      ds.probability as deal_stage_probability,
      src.value as source_name,
      p.value as partner_name,
      pl.value as platform_name,
      pr.value as product_name
    FROM deals d
    LEFT JOIN deal_stages ds ON d.deal_stage_id = ds.id
    LEFT JOIN list_items src ON d.source_id = src.id
    LEFT JOIN list_items p ON d.partner_id = p.id
    LEFT JOIN list_items pl ON d.platform_id = pl.id
    LEFT JOIN list_items pr ON d.product_id = pr.id
    WHERE d.status NOT IN ('won', 'lost')
  `),

  // User Management
  getUserByEmail: (email) => queryOne('SELECT * FROM users WHERE email = ?', [email]),

  getUserById: (id) => queryOne('SELECT id, email, role, must_change_password, is_disabled, created_at, last_login_at FROM users WHERE id = ?', [id]),

  getAllUsers: () => queryAll('SELECT id, email, role, must_change_password, is_disabled, created_at, last_login_at FROM users ORDER BY created_at DESC'),

  getUserCount: () => {
    const result = queryOne('SELECT COUNT(*) as count FROM users');
    return result ? result.count : 0;
  },

  getAdminCount: () => {
    const result = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_disabled = 0");
    return result ? result.count : 0;
  },

  createUser: (email, passwordHash, role = 'user', mustChangePassword = 0) => run(
    'INSERT INTO users (email, password_hash, role, must_change_password) VALUES (?, ?, ?, ?)',
    [email, passwordHash, role, mustChangePassword]
  ),

  updateUserPassword: (id, passwordHash, mustChangePassword = 0) => run(
    'UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?',
    [passwordHash, mustChangePassword, id]
  ),

  updateUserLastLogin: (id) => run(
    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  ),

  disableUser: (id) => run('UPDATE users SET is_disabled = 1 WHERE id = ?', [id]),

  enableUser: (id) => run('UPDATE users SET is_disabled = 0 WHERE id = ?', [id]),

  deleteUser: (id) => run('DELETE FROM users WHERE id = ?', [id])
};

module.exports = { initDb, queries };
