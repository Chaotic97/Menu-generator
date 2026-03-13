# MenuForge Architectural Audit

**Date:** 2026-03-13

---

## 1. Security Surface

### 1.1 No Authentication or Authorization — Critical

**Files:** `server/index.js`, all route files

Every API endpoint is publicly accessible: creating/deleting menus, exporting PDFs, importing dishes, reading PlateStack data. The rate limiter is the only gate. Since the app is deployed to GCE with a public Nginx proxy, the API is actively exposed to the internet.

**Recommendation:** Add at minimum a shared-secret bearer token (`Authorization` header checked in middleware) or HTTP basic auth at the Nginx layer. If this is intentionally single-user, ensure it never binds to `0.0.0.0` without auth.

---

### 1.2 Puppeteer `--no-sandbox` — High

**File:** `server/services/pdf.js:9`

The Chromium process runs unsandboxed. The HTML fed to it is constructed from user-controlled data (menu names, dish names, descriptions). Any bypass in `esc()` gives JavaScript execution inside an unsandboxed Chromium process on the server.

**Recommendation:** Run Puppeteer with the sandbox enabled. The Dockerfile already installs system Chromium — configure the container user and `/dev/shm` correctly instead of disabling the sandbox.

---

### 1.3 Incomplete HTML Escaping in `esc()` — High

**File:** `server/services/pdf.js:46-53`

Single quotes (`'`) are not escaped. Throughout `buildHtml()`, template values (colors, font names, etc.) are interpolated directly into inline `style="..."` attributes without escaping. Template data is user-controllable via `POST /api/templates`.

**Recommendation:**
- Add `'` → `&#39;` to `esc()`.
- Validate template config values against strict allowlists (hex colors, known font families, numeric sizes) at the `POST /api/templates` boundary.
- Escape all template-derived values when interpolating into HTML attributes.

---

### 1.4 Template ID is User-Controlled with No Validation — Medium

**File:** `server/routes/templates.js:33`

The template `id` is the primary key taken directly from the request body with no format validation. A user could supply an `id` matching a builtin template name. No format constraints exist.

**Recommendation:** Validate template `id` against a slug pattern (`/^[a-z0-9-]+$/`). Check for `is_builtin` conflicts to prevent overwriting builtins.

---

### 1.5 Error Messages Leak Internal Details — Medium

**Files:** `server/routes/menus.js:65`, `server/routes/templates.js:56`

Raw `err.message` from SQLite errors is sent to the client, leaking table names, column names, constraint names, and file paths.

**Recommendation:** Log the full error server-side, return a generic message to the client. Some routes catch errors locally and bypass the global error handler — route these through `next(err)` instead.

---

### 1.6 CORS Defaults to Wildcard — Medium

**File:** `server/index.js:30-31`

If `CORS_ORIGIN` isn't set, the API accepts requests from any origin. Combined with no auth, any website can make API calls to a deployed instance.

**Recommendation:** Default to a restrictive origin in production, or log a warning at startup when `CORS_ORIGIN` is unset.

---

### 1.7 `custom_overrides` Stored as Unvalidated JSON String — Medium

**File:** `server/routes/menus.js:104-116`

The `custom_overrides` field is stored directly as-is with no validation.

**Recommendation:** Validate that `custom_overrides` is valid JSON and conforms to an expected schema before storing. At minimum, `JSON.parse()` it to confirm validity.

---

## 2. Data Integrity

### 2.1 Delete-and-Reinsert Bulk Update Destroys IDs — High

**File:** `server/routes/menus.js:150-219`

The `PUT /:id/sections` endpoint deletes ALL sections and dishes, then re-inserts them. Consequences:
- Every save generates new auto-increment IDs for sections and dishes.
- Any external reference to a dish or section ID is invalidated on every autosave.
- If the client sends a partial payload (network truncation, JS error), all existing data is destroyed and replaced with the partial set.
- The auto-increment counter grows unboundedly (every 800ms debounced save allocates new IDs).

**Recommendation:** Switch to an upsert pattern: match existing sections/dishes by a stable identifier (client-provided ID or UUID), update in-place, and only delete rows genuinely removed.

---

### 2.2 No Validation on Dish/Section Names — Medium

**File:** `server/routes/menus.js:163-170`

Section names and dish names from the bulk update have zero validation — no length limit, no type check. A section with `name: null` violates the `NOT NULL` constraint and crashes the transaction (losing the entire save).

**Recommendation:** Validate that `section.name` is a non-empty string with a reasonable max length (e.g., 200 chars). Same for dish fields. Fail fast with a 400 before entering the transaction.

---

### 2.3 `dish_library` Auto-Save Silently Overwrites — Low

**File:** `server/routes/menus.js:202-216`

