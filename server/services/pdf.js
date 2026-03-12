import puppeteer from 'puppeteer';

let browser = null;

async function getBrowser() {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browser;
}

// Price format normalization (mirrors client)
function formatPrice(raw) {
  if (!raw || raw === '0') return '';
  const upper = raw.toString().toUpperCase().trim();
  if (upper === 'MP') return 'M.P.';
  if (upper === 'AQ') return 'A.Q.';
  return raw;
}

// Column balancing (mirrors client)
function balanceColumns(sections, spacing) {
  const estimateHeight = (dishes) =>
    60 + dishes.length * (spacing.dishGap + 40);
  const col1 = [];
  const col2 = [];
  let h1 = 0;
  let h2 = 0;
  for (const section of sections) {
    const h = estimateHeight(section.dishes || []);
    if (h1 <= h2) {
      col1.push(section);
      h1 += h;
    } else {
      col2.push(section);
      h2 += h;
    }
  }
  return [col1, col2];
}

// Escape HTML
function esc(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Build Google Fonts URL
function buildFontUrl(imports) {
  if (!imports || imports.length === 0) return '';
  const families = imports.map((f) => `family=${f}`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

// Render divider HTML
function renderDivider(style, colors, sectionAlignment) {
  const justify = sectionAlignment === 'left' ? 'flex-start' : 'center';
  const baseStyle = `display:flex;align-items:center;justify-content:${justify};gap:12px;margin-bottom:12px;`;

  switch (style) {
    case 'ornamental-line':
      return `<div style="${baseStyle}">
        <div style="flex:1;height:1px;background:${colors.divider}"></div>
        <span style="color:${colors.accent};font-size:10px;line-height:1">&#10022;</span>
        <div style="flex:1;height:1px;background:${colors.divider}"></div>
      </div>`;

    case 'thick-rule':
      return `<div style="${baseStyle}gap:0;">
        <div style="width:100%;height:3px;background:${colors.accent};margin-bottom:12px"></div>
      </div>`;

    case 'simple-line':
      return `<div style="${baseStyle}">
        <div style="width:60px;height:1px;background:${colors.divider};margin:0 auto"></div>
      </div>`;

    case 'neon-bar':
      return `<div style="margin-bottom:12px">
        <div style="width:30px;height:4px;background:${colors.accent}"></div>
      </div>`;

    case 'circle-line':
      return `<div style="${baseStyle}">
        <div style="flex:1;height:1px;background:${colors.divider}"></div>
        <span style="color:${colors.muted};font-size:8px;line-height:1">&#9675;</span>
        <div style="flex:1;height:1px;background:${colors.divider}"></div>
      </div>`;

    case 'left-accent':
    case 'line-through':
    case 'none':
    default:
      return '';
  }
}

// Render header decoration HTML
function renderHeaderDecor(style, colors) {
  switch (style) {
    case 'double-rule':
      return `<div style="margin-bottom:8px">
        <div style="height:2px;background:${colors.accent};margin-bottom:4px"></div>
        <div style="height:1px;background:${colors.divider}"></div>
      </div>`;

    case 'single-rule':
      return `<div style="margin-bottom:8px">
        <div style="height:1px;background:${colors.accent};opacity:0.4"></div>
      </div>`;

    case 'block-accent':
      return `<div style="width:40px;height:40px;background:${colors.accent};margin:0 auto 16px"></div>`;

    case 'underline':
      return '';

    case 'top-rule':
      return `<div style="margin-bottom:16px">
        <div style="height:6px;background:${colors.text}"></div>
      </div>`;

    case 'dots-and-rule':
      return `<div style="text-align:center;margin-bottom:8px">
        <div style="color:${colors.accent};font-size:10px;letter-spacing:8px;margin-bottom:8px">&middot; &middot; &middot;</div>
      </div>`;

    case 'ornament-row':
      return `<div style="text-align:center;margin-bottom:12px">
        <span style="color:${colors.accent};font-size:12px;letter-spacing:12px">&#10022; &#10022; &#10022;</span>
      </div>`;

    case 'none':
    default:
      return '';
  }
}

// Render post-title header decoration
function renderPostTitleDecor(style, colors) {
  if (style === 'double-rule') {
    return `<div style="margin-top:8px">
      <div style="height:1px;background:${colors.divider}"></div>
      <div style="height:2px;background:${colors.accent};margin-top:4px"></div>
    </div>`;
  }
  if (style === 'single-rule') {
    return `<div style="margin-top:6px">
      <div style="height:1px;background:${colors.accent};opacity:0.4;max-width:200px;margin:0 auto"></div>
    </div>`;
  }
  if (style === 'dots-and-rule') {
    return `<div style="margin-top:6px">
      <div style="height:1px;background:${colors.accent};opacity:0.3;max-width:180px;margin:0 auto"></div>
    </div>`;
  }
  return '';
}

// Render dot leader
function renderDotLeader(layout, colors) {
  if (!layout.dotLeader || !layout.dotChar || layout.dotChar === ' ') {
    return `<div style="flex:1;min-width:20px"></div>`;
  }
  const dotColor = layout.dotColor || colors.divider;
  const dots = layout.dotChar.repeat(200);
  return `<div style="flex:1;min-width:20px;overflow:hidden;white-space:nowrap;color:${dotColor};font-size:12px;line-height:1;padding-top:4px;margin:0 6px">${esc(dots)}</div>`;
}

// Render a single dish row
function renderDish(dish, template) {
  const { colors, fonts, sizes, spacing, typography, layout } = template;
  const price = formatPrice(dish.price);
  const priceColor = colors.priceColor || colors.accent;

  let priceHtml = '';
  if (price) {
    priceHtml = `<span style="font-family:${fonts.price};font-size:${sizes.price}px;color:${priceColor};white-space:nowrap;flex-shrink:0;text-align:right;min-width:40px">${esc(price)}</span>`;
  }

  let descHtml = '';
  if (dish.description) {
    descHtml = `<div style="font-family:${fonts.body};font-size:${sizes.desc}px;color:${colors.muted};font-style:${typography.descStyle || 'normal'};margin-top:${spacing.descTop}px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.5">${esc(dish.description)}</div>`;
  }

  return `<div style="margin-bottom:${spacing.dishGap}px">
    <div style="display:flex;align-items:baseline;gap:4px">
      <span style="font-family:${fonts.body};font-size:${sizes.dish}px;font-weight:${typography.dishWeight};color:${colors.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:1;max-width:70%">${esc(dish.name)}</span>
      ${renderDotLeader(layout, colors)}
      ${priceHtml}
    </div>
    ${descHtml}
  </div>`;
}

// Render a section block
function renderSection(section, template, isFirst) {
  const { colors, fonts, sizes, spacing, typography, layout } = template;

  if (!section.dishes || section.dishes.length === 0) return '';

  const sectionAlignment = layout.sectionAlignment || 'center';
  const isLeftAccent = layout.dividerStyle === 'left-accent';
  const isLineThrough = layout.dividerStyle === 'line-through';

  let headerStyle = `font-family:${fonts.heading};font-size:${sizes.section}px;font-weight:${typography.sectionWeight};letter-spacing:${typography.sectionLetterSpacing};text-transform:${typography.sectionTransform};color:${colors.heading || colors.accent};text-align:${sectionAlignment};margin-bottom:16px;`;

  if (isLeftAccent) {
    headerStyle += `border-left:4px solid ${colors.accent};padding-left:12px;text-align:left;`;
  }

  let headerHtml;
  if (isLineThrough) {
    headerHtml = `<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
      <div style="flex:1;height:1px;background:${colors.divider}"></div>
      <span style="${headerStyle}">${esc(section.name)}</span>
      <div style="flex:1;height:1px;background:${colors.divider}"></div>
    </div>`;
  } else {
    const dividerHtml = (!isFirst && !isLeftAccent)
      ? renderDivider(layout.dividerStyle, colors, sectionAlignment)
      : '';
    headerHtml = `<div>
      ${dividerHtml}
      <div style="${headerStyle}">${esc(section.name)}</div>
    </div>`;
  }

  const sortedDishes = [...(section.dishes || [])].sort((a, b) => a.sort_order - b.sort_order);
  const dishesHtml = sortedDishes.map((d) => renderDish(d, template)).join('');

  return `<div style="margin-bottom:${spacing.sectionGap}px">
    ${headerHtml}
    <div>${dishesHtml}</div>
  </div>`;
}

// Build full HTML page for PDF rendering
function buildHtml(menu, template) {
  const { colors, fonts, sizes, spacing, typography, layout } = template;
  const isTwoCol = menu.layout === 'two-col';
  const menuWidth = isTwoCol ? 660 : 500;
  const fontUrl = buildFontUrl(fonts.imports);

  // Filter and sort visible sections
  const visibleSections = (menu.sections || [])
    .filter((s) => s.dishes && s.dishes.length > 0)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Title style
  let titleStyle = `font-family:${fonts.title};font-size:${sizes.title}px;font-weight:${typography.titleWeight};letter-spacing:${typography.titleLetterSpacing};text-transform:${typography.titleTransform};font-style:${typography.titleStyle || 'normal'};color:${colors.text};text-align:center;margin:0;line-height:1.2;`;

  if (layout.headerDecor === 'underline') {
    titleStyle += `border-bottom:3px solid ${colors.accent};padding-bottom:10px;display:inline-block;`;
  }

  // Subtitle
  const subtitleHtml = menu.subtitle
    ? `<div style="font-family:${fonts.body};font-size:${sizes.subtitle}px;color:${colors.muted};letter-spacing:2px;text-transform:uppercase;margin-top:10px">${esc(menu.subtitle)}</div>`
    : '';

  // Body content
  let bodyHtml;
  if (visibleSections.length === 0) {
    bodyHtml = `<div style="text-align:center;padding:60px 20px;font-family:${fonts.body};font-size:${sizes.dish}px;color:${colors.muted}">No items</div>`;
  } else if (isTwoCol) {
    const [col1, col2] = balanceColumns(visibleSections, spacing);
    const col1Html = col1.map((s, i) => renderSection(s, template, i === 0)).join('');
    const col2Html = col2.map((s, i) => renderSection(s, template, i === 0)).join('');
    bodyHtml = `<div style="display:flex;gap:30px">
      <div style="flex:1">${col1Html}</div>
      <div style="width:1px;background:${colors.divider};flex-shrink:0"></div>
      <div style="flex:1">${col2Html}</div>
    </div>`;
  } else {
    bodyHtml = `<div>${visibleSections.map((s, i) => renderSection(s, template, i === 0)).join('')}</div>`;
  }

  const borderInsetPx = layout.borderInset || 0;
  const outerBorder = layout.outerBorder !== 'none' ? `border:${layout.outerBorder};` : '';
  const innerBorder = layout.border !== 'none' ? `border:${layout.border};` : '';
  const innerMargin = borderInsetPx ? `margin:${borderInsetPx}px;` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${fontUrl ? `<link rel="stylesheet" href="${fontUrl}">` : ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: ${colors.bg}; }
    @page { margin: 0; }
  </style>
</head>
<body>
  <div style="width:${menuWidth}px;background:${colors.bg};${outerBorder}position:relative;margin:0 auto;">
    <div style="${innerBorder}${innerMargin}padding:${spacing.pagePadding}px;">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:${spacing.headerBottom}px;">
        ${renderHeaderDecor(layout.headerDecor, colors)}
        <h1 style="${titleStyle}">${esc(menu.restaurant_name || menu.name)}</h1>
        ${renderPostTitleDecor(layout.headerDecor, colors)}
        ${subtitleHtml}
      </div>
      <!-- Body -->
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
}

// Page size presets (in inches, converted to px at 96dpi for Puppeteer)
const PAGE_SIZES = {
  letter: { width: '8.5in', height: '11in' },
  half: { width: '5.5in', height: '8.5in' },
};

/**
 * Generate a PDF buffer from menu data and template config.
 * @param {object} menu - Full menu object with sections and dishes
 * @param {object} template - Parsed template config (theme_config from DB)
 * @param {object} options - { pageSize: 'letter'|'half', bleed: boolean }
 * @returns {Promise<Buffer>} PDF file buffer
 */
export async function generatePdf(menu, template, options = {}) {
  const { pageSize = 'letter', bleed = false } = options;
  const html = buildHtml(menu, template);

  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });

    // Wait for Google Fonts to finish loading (with timeout)
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Font loading timeout')), 10000)),
    ]);

    const size = PAGE_SIZES[pageSize] || PAGE_SIZES.letter;
    const margin = bleed ? '0' : '0.25in';

    const pdfBuffer = await page.pdf({
      width: size.width,
      height: size.height,
      margin: {
        top: margin,
        right: margin,
        bottom: margin,
        left: margin,
      },
      printBackground: true,
      preferCSSPageSize: false,
      timeout: 30000,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

// Cleanup on process exit
export async function closeBrowser() {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}

process.on('exit', () => {
  if (browser) browser.close().catch(() => {});
});
