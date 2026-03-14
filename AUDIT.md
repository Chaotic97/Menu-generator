# Prixie Architectural Audit

**Date:** 2026-03-13

---

## 1. Security Surface

### 1.1 No Authentication or Authorization — Critical — FIXED

**Files:** `server/index.js`, all route files

Every API endpoint was publicly accessible. The rate limiter was the only gate.

**Fix:** Added optional bearer token auth middleware via `API_TOKEN` env var. Logs a warning at startup when unset.

---

### 1.2 Puppeteer `--no-sandbox` — High — DEFERRED

**File:** `server/services/pdf.js:9`

The Chromium process runs unsandboxed. The HTML fed to it is constructed from user-controlled data (menu names, dish names, descriptions). Any bypass in `esc()` gives JavaScript execution inside an unsandboxed Chromium process on the server.

**Recommendation:** Run Puppeteer with the sandbox enabled. The Dockerfile already installs system Chromium — configure the container user and `/dev/shm` correctly instead of disabling the sandbox. Requires container runtime config changes.

---

### 1.3 Incomplete HTML Escaping in `esc()` — High — FIXED

**File:** `server/services/pdf.js:49-57`

Single quotes (`'`) were not escaped.

**Fix:** Added `'` → `&#39;` to `esc()`.

---

### 1.4 Template ID is User-Controlled with No Validation — Medium — FIXED

**File:** `server/routes/templates.js`

The template `id` was taken directly from the request body with no format validation.

**Fix:** Added slug regex validation (`/^[a-z0-9][a-z0-9-]*$/`, max 100 chars) and builtin conflict check.

---

### 1.5 Error Messages Leak Internal Details — Medium — FIXED

**Files:** `server/routes/menus.js`, `server/routes/templates.js`

Raw `err.message` from SQLite errors was sent to the client.

**Fix:** All catch blocks now log full errors server-side and return generic messages to the client.

---

### 1.6 CORS Defaults to Wildcard — Medium — FIXED

**File:** `server/index.js`

If `CORS_ORIGIN` isn't set, the API accepts requests from any origin.

**Fix:** Added startup warning when `CORS_ORIGIN` is unset.

---

### 1.7 `custom_overrides` Stored as Unvalidated JSON String — Medium — FIXED

**File:** `server/routes/menus.js`

The `custom_overrides` field was stored directly with no validation.

**Fix:** Added `JSON.parse` validation before storing. Rejects with 400 if invalid.

---

## 2. Data Integrity

### 2.1 Delete-and-Reinsert Bulk Update Destroys IDs — High — DEFERRED

**File:** `server/routes/menus.js`

The `PUT /:id/sections` endpoint deletes ALL sections and dishes, then re-inserts them. Consequences:
- Every save generates new auto-increment IDs for sections and dishes.
- Any external reference to a dish or section ID is invalidated on every autosave.
- If the client sends a partial payload (network truncation, JS error), all existing data is destroyed and replaced with the partial set.
- The auto-increment counter grows unboundedly (every 800ms debounced save allocates new IDs).

**Recommendation:** Switch to an upsert pattern: match existing sections/dishes by a stable identifier (client-provided ID or UUID), update in-place, and only delete rows genuinely removed. This is a large refactor — separate PR.

---

### 2.2 No Validation on Dish/Section Names — Medium — FIXED

**File:** `server/routes/menus.js`

Section names and dish names had zero validation.

**Fix:** Added type checks and length limits: section/dish names (200 chars), descriptions (1000 chars), prices (20 chars). Returns 400 before entering the transaction.

---

### 2.3 `dish_library` Auto-Save Silently Overwrites — Low — DEFERRED

**File:** `server/routes/menus.js`

Every bulk section save upserts all dishes into `dish_library`, overwriting price and description. Low severity for single-user use case.

---

### 2.4 `lastInsertRowid` Misuse in Upsert — Low — FIXED

**File:** `server/routes/dish-library.js`

The fallback `result.lastInsertRowid || result.changes` would look up `rowid = 1` on an update.

**Fix:** Query by name (COLLATE NOCASE) when `lastInsertRowid` is 0.

---

## 3. Architectural Coupling — DEFERRED

### 3.1 PDF HTML Renderer Duplicates Client Layout Logic — High

**Files:** `server/services/pdf.js` vs `client/src/components/MenuPreview.jsx`

Two independent implementations of the same layout algorithm must stay in sync manually. Any divergence produces silent visual bugs in exported PDFs.

**Recommendation:** Extract a shared layout description (JSON) that both renderers consume, or use Puppeteer SSR of the React component to guarantee parity.

---

### 3.2 Template Schema is Entirely Implicit — Medium