Every bulk section save upserts all dishes into `dish_library`, overwriting price and description. Multi-user scenarios silently overwrite each other's library entries.

**Recommendation:** Consider only inserting (not updating) library entries from autosave, or adding a `source` column to distinguish manual vs auto-saved entries.

---

### 2.4 `lastInsertRowid` Misuse in Upsert — Low

**File:** `server/routes/dish-library.js:59`

The fallback `result.lastInsertRowid || result.changes` would look up `rowid = 1` (the value of `changes`) on an update, returning the wrong dish.

**Recommendation:** Remove the `|| result.changes` fallback. Query by name if `lastInsertRowid` is 0.

---

## 3. Architectural Coupling

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

### 4.1 Puppeteer Browser Instance Leak on Crash — High

**File:** `server/services/pdf.js:5-13`

If the browser disconnects between the connection check and page operation, orphaned Chromium processes can accumulate.

**Recommendation:** Set `browser = null` in a `browser.on('disconnected')` handler, or wrap `getBrowser()` with a mutex.

---

### 4.2 Concurrent PDF Exports Share a Single Browser — Medium

**File:** `server/services/pdf.js`

Multiple concurrent PDF requests open pages on the same browser. If one triggers a crash, all fail. Each page also adds significant memory pressure.

**Recommendation:** Add a concurrency semaphore on `generatePdf()`. Limit to N concurrent pages and queue the rest.

---

### 4.3 Font Loading Race in PDF — Medium

**File:** `server/services/pdf.js:377-380`

If font loading times out, the rejection propagates as a 500 instead of falling back to available fonts. The `reject` timer may also fire after the page is closed, causing an unhandled rejection.

**Recommendation:** Catch the font timeout specifically and proceed with PDF generation. Use `Promise.allSettled` or a local catch.

---

### 4.4 `JSON.parse` on DB Data Without Try/Catch — Medium

**Files:** `server/routes/menus.js:40`, `server/routes/export.js:39`

If `theme_config` or `starter_sections` contains malformed JSON, these throw unhandled inside transactions or produce generic 500s.

**Recommendation:** Wrap `JSON.parse` calls on DB data in try/catch with specific error messages.

---

### 4.5 Client API Layer Never Checks Response Status — Medium

**File:** `client/src/api/menus.js`

Every function except `exportPdf` calls `res.json()` without checking `res.ok`. Server errors are silently returned as data.

**Recommendation:** Add a shared `fetchJSON()` wrapper that checks `res.ok` and throws on non-2xx responses.

---

## 5. API Design

### 5.1 Rate Limiter Conflicts with Autosave — High

**File:** `server/index.js:37-43`

100 requests / 15 minutes. Autosave fires on every edit (800ms debounce). A user actively editing easily hits this limit (~1 request per 9 seconds). Once rate-limited, autosave silently fails with no user indication.

**Recommendation:** Exempt the autosave endpoint from rate limiting, increase the limit significantly for `PUT /api/menus/:id/sections`, or use per-endpoint rate limit configuration. The client should also surface rate limit errors.

---

### 5.2 No Input Length Limits on Text Fields — Medium

**Files:** All POST/PUT routes

No route validates string length for `name`, `description`, `restaurant_name`, `subtitle`, etc. The 1MB body limit is the only constraint.

**Recommendation:** Add field-level length validation in a shared middleware or per-route.

---

### 5.3 `PUT /:id/sections` Returns Different Shape Than `GET /:id` — Low

`GET /:id` returns `{ ...menu, sections }`. `PUT /:id/sections` returns `{ sections }` without the menu envelope. Client must handle two response shapes.

**Recommendation:** Return the full menu object from the sections update endpoint.

---

### 5.4 No Pagination on `GET /api/menus` — Low

Returns all menus with no limit/offset. Fine at current scale.

---

## 6. Deployment / Operations

### 6.1 SQLite on GCE with No Backup Strategy — Medium

The SQLite DB lives on the boot disk with no snapshots, backups, or replication.

**Recommendation:** Add a cron job for periodic `.backup` copies to GCS, or use GCE persistent disk snapshots.

---

### 6.2 Dockerfile Runs as Root — Medium

**File:** `Dockerfile`

No `USER` directive. Node and Chromium run as root inside the container.

**Recommendation:** Add a non-root user:
```dockerfile
RUN useradd -m appuser
USER appuser
```

---

### 6.3 `process.on('exit')` Handler is Dead Code — Low

**File:** `server/services/pdf.js:413-415`

`process.on('exit')` runs synchronously — `browser.close()` is async and will never complete. The SIGTERM/SIGINT handlers already handle this correctly.

**Recommendation:** Remove the `process.on('exit')` handler.
