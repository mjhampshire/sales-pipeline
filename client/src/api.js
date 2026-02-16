import { getAuthHeaders, removeToken } from './auth';

const API_BASE = '/api';

async function handleResponse(res) {
  if (!res.ok) {
    // Handle 401 by clearing token (except for auth endpoints)
    if (res.status === 401 && !res.url.includes('/api/auth/')) {
      removeToken();
      window.location.reload();
    }
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    ...getAuthHeaders()
  };
}

// ============ AUTH ============

export async function checkSetupStatus() {
  const res = await fetch(`${API_BASE}/auth/setup-status`);
  return handleResponse(res);
}

export async function setup(email, password) {
  const res = await fetch(`${API_BASE}/auth/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return handleResponse(res);
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return handleResponse(res);
}

export async function getCurrentUser() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function changePassword(currentPassword, newPassword) {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ currentPassword, newPassword })
  });
  return handleResponse(res);
}

// ============ USER MANAGEMENT (Admin) ============

export async function getUsers() {
  const res = await fetch(`${API_BASE}/auth/users`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function createUser(email, role) {
  const res = await fetch(`${API_BASE}/auth/users`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, role })
  });
  return handleResponse(res);
}

export async function disableUser(id) {
  const res = await fetch(`${API_BASE}/auth/users/${id}/disable`, {
    method: 'PUT',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function enableUser(id) {
  const res = await fetch(`${API_BASE}/auth/users/${id}/enable`, {
    method: 'PUT',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function resetUserPassword(id) {
  const res = await fetch(`${API_BASE}/auth/users/${id}/reset-password`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function deleteUser(id) {
  const res = await fetch(`${API_BASE}/auth/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

// ============ DEALS ============

export async function getDeals(sort = 'id', order = 'asc') {
  const res = await fetch(`${API_BASE}/deals?sort=${sort}&order=${order}`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function createDeal(deal) {
  const res = await fetch(`${API_BASE}/deals`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(deal)
  });
  return handleResponse(res);
}

export async function updateDeal(id, updates) {
  const res = await fetch(`${API_BASE}/deals/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates)
  });
  return handleResponse(res);
}

export async function deleteDeal(id) {
  const res = await fetch(`${API_BASE}/deals/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

// ============ DEAL NOTES ============

export async function getDealNotes(dealId) {
  const res = await fetch(`${API_BASE}/deals/${dealId}/notes`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function createDealNote(dealId, noteText, noteDate) {
  const res = await fetch(`${API_BASE}/deals/${dealId}/notes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ note_text: noteText, note_date: noteDate })
  });
  return handleResponse(res);
}

export async function updateDealNote(noteId, noteText) {
  const res = await fetch(`${API_BASE}/notes/${noteId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ note_text: noteText })
  });
  return handleResponse(res);
}

export async function deleteDealNote(noteId) {
  const res = await fetch(`${API_BASE}/notes/${noteId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

// ============ STAGES ============

export async function getStages() {
  const res = await fetch(`${API_BASE}/stages`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function createStage(stage) {
  const res = await fetch(`${API_BASE}/stages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(stage)
  });
  return handleResponse(res);
}

export async function updateStage(id, updates) {
  const res = await fetch(`${API_BASE}/stages/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates)
  });
  return handleResponse(res);
}

export async function deleteStage(id) {
  const res = await fetch(`${API_BASE}/stages/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

// ============ LIST ITEMS ============

export async function getListItems(type) {
  const res = await fetch(`${API_BASE}/lists/${type}`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function createListItem(type, item) {
  const res = await fetch(`${API_BASE}/lists/${type}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(item)
  });
  return handleResponse(res);
}

export async function updateListItem(type, id, updates) {
  const res = await fetch(`${API_BASE}/lists/${type}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates)
  });
  return handleResponse(res);
}

export async function deleteListItem(type, id) {
  const res = await fetch(`${API_BASE}/lists/${type}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

// ============ MONTHLY SNAPSHOTS ============

export async function getSnapshots() {
  const res = await fetch(`${API_BASE}/snapshots`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

// ============ ARCHIVED DEALS ============

export async function getArchivedWonDeals() {
  const res = await fetch(`${API_BASE}/archived/won`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function getArchivedLostDeals() {
  const res = await fetch(`${API_BASE}/archived/lost`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function createArchivedDeal(deal) {
  const res = await fetch(`${API_BASE}/archived`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(deal)
  });
  return handleResponse(res);
}

export async function updateArchivedDeal(id, updates) {
  const res = await fetch(`${API_BASE}/archived/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates)
  });
  return handleResponse(res);
}

export async function deleteArchivedDeal(id) {
  const res = await fetch(`${API_BASE}/archived/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function restoreArchivedDeal(id) {
  const res = await fetch(`${API_BASE}/archived/${id}/restore`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

// ============ CLOSE MONTH ============

export async function getCloseMonthStatus() {
  const res = await fetch(`${API_BASE}/close-month/status`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function closeMonth(closedBy = 'manual') {
  const res = await fetch(`${API_BASE}/close-month`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ closedBy })
  });
  return handleResponse(res);
}

export async function updatePriorMonth() {
  const res = await fetch(`${API_BASE}/update-prior-month`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

// ============ LEADS ============

export async function getLeads() {
  const res = await fetch(`${API_BASE}/leads`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function createLead(lead) {
  const res = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(lead)
  });
  return handleResponse(res);
}

export async function deleteLead(id) {
  const res = await fetch(`${API_BASE}/leads/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function updateLeadStatus(id, status) {
  const res = await fetch(`${API_BASE}/leads/${id}/status`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });
  return handleResponse(res);
}

export async function checkDealNameExists(name) {
  const res = await fetch(`${API_BASE}/deals/check-name?name=${encodeURIComponent(name)}`, {
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}

export async function convertLeadToDeal(id, dealName = null) {
  const res = await fetch(`${API_BASE}/leads/${id}/convert`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ deal_name: dealName })
  });
  return handleResponse(res);
}
