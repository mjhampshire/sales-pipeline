const { Pool } = require('pg');

// Use DATABASE_URL from environment (Railway provides this)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDb() {
  const client = await pool.connect();

  try {
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_stages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        probability INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS list_items (
        id SERIAL PRIMARY KEY,
        list_type TEXT NOT NULL,
        value TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS deals (
        id SERIAL PRIMARY KEY,
        deal_name TEXT NOT NULL,
        contact_name TEXT,
        source_id INTEGER REFERENCES list_items(id) ON DELETE SET NULL,
        partner_id INTEGER REFERENCES list_items(id) ON DELETE SET NULL,
        platform_id INTEGER REFERENCES list_items(id) ON DELETE SET NULL,
        product_id INTEGER REFERENCES list_items(id) ON DELETE SET NULL,
        deal_stage_id INTEGER REFERENCES deal_stages(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'active',
        open_date DATE DEFAULT CURRENT_DATE,
        close_month INTEGER,
        close_year INTEGER,
        deal_value DECIMAL,
        notes TEXT,
        next_step_date DATE,
        is_priority INTEGER DEFAULT 0,
        row_color TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_month INTEGER NOT NULL,
        snapshot_year INTEGER NOT NULL,
        total_weighted_forecast DECIMAL DEFAULT 0,
        total_deal_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(snapshot_month, snapshot_year)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_snapshot_breakdowns (
        id SERIAL PRIMARY KEY,
        snapshot_id INTEGER REFERENCES monthly_snapshots(id) ON DELETE CASCADE,
        breakdown_type TEXT NOT NULL,
        breakdown_name TEXT NOT NULL,
        deal_count INTEGER DEFAULT 0,
        forecast_value DECIMAL DEFAULT 0
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS archived_deals (
        id SERIAL PRIMARY KEY,
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        firstname TEXT,
        lastname TEXT,
        email TEXT,
        mobile TEXT,
        company TEXT,
        message TEXT,
        source TEXT,
        received_date DATE DEFAULT CURRENT_DATE,
        status TEXT DEFAULT 'new',
        converted_deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS close_month_log (
        id SERIAL PRIMARY KEY,
        closed_month INTEGER NOT NULL,
        closed_year INTEGER NOT NULL,
        closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_by TEXT DEFAULT 'manual',
        UNIQUE(closed_month, closed_year)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        must_change_password INTEGER DEFAULT 0,
        is_disabled INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_notes (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER REFERENCES deals(id) ON DELETE CASCADE,
        note_text TEXT NOT NULL,
        note_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default data if empty
    await seedIfEmpty(client);

  } finally {
    client.release();
  }

  return pool;
}

async function seedIfEmpty(client) {
  const stageResult = await client.query('SELECT COUNT(*) as count FROM deal_stages');
  const stageCount = parseInt(stageResult.rows[0].count);

  if (stageCount === 0) {
    const stages = [
      ['Prospect', 10, 1],
      ['Qualified', 25, 2],
      ['Proposal', 50, 3],
      ['Negotiation', 75, 4],
      ['Closed Won', 100, 5]
    ];
    for (const [name, prob, order] of stages) {
      await client.query(
        'INSERT INTO deal_stages (name, probability, sort_order) VALUES ($1, $2, $3)',
        [name, prob, order]
      );
    }
  }

  const listResult = await client.query('SELECT COUNT(*) as count FROM list_items');
  const listCount = parseInt(listResult.rows[0].count);

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
    for (const [type, value, order] of items) {
      await client.query(
        'INSERT INTO list_items (list_type, value, sort_order) VALUES ($1, $2, $3)',
        [type, value, order]
      );
    }
  }
}

// Query functions - all async now
const queries = {
  getAllDeals: async (sort = 'id', order = 'asc') => {
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

    let orderByClause;
    switch (sort) {
      case 'close_date':
        orderByClause = `d.close_year ${sortOrder}, d.close_month ${sortOrder}`;
        break;
      case 'stage':
        orderByClause = `ds.probability ${sortOrder}`;
        break;
      case 'platform':
        orderByClause = `pl.value ${sortOrder}`;
        break;
      case 'product':
        orderByClause = `pr.value ${sortOrder}`;
        break;
      case 'partner':
        orderByClause = `p.value ${sortOrder}`;
        break;
      case 'priority':
        orderByClause = `d.is_priority ${sortOrder}`;
        break;
      case 'color':
        orderByClause = `CASE WHEN d.row_color IS NULL THEN 1 ELSE 0 END, d.row_color ${sortOrder}`;
        break;
      default:
        const validColumns = ['id', 'deal_name', 'contact_name', 'status', 'open_date', 'deal_value', 'next_step_date', 'created_at'];
        const sortCol = validColumns.includes(sort) ? sort : 'id';
        orderByClause = `d.${sortCol} ${sortOrder}`;
    }

    const result = await pool.query(`
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
    return result.rows;
  },

  getDealById: async (id) => {
    const result = await pool.query(`
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
      WHERE d.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  createDeal: async (data) => {
    const result = await pool.query(`
      INSERT INTO deals (deal_name, contact_name, source_id, partner_id, platform_id, product_id, deal_stage_id, status, open_date, close_month, close_year, deal_value, notes, next_step_date, is_priority, row_color)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id
    `, [data.deal_name, data.contact_name, data.source_id, data.partner_id, data.platform_id, data.product_id, data.deal_stage_id, data.status, data.open_date, data.close_month, data.close_year, data.deal_value, data.notes, data.next_step_date, data.is_priority || 0, data.row_color || null]);
    return { lastInsertRowid: result.rows[0].id };
  },

  updateDeal: async (data) => {
    await pool.query(`
      UPDATE deals SET
        deal_name = $1,
        contact_name = $2,
        source_id = $3,
        partner_id = $4,
        platform_id = $5,
        product_id = $6,
        deal_stage_id = $7,
        status = $8,
        open_date = $9,
        close_month = $10,
        close_year = $11,
        deal_value = $12,
        notes = $13,
        next_step_date = $14,
        is_priority = $15,
        row_color = $16,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
    `, [data.deal_name, data.contact_name, data.source_id, data.partner_id, data.platform_id, data.product_id, data.deal_stage_id, data.status, data.open_date, data.close_month, data.close_year, data.deal_value, data.notes, data.next_step_date, data.is_priority, data.row_color, data.id]);
  },

  deleteDeal: async (id) => {
    await pool.query('DELETE FROM deals WHERE id = $1', [id]);
  },

  // Deal Stages
  getAllStages: async () => {
    const result = await pool.query('SELECT * FROM deal_stages ORDER BY sort_order');
    return result.rows;
  },

  getStageById: async (id) => {
    const result = await pool.query('SELECT * FROM deal_stages WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  createStage: async (name, probability, sort_order) => {
    const result = await pool.query(
      'INSERT INTO deal_stages (name, probability, sort_order) VALUES ($1, $2, $3) RETURNING id',
      [name, probability, sort_order]
    );
    return { lastInsertRowid: result.rows[0].id };
  },

  updateStage: async (name, probability, sort_order, id) => {
    await pool.query(
      'UPDATE deal_stages SET name = $1, probability = $2, sort_order = $3 WHERE id = $4',
      [name, probability, sort_order, id]
    );
  },

  deleteStage: async (id) => {
    await pool.query('DELETE FROM deal_stages WHERE id = $1', [id]);
  },

  // List Items
  getListItems: async (type) => {
    const result = await pool.query(
      'SELECT * FROM list_items WHERE list_type = $1 ORDER BY sort_order',
      [type]
    );
    return result.rows;
  },

  createListItem: async (type, value, sort_order) => {
    const result = await pool.query(
      'INSERT INTO list_items (list_type, value, sort_order) VALUES ($1, $2, $3) RETURNING id',
      [type, value, sort_order]
    );
    return { lastInsertRowid: result.rows[0].id };
  },

  updateListItem: async (value, sort_order, id) => {
    await pool.query(
      'UPDATE list_items SET value = $1, sort_order = $2 WHERE id = $3',
      [value, sort_order, id]
    );
  },

  deleteListItem: async (id) => {
    await pool.query('DELETE FROM list_items WHERE id = $1', [id]);
  },

  // Monthly Snapshots
  getAllSnapshots: async () => {
    const result = await pool.query(`
      SELECT * FROM monthly_snapshots
      ORDER BY snapshot_year DESC, snapshot_month DESC
    `);
    return result.rows;
  },

  getSnapshotBreakdowns: async (snapshotId) => {
    const result = await pool.query(`
      SELECT * FROM monthly_snapshot_breakdowns
      WHERE snapshot_id = $1
      ORDER BY breakdown_type, forecast_value DESC
    `, [snapshotId]);
    return result.rows;
  },

  createSnapshot: async (month, year, totalForecast, dealCount) => {
    const result = await pool.query(`
      INSERT INTO monthly_snapshots (snapshot_month, snapshot_year, total_weighted_forecast, total_deal_count)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [month, year, totalForecast, dealCount]);
    return { lastInsertRowid: result.rows[0].id };
  },

  getSnapshotByMonth: async (month, year) => {
    const result = await pool.query(`
      SELECT * FROM monthly_snapshots
      WHERE snapshot_month = $1 AND snapshot_year = $2
    `, [month, year]);
    return result.rows[0] || null;
  },

  updateSnapshot: async (id, totalForecast, dealCount) => {
    await pool.query(`
      UPDATE monthly_snapshots
      SET total_weighted_forecast = $1, total_deal_count = $2
      WHERE id = $3
    `, [totalForecast, dealCount, id]);
  },

  deleteSnapshotBreakdowns: async (snapshotId) => {
    await pool.query('DELETE FROM monthly_snapshot_breakdowns WHERE snapshot_id = $1', [snapshotId]);
  },

  createSnapshotBreakdown: async (snapshotId, type, name, dealCount, forecastValue) => {
    await pool.query(`
      INSERT INTO monthly_snapshot_breakdowns (snapshot_id, breakdown_type, breakdown_name, deal_count, forecast_value)
      VALUES ($1, $2, $3, $4, $5)
    `, [snapshotId, type, name, dealCount, forecastValue]);
  },

  // Archived Deals
  getArchivedDeals: async (status) => {
    const result = await pool.query(`
      SELECT * FROM archived_deals
      WHERE status = $1
      ORDER BY archived_for_year DESC, archived_for_month DESC, archived_at DESC
    `, [status]);
    return result.rows;
  },

  getArchivedDealById: async (id) => {
    const result = await pool.query('SELECT * FROM archived_deals WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  updateArchivedDeal: async (data) => {
    await pool.query(`
      UPDATE archived_deals SET
        deal_name = $1,
        contact_name = $2,
        source_name = $3,
        partner_name = $4,
        platform_name = $5,
        product_name = $6,
        deal_stage_name = $7,
        status = $8,
        open_date = $9,
        close_month = $10,
        close_year = $11,
        deal_value = $12,
        notes = $13
      WHERE id = $14
    `, [data.deal_name, data.contact_name, data.source_name, data.partner_name, data.platform_name,
        data.product_name, data.deal_stage_name, data.status, data.open_date,
        data.close_month, data.close_year, data.deal_value, data.notes, data.id]);
  },

  deleteArchivedDeal: async (id) => {
    await pool.query('DELETE FROM archived_deals WHERE id = $1', [id]);
  },

  createArchivedDeal: async (data) => {
    const result = await pool.query(`
      INSERT INTO archived_deals (
        original_deal_id, deal_name, contact_name, source_name, partner_name, platform_name,
        product_name, deal_stage_name, status, open_date, close_month, close_year,
        deal_value, notes, archived_for_month, archived_for_year
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id
    `, [
      data.original_deal_id, data.deal_name, data.contact_name, data.source_name, data.partner_name,
      data.platform_name, data.product_name, data.deal_stage_name, data.status,
      data.open_date, data.close_month, data.close_year, data.deal_value,
      data.notes, data.archived_for_month, data.archived_for_year
    ]);
    return { lastInsertRowid: result.rows[0].id };
  },

  // Close Month Log
  isMonthClosed: async (month, year) => {
    const result = await pool.query(`
      SELECT id FROM close_month_log
      WHERE closed_month = $1 AND closed_year = $2
    `, [month, year]);
    return result.rows.length > 0;
  },

  logClosedMonth: async (month, year, closedBy = 'manual') => {
    await pool.query(`
      INSERT INTO close_month_log (closed_month, closed_year, closed_by)
      VALUES ($1, $2, $3)
    `, [month, year, closedBy]);
  },

  getClosedMonths: async () => {
    const result = await pool.query(`
      SELECT * FROM close_month_log
      ORDER BY closed_year DESC, closed_month DESC
    `);
    return result.rows;
  },

  // Get active deals with status won or lost
  getWonLostDeals: async () => {
    const result = await pool.query(`
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
    `);
    return result.rows;
  },

  // Leads
  getAllLeads: async () => {
    const result = await pool.query(`
      SELECT * FROM leads ORDER BY
        CASE WHEN status = 'new' THEN 0 ELSE 1 END,
        received_date DESC, created_at DESC
    `);
    return result.rows;
  },

  getLeadById: async (id) => {
    const result = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  createLead: async (data) => {
    const result = await pool.query(`
      INSERT INTO leads (firstname, lastname, email, mobile, company, message, source, received_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [data.firstname, data.lastname, data.email, data.mobile, data.company, data.message,
        data.source, data.received_date || new Date().toISOString().split('T')[0]]);
    return { lastInsertRowid: result.rows[0].id };
  },

  deleteLead: async (id) => {
    await pool.query('DELETE FROM leads WHERE id = $1', [id]);
  },

  updateLeadStatus: async (id, status, convertedDealId = null) => {
    await pool.query(`
      UPDATE leads SET status = $1, converted_deal_id = $2 WHERE id = $3
    `, [status, convertedDealId, id]);
  },

  // Get active deals for forecast calculation (excluding won/lost)
  getActiveDealsForForecast: async () => {
    const result = await pool.query(`
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
    `);
    return result.rows;
  },

  // User Management
  getUserByEmail: async (email) => {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  getUserById: async (id) => {
    const result = await pool.query(
      'SELECT id, email, role, must_change_password, is_disabled, created_at, last_login_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  getAllUsers: async () => {
    const result = await pool.query(
      'SELECT id, email, role, must_change_password, is_disabled, created_at, last_login_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  },

  getUserCount: async () => {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  },

  getAdminCount: async () => {
    const result = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_disabled = 0");
    return parseInt(result.rows[0].count);
  },

  createUser: async (email, passwordHash, role = 'user', mustChangePassword = 0) => {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role, must_change_password) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, passwordHash, role, mustChangePassword]
    );
    return { lastInsertRowid: result.rows[0].id };
  },

  updateUserPassword: async (id, passwordHash, mustChangePassword = 0) => {
    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_password = $2 WHERE id = $3',
      [passwordHash, mustChangePassword, id]
    );
  },

  updateUserLastLogin: async (id) => {
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  },

  disableUser: async (id) => {
    await pool.query('UPDATE users SET is_disabled = 1 WHERE id = $1', [id]);
  },

  enableUser: async (id) => {
    await pool.query('UPDATE users SET is_disabled = 0 WHERE id = $1', [id]);
  },

  deleteUser: async (id) => {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  },

  // Deal Notes
  getNotesByDealId: async (dealId) => {
    const result = await pool.query(
      'SELECT * FROM deal_notes WHERE deal_id = $1 ORDER BY note_date DESC, created_at DESC',
      [dealId]
    );
    return result.rows;
  },

  getLatestNoteByDealId: async (dealId) => {
    const result = await pool.query(
      'SELECT * FROM deal_notes WHERE deal_id = $1 ORDER BY note_date DESC, created_at DESC LIMIT 1',
      [dealId]
    );
    return result.rows[0] || null;
  },

  createNote: async (dealId, noteText, noteDate) => {
    const result = await pool.query(
      'INSERT INTO deal_notes (deal_id, note_text, note_date) VALUES ($1, $2, $3) RETURNING *',
      [dealId, noteText, noteDate || new Date().toISOString().split('T')[0]]
    );
    return result.rows[0];
  },

  updateNote: async (noteId, noteText) => {
    const result = await pool.query(
      'UPDATE deal_notes SET note_text = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [noteText, noteId]
    );
    return result.rows[0];
  },

  deleteNote: async (noteId) => {
    await pool.query('DELETE FROM deal_notes WHERE id = $1', [noteId]);
  }
};

module.exports = { initDb, queries };
