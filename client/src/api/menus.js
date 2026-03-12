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
