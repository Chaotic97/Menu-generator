const BASE = '/api';

export async function listMenus() {
  const res = await fetch(`${BASE}/menus`);
  return res.json();
}

export async function getMenu(id) {
  const res = await fetch(`${BASE}/menus/${id}`);
  return res.json();
}

export async function createMenu(data) {
  const res = await fetch(`${BASE}/menus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateMenu(id, data) {
  const res = await fetch(`${BASE}/menus/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteMenu(id) {
  const res = await fetch(`${BASE}/menus/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function updateSections(menuId, sections) {
  const res = await fetch(`${BASE}/menus/${menuId}/sections`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections }),
  });
  return res.json();
}

export async function listTemplates() {
  const res = await fetch(`${BASE}/templates`);
  return res.json();
}

export async function getTemplate(id) {
  const res = await fetch(`${BASE}/templates/${id}`);
  return res.json();
}

// PlateStack integration
export async function getPlateStackStatus() {
  const res = await fetch(`${BASE}/platestack/status`);
  return res.json();
}

export async function getPlateStackDishes(tag) {
  const url = tag
    ? `${BASE}/platestack/dishes?tag=${encodeURIComponent(tag)}`
    : `${BASE}/platestack/dishes`;
  const res = await fetch(url);
  return res.json();
}

export async function getPlateStackTags() {
  const res = await fetch(`${BASE}/platestack/tags`);
  return res.json();
}

// Dish Library
export async function searchDishLibrary(query) {
  const res = await fetch(`${BASE}/dish-library?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function importDishLibrary(formDataOrText) {
  if (formDataOrText instanceof FormData) {
    const res = await fetch(`${BASE}/dish-library/import`, {
      method: 'POST',
      body: formDataOrText,
    });
    return res.json();
  }
  const res = await fetch(`${BASE}/dish-library/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formDataOrText),
  });
  return res.json();
}

export async function deleteDishFromLibrary(id) {
  const res = await fetch(`${BASE}/dish-library/${id}`, { method: 'DELETE' });
  return res.json();
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