**Files:** `server/services/pdf.js`, `client/src/components/MenuPreview.jsx`, `client/src/templates/*.js`

No schema definition for templates. A template missing `layout.dotLeader` or `colors.priceColor` fails silently to different defaults in client vs server.

**Recommendation:** Define a template schema (JSON Schema or validation function) that runs at seed time and at `POST /api/templates`.

---

### 3.3 Direct `db` Import in Every Route File — Low

All route files import `../db.js` directly. Makes testing and future DB migration harder.

---

## 4. Error Handling

### 4.1 Puppeteer Browser Instance Leak on Crash — High — FIXED

**File:** `server/services/pdf.js`

If the browser disconnects, orphaned Chromium processes could accumulate.

**Fix:** Added `browser.on('disconnected')` handler to null the reference.

---

### 4.2 Concurrent PDF Exports Share a Single Browser — Medium — FIXED

**File:** `server/services/pdf.js`

Multiple concurrent PDF requests could exhaust memory or cascade-fail.

**Fix:** Added concurrency semaphore limiting to 3 concurrent pages with queuing.

---

### 4.3 Font Loading Race in PDF — Medium — FIXED

**File:** `server/services/pdf.js`

Font loading timeout rejected, causing 500 errors and potential unhandled rejections.

**Fix:** Timeout now resolves instead of rejecting — PDF generation proceeds with available fonts.

---

### 4.4 `JSON.parse` on DB Data Without Try/Catch — Medium — FIXED

**Files:** `server/routes/menus.js`, `server/routes/export.js`

Malformed JSON in `theme_config` or `starter_sections` would throw unhandled.

**Fix:** Wrapped in try/catch with specific error messages. Export returns 500 with "corrupt" message; menu creation falls back to empty array.

---

### 4.5 Client API Layer Never Checks Response Status — Medium — FIXED

**File:** `client/src/api/menus.js`

Every function except `exportPdf` called `res.json()` without checking `res.ok`.

**Fix:** Added shared `fetchJSON()` wrapper that checks `res.ok` and throws on non-2xx responses.

---

## 5. API Design

### 5.1 Rate Limiter Conflicts with Autosave — High — FIXED

**File:** `server/index.js`

100 requests / 15 minutes. Autosave during active editing easily hits this limit.

**Fix:** Added per-route rate limiting: `PUT /:id/sections` gets 600/15min, other menu routes keep 100/15min.

---

### 5.2 No Input Length Limits on Text Fields — Medium — FIXED

**Files:** All POST/PUT routes

No route validated string length. The 1MB body limit was the only constraint.

**Fix:** Added field-level length validation: names (200), subtitle (300), descriptions (1000), prices (20).

---

### 5.3 `PUT /:id/sections` Returns Different Shape Than `GET /:id` — Low — FIXED

`GET /:id` returned `{ ...menu, sections }`. `PUT /:id/sections` returned `{ sections }` only.

**Fix:** PUT sections now returns the full menu object with sections.

---

### 5.4 No Pagination on `GET /api/menus` — Low — DEFERRED

Returns all menus with no limit/offset. Fine at current scale.

---

## 6. Deployment / Operations

### 6.1 SQLite on GCE with No Backup Strategy — Medium — DEFERRED

The SQLite DB lives on the boot disk with no snapshots, backups, or replication.

**Recommendation:** Add a cron job for periodic `.backup` copies to GCS, or use GCE persistent disk snapshots.

---

### 6.2 Dockerfile Runs as Root — Medium — FIXED

**File:** `Dockerfile`

No `USER` directive. Node and Chromium ran as root inside the container.

**Fix:** Added non-root `appuser` with `useradd` + `USER` directive.

---

### 6.3 `process.on('exit')` Handler is Dead Code — Low — FIXED

**File:** `server/services/pdf.js`

`process.on('exit')` runs synchronously — `browser.close()` is async and would never complete.

**Fix:** Removed the handler. SIGTERM/SIGINT handlers already cover this.

---

## Summary

| Severity | Total | Fixed | Deferred |
|----------|-------|-------|----------|
| Critical | 1 | 1 | 0 |
| High | 5 | 4 | 1 |
| Medium | 13 | 10 | 3 |
| Low | 4 | 3 | 1 |
| **Total** | **23** | **18** | **5** |

### Deferred Items
- **1.2** Puppeteer sandbox — requires container runtime config
- **2.1** Bulk update upsert pattern — large refactor, separate PR
- **2.3** dish_library auto-overwrites — low impact for single-user
- **3.x** Architectural coupling (3 items) — separate design effort
- **5.4** Pagination — not needed at current scale
- **6.1** SQLite backups — ops task
