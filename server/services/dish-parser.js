import { parse as csvParse } from 'csv-parse/sync';
import mammoth from 'mammoth';

/**
 * Normalize a price string. Keeps special values like M.P., A.Q., market price.
 * Strips leading $ for consistency with the app convention.
 */
function normalizePrice(raw) {
  if (!raw) return '';
  const s = raw.toString().trim();
  if (!s) return '';

  // Special price values
  const upper = s.toUpperCase().replace(/[.\s]/g, '');
  if (upper === 'MP' || upper === 'MARKETPRICE') return 'M.P.';
  if (upper === 'AQ') return 'A.Q.';

  // Strip leading $ but keep the number
  return s.replace(/^\$\s*/, '');
}

/**
 * Detect delimiter in text (comma, tab, semicolon, pipe).
 */
function detectDelimiter(text) {
  const firstLines = text.split('\n').slice(0, 5).join('\n');
  const counts = {
    '\t': (firstLines.match(/\t/g) || []).length,
    ',': (firstLines.match(/,/g) || []).length,
    ';': (firstLines.match(/;/g) || []).length,
    '|': (firstLines.match(/\|/g) || []).length,
  };
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ',';
}

/**
 * Try to map column indices from a header row.
 * Returns { nameIdx, priceIdx, descIdx } or null if no recognizable headers.
 */
function detectHeaderColumns(fields) {
  const lower = fields.map((f) => f.toLowerCase().trim());
  const nameIdx = lower.findIndex((f) => ['name', 'dish', 'item', 'dish name', 'item name', 'menu item'].includes(f));
  const priceIdx = lower.findIndex((f) => ['price', 'cost', 'amount'].includes(f));
  const descIdx = lower.findIndex((f) => ['description', 'desc', 'details', 'notes'].includes(f));

  // At least need a name column to consider it a valid header
  if (nameIdx === -1) return null;
  return { nameIdx, priceIdx, descIdx };
}

/**
 * Parse CSV/TSV text into dish objects.
 * Auto-detects delimiter and handles both header and headerless formats.
 */
export function parseCSV(text) {
  const delimiter = detectDelimiter(text);

  // First try with headers
  try {
    const records = csvParse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      delimiter,
    });

    if (records.length > 0) {
      const keys = Object.keys(records[0]);
      const headerMap = detectHeaderColumns(keys);

      if (headerMap) {
        return records
          .map((row) => {
            const vals = Object.values(row);
            return {
              name: (vals[headerMap.nameIdx] || '').trim(),
              price: normalizePrice(headerMap.priceIdx >= 0 ? vals[headerMap.priceIdx] : ''),
              description: (headerMap.descIdx >= 0 ? vals[headerMap.descIdx] : '').trim(),
            };
          })
          .filter((d) => d.name);
      }

      // Fallback: try common column name variations directly
      const mapped = records
        .map((row) => {
          const name =
            row.name || row.Name || row.NAME ||
            row.dish || row.Dish || row.DISH ||
            row.item || row.Item || row.ITEM ||
            row['dish name'] || row['Dish Name'] ||
            row['menu item'] || row['Menu Item'] || '';
          const price =
            row.price || row.Price || row.PRICE ||
            row.cost || row.Cost || row.COST ||
            row.amount || row.Amount || '';
          const description =
            row.description || row.Description || row.DESCRIPTION ||
            row.desc || row.Desc || row.DESC ||
            row.details || row.Details ||
            row.notes || row.Notes || '';
          return {
            name: name.trim(),
            price: normalizePrice(price),
            description: description.trim(),
          };
        })
        .filter((d) => d.name);

      if (mapped.length > 0) return mapped;
    }
  } catch {
    // columns: true failed — try headerless
  }

  // Headerless: assume col order is name, price, description
  try {
    const records = csvParse(text, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      delimiter,
    });

    // Check if first row looks like a header (no price-like value in expected price column)
    let startIdx = 0;
    if (records.length > 1 && records[0].length >= 2) {
      const maybePrice = records[0][1];
      if (maybePrice && !/^\$?\d/.test(maybePrice.trim())) {
        startIdx = 1; // skip header row
      }
    }

    return records
      .slice(startIdx)
      .map((cols) => ({
        name: (cols[0] || '').trim(),
        price: normalizePrice(cols[1] || ''),
        description: (cols[2] || '').trim(),
      }))
      .filter((d) => d.name);
  } catch {
    return [];
  }
}

