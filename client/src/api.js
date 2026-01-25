const API_BASE = '/api';

async function handleResponse(res) {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Deals
export async function getDeals(sort = 'id', order = 'asc') {
  const res = await fetch(`${API_BASE}/deals?sort=${sort}&order=${order}`);
  return handleResponse(res);
}

export async function createDeal(deal) {
  const res = await fetch(`${API_BASE}/deals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deal)
  });
  return handleResponse(res);
}

export async function updateDeal(id, updates) {
  const res = await fetch(`${API_BASE}/deals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return handleResponse(res);
}

export async function deleteDeal(id) {
  const res = await fetch(`${API_BASE}/deals/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

// Stages
export async function getStages() {
  const res = await fetch(`${API_BASE}/stages`);
  return handleResponse(res);
}

export async function createStage(stage) {
  const res = await fetch(`${API_BASE}/stages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stage)
  });
  return handleResponse(res);
}

export async function updateStage(id, updates) {
  const res = await fetch(`${API_BASE}/stages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return handleResponse(res);
}

export async function deleteStage(id) {
  const res = await fetch(`${API_BASE}/stages/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

// List Items
export async function getListItems(type) {
  const res = await fetch(`${API_BASE}/lists/${type}`);
  return handleResponse(res);
}

export async function createListItem(type, item) {
  const res = await fetch(`${API_BASE}/lists/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  return handleResponse(res);
}

export async function updateListItem(type, id, updates) {
  const res = await fetch(`${API_BASE}/lists/${type}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return handleResponse(res);
}

export async function deleteListItem(type, id) {
  const res = await fetch(`${API_BASE}/lists/${type}/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

// Monthly Snapshots
export async function getSnapshots() {
  const res = await fetch(`${API_BASE}/snapshots`);
  return handleResponse(res);
}

// Archived Deals
export async function getArchivedWonDeals() {
  const res = await fetch(`${API_BASE}/archived/won`);
  return handleResponse(res);
}

export async function getArchivedLostDeals() {
  const res = await fetch(`${API_BASE}/archived/lost`);
  return handleResponse(res);
}

export async function createArchivedDeal(deal) {
  const res = await fetch(`${API_BASE}/archived`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deal)
  });
  return handleResponse(res);
}

export async function updateArchivedDeal(id, updates) {
  const res = await fetch(`${API_BASE}/archived/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return handleResponse(res);
}

export async function deleteArchivedDeal(id) {
  const res = await fetch(`${API_BASE}/archived/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

export async function restoreArchivedDeal(id) {
  const res = await fetch(`${API_BASE}/archived/${id}/restore`, { method: 'POST' });
  return handleResponse(res);
}

// Close Month
export async function getCloseMonthStatus() {
  const res = await fetch(`${API_BASE}/close-month/status`);
  return handleResponse(res);
}

export async function closeMonth(closedBy = 'manual') {
  const res = await fetch(`${API_BASE}/close-month`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ closedBy })
  });
  return handleResponse(res);
}

export async function updatePriorMonth() {
  const res = await fetch(`${API_BASE}/update-prior-month`, { method: 'POST' });
  return handleResponse(res);
}

// Leads
export async function getLeads() {
  const res = await fetch(`${API_BASE}/leads`);
  return handleResponse(res);
}

export async function createLead(lead) {
  const res = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead)
  });
  return handleResponse(res);
}

export async function deleteLead(id) {
  const res = await fetch(`${API_BASE}/leads/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

export async function updateLeadStatus(id, status) {
  const res = await fetch(`${API_BASE}/leads/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return handleResponse(res);
}

export async function checkDealNameExists(name) {
  const res = await fetch(`${API_BASE}/deals/check-name?name=${encodeURIComponent(name)}`);
  return handleResponse(res);
}

export async function convertLeadToDeal(id, dealName = null) {
  const res = await fetch(`${API_BASE}/leads/${id}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deal_name: dealName })
  });
  return handleResponse(res);
}
