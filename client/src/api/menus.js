const BASE = '/api';

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function listMenus() {
  return fetchJSON(`${BASE}/menus`);
}

export async function getMenu(id) {
  return fetchJSON(`${BASE}/menus/${id}`);
}

export async function createMenu(data) {
  return fetchJSON(`${BASE}/menus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateMenu(id, data) {
  return fetchJSON(`${BASE}/menus/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteMenu(id) {
  return fetchJSON(`${BASE}/menus/${id}`, { method: 'DELETE' });
}

export async function duplicateMenu(id) {
  return fetchJSON(`${BASE}/menus/${id}/duplicate`, { method: 'POST' });
}

export async function updateSections(menuId, sections) {
  return fetchJSON(`${BASE}/menus/${menuId}/sections`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections }),
  });
}

export async function listTemplates() {
  return fetchJSON(`${BASE}/templates`);
}

export async function getTemplate(id) {
  return fetchJSON(`${BASE}/templates/${id}`);
}

// PlateStack integration
export async function getPlateStackStatus() {
  return fetchJSON(`${BASE}/platestack/status`);
}

export async function getPlateStackDishes(tag) {
  const url = tag
    ? `${BASE}/platestack/dishes?tag=${encodeURIComponent(tag)}`
    : `${BASE}/platestack/dishes`;
  return fetchJSON(url);
}

export async function getPlateStackTags() {
  return fetchJSON(`${BASE}/platestack/tags`);
}

// Dish Library
export async function searchDishLibrary(query) {
  return fetchJSON(`${BASE}/dish-library?q=${encodeURIComponent(query)}`);
}

export async function listAllDishLibrary() {
  return fetchJSON(`${BASE}/dish-library?all=true`);
}

export async function importDishLibrary(formDataOrText) {
  if (formDataOrText instanceof FormData) {
    const res = await fetch(`${BASE}/dish-library/import`, {
      method: 'POST',
      body: formDataOrText,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Import failed (${res.status})`);
    }
    return res.json();
  }
  return fetchJSON(`${BASE}/dish-library/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formDataOrText),
  });
}

export async function deleteDishFromLibrary(id) {
  return fetchJSON(`${BASE}/dish-library/${id}`, { method: 'DELETE' });
}

export async function exportPdf(menuId, options = {}) {
  const res = await fetch(`${BASE}/export/${menuId}/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(err.error || 'Export failed');
  }
  return res.blob();
}