/**
 * Parse DOCX buffer into dish objects.
 * Extracts raw text, then feeds to plain text parser.
 */
export async function parseDOCX(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return parsePlainText(result.value);
}

/**
 * Parse plain text into dish objects.
 *
 * Handles many common menu formats:
 *   - "Dish Name ... $14.95"  (dot leaders)
 *   - "Dish Name    14.95"    (whitespace separated)
 *   - "Dish Name - Description ... $14.95"
 *   - "Dish Name $14.95 \n  Description on next line"
 *   - Tab-separated lines (detected and delegated to CSV parser)
 *   - "Dish Name | Price | Description" (pipe-separated)
 */
export function parsePlainText(text) {
  const lines = text.split('\n');

  // Heuristic: if most lines contain tabs, treat as TSV
  const tabLines = lines.filter((l) => l.includes('\t') && l.trim()).length;
  const nonEmptyLines = lines.filter((l) => l.trim()).length;
  if (nonEmptyLines > 0 && tabLines / nonEmptyLines > 0.5) {
    return parseCSV(text);
  }

  // Heuristic: if most lines contain pipes, treat as pipe-separated
  const pipeLines = lines.filter((l) => l.includes('|') && l.trim()).length;
  if (nonEmptyLines > 0 && pipeLines / nonEmptyLines > 0.5) {
    return parseCSV(text);
  }

  const dishes = [];

  // Price patterns — matches prices at end of line with various separators
  // Handles: $14.95, 14.95, $14, 14, M.P., A.Q., market price
  const priceAtEnd = /(?:[\s.…·\-—–]+)(\$?\d+(?:\.\d{1,2})?|[Mm]\.?[Pp]\.?|[Aa]\.?[Qq]\.?|[Mm]arket\s*[Pp]rice)\s*$/;
  const standalonePriceRegex = /^\$?\d+(?:\.\d{1,2})?$/;

  // Pattern: "Name - Description" or "Name – Description" (em/en dash separator)
  const dashDescRegex = /^(.+?)\s+[-–—]\s+(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Skip lines that look like section headers (all caps, no price, short, no digits)
    if (
      trimmed === trimmed.toUpperCase() &&
      trimmed.length < 50 &&
      !priceAtEnd.test(trimmed) &&
      !/\d/.test(trimmed) &&
      trimmed.length > 1
    ) {
      continue;
    }

    // Skip standalone prices
    if (standalonePriceRegex.test(trimmed)) continue;

    // Skip very short lines that are just punctuation or decoration
    if (/^[-=*_~.·…]+$/.test(trimmed)) continue;

    // Extract price from end of line
    let remainder = trimmed;
    let price = '';
    const priceMatch = trimmed.match(priceAtEnd);
    if (priceMatch) {
      price = normalizePrice(priceMatch[1]);
      remainder = trimmed.slice(0, priceMatch.index).trim();
      // Clean trailing dots/dashes/whitespace used as leaders
      remainder = remainder.replace(/[\s.…·\-—–]+$/, '').trim();
    }

    if (!remainder) continue;

    // Try to split "Name - Description" pattern
    let name = remainder;
    let inlineDesc = '';
    const dashMatch = remainder.match(dashDescRegex);
    if (dashMatch) {
      name = dashMatch[1].trim();
      inlineDesc = dashMatch[2].trim();
    }

    if (!name) continue;

    // Check next lines for continuation description (indented lines)
    let description = inlineDesc;
    while (i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const nextTrimmed = nextLine.trim();
      if (!nextTrimmed) break;

      // Description continuation: indented, doesn't look like a new dish (no trailing price),
      // and doesn't look like a section header
      const isIndented = nextLine.startsWith('  ') || nextLine.startsWith('\t');
      const hasPrice = priceAtEnd.test(nextTrimmed);
      const looksLikeHeader = nextTrimmed === nextTrimmed.toUpperCase() && !/\d/.test(nextTrimmed) && nextTrimmed.length < 50;

      if (isIndented && !hasPrice && !looksLikeHeader) {
        description += (description ? ' ' : '') + nextTrimmed;
        i++;
      } else {
        break;
      }
    }

    dishes.push({ name, price, description });
  }

  return dishes;
}
