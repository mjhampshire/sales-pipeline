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
