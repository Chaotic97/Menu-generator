import { useRef, useEffect, useState } from 'react';

// Price format normalization
function formatPrice(raw) {
  if (!raw || raw === '0') return '';
  const upper = raw.toString().toUpperCase().trim();
  if (upper === 'MP') return 'M.P.';
  if (upper === 'AQ') return 'A.Q.';
  return raw;
}

// Column balancing for two-column layout
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

// Google Fonts URL builder
function buildFontUrl(imports) {
  if (!imports || imports.length === 0) return null;
  const families = imports.map((f) => `family=${f}`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

// Divider component — renders different styles based on template config
function SectionDivider({ style, colors, sectionAlignment }) {
  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: sectionAlignment === 'left' ? 'flex-start' : 'center',
    gap: '12px',
    marginBottom: '12px',
  };

  switch (style) {
    case 'ornamental-line':
      return (
        <div style={baseStyle}>
          <div style={{ flex: 1, height: '1px', background: colors.divider }} />
          <span style={{ color: colors.accent, fontSize: '10px', lineHeight: 1 }}>✦</span>
          <div style={{ flex: 1, height: '1px', background: colors.divider }} />
        </div>
      );

    case 'thick-rule':
      return (
        <div style={{ ...baseStyle, gap: 0 }}>
          <div
            style={{
              width: '100%',
              height: '3px',
              background: colors.accent,
              marginBottom: '12px',
            }}
          />
        </div>
      );

    case 'simple-line':
      return (
        <div style={baseStyle}>
          <div
            style={{
              width: '60px',
              height: '1px',
              background: colors.divider,
              margin: '0 auto',
            }}
          />
        </div>
      );

    case 'neon-bar':
      return (
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              width: '30px',
              height: '4px',
              background: colors.accent,
            }}
          />
        </div>
      );

    case 'circle-line':
      return (
        <div style={baseStyle}>
          <div style={{ flex: 1, height: '1px', background: colors.divider }} />
          <span style={{ color: colors.muted, fontSize: '8px', lineHeight: 1 }}>○</span>
          <div style={{ flex: 1, height: '1px', background: colors.divider }} />
        </div>
      );

    case 'left-accent':
      return null; // Handled by section header styling

    case 'line-through':
      return null; // Handled by section header styling

    case 'none':
    default:
      return null;
  }
}

// Header decoration component
function HeaderDecor({ style, colors }) {
  switch (style) {
    case 'double-rule':
      return (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ height: '2px', background: colors.accent, marginBottom: '4px' }} />
          <div style={{ height: '1px', background: colors.divider }} />
        </div>
      );

    case 'single-rule':
      return (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ height: '1px', background: colors.accent, opacity: 0.4 }} />
        </div>
      );

    case 'block-accent':
      return (
        <div
          style={{
            width: '40px',
            height: '40px',
            background: colors.accent,
            margin: '0 auto 16px',
          }}
        />
      );

    case 'underline':
      return null; // Applied directly to title

    case 'top-rule':
      return (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ height: '6px', background: colors.text }} />
        </div>
      );

    case 'dots-and-rule':
      return (
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ color: colors.accent, fontSize: '10px', letterSpacing: '8px', marginBottom: '8px' }}>
            · · ·
          </div>
        </div>
      );

    case 'ornament-row':
      return (
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <span style={{ color: colors.accent, fontSize: '12px', letterSpacing: '12px' }}>
            ✦ ✦ ✦
          </span>
        </div>
      );

    case 'none':
    default:
      return null;
  }
}

// Dot leader between dish name and price
function DotLeader({ config, colors }) {
  if (!config.dotLeader || !config.dotChar || config.dotChar === ' ') {
    return <div style={{ flex: 1, minWidth: '20px' }} />;
  }

  return (
    <div
      style={{
        flex: 1,
        minWidth: '20px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        color: config.dotColor || colors.divider,
        fontSize: '12px',
        lineHeight: '1',
        paddingTop: '4px',
        margin: '0 6px',
      }}
    >
      {config.dotChar.repeat(200)}
    </div>
  );
}

// Single dish row
function DishRow({ dish, template, mode }) {
  const { colors, fonts, sizes, spacing, typography, layout } = template;
  const price = formatPrice(dish.price);
  const priceColor = colors.priceColor || colors.accent;

  return (
    <div style={{ marginBottom: `${spacing.dishGap}px` }}>
      {/* Name + price row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px',
        }}
      >
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: `${sizes.dish}px`,
            fontWeight: typography.dishWeight,
            color: colors.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flexShrink: 1,
            maxWidth: '70%',
          }}
        >
          {dish.name}
        </span>

        <DotLeader config={layout} colors={colors} />

        {price && (
          <span
            style={{
              fontFamily: fonts.price,
              fontSize: `${sizes.price}px`,
              color: priceColor,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              textAlign: 'right',
              minWidth: '40px',
            }}
          >
            {price}
          </span>
        )}
      </div>

      {/* Description */}
      {dish.description && (
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: `${sizes.desc}px`,
            color: colors.muted,
            fontStyle: typography.descStyle || 'normal',
            marginTop: `${spacing.descTop}px`,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: '1.5',
          }}
        >
          {dish.description}
        </div>
      )}
    </div>
  );
}

// Section block
function SectionBlock({ section, template, mode, isFirst }) {
  const { colors, fonts, sizes, spacing, typography, layout } = template;

  // Hide empty sections in preview
  if (!section.dishes || section.dishes.length === 0) return null;

  const sectionAlignment = layout.sectionAlignment || 'center';
  const isLeftAccent = layout.dividerStyle === 'left-accent';
  const isLineThrough = layout.dividerStyle === 'line-through';

  const sectionHeaderStyle = {
    fontFamily: fonts.heading,
    fontSize: `${sizes.section}px`,
    fontWeight: typography.sectionWeight,
    letterSpacing: typography.sectionLetterSpacing,
    textTransform: typography.sectionTransform,
    color: colors.heading || colors.accent,
    textAlign: sectionAlignment,
    marginBottom: '16px',
  };

  // Left accent style (Wok & Fire)
  if (isLeftAccent) {
    sectionHeaderStyle.borderLeft = `4px solid ${colors.accent}`;
    sectionHeaderStyle.paddingLeft = '12px';
    sectionHeaderStyle.textAlign = 'left';
  }

  // Line-through style (Porcelain)
  const renderSectionHeader = () => {
    if (isLineThrough) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: colors.divider }} />
          <span style={sectionHeaderStyle}>{section.name}</span>
          <div style={{ flex: 1, height: '1px', background: colors.divider }} />
        </div>
      );
    }

    return (
      <div>
        {!isFirst && !isLeftAccent && (
          <SectionDivider
            style={layout.dividerStyle}
            colors={colors}
            sectionAlignment={sectionAlignment}
          />
        )}
        <div style={sectionHeaderStyle}>{section.name}</div>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: `${spacing.sectionGap}px` }}>
      {renderSectionHeader()}
      <div>
        {section.dishes
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((dish) => (
            <DishRow key={dish.id} dish={dish} template={template} mode={mode} />
          ))}
      </div>
    </div>
  );
}

// Main MenuPreview component
export default function MenuPreview({ menu, template, mode = 'edit' }) {
  const titleRef = useRef();
  const [titleScale, setTitleScale] = useState(1);
  const fontUrl = buildFontUrl(template.fonts.imports);

  const { colors, fonts, sizes, spacing, typography, layout } = template;
  const isTwoCol = menu.layout === 'two-col';
  const menuWidth = isTwoCol ? 660 : 500;

  // Title auto-scaling
  useEffect(() => {
    if (titleRef.current) {
      const lineHeight = parseFloat(
        getComputedStyle(titleRef.current).lineHeight
      );
      const height = titleRef.current.scrollHeight;
      if (height > lineHeight * 2.2) setTitleScale(0.75);
      else setTitleScale(1);
    }
  }, [menu.name, menu.restaurant_name, template]);

  // Filter out empty sections
  const visibleSections = (menu.sections || [])
    .filter((s) => s.dishes && s.dishes.length > 0)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Build columns for two-col layout
  const [col1, col2] = isTwoCol
    ? balanceColumns(visibleSections, spacing)
    : [visibleSections, []];

  const titleStyle = {
    fontFamily: fonts.title,
    fontSize: `${sizes.title * titleScale}px`,
    fontWeight: typography.titleWeight,
    letterSpacing: typography.titleLetterSpacing,
    textTransform: typography.titleTransform,
    fontStyle: typography.titleStyle || 'normal',
    color: colors.text,
    textAlign: 'center',
    margin: 0,
    lineHeight: 1.2,
  };

  // Underline header decor (Wok & Fire)
  if (layout.headerDecor === 'underline') {
    titleStyle.borderBottom = `3px solid ${colors.accent}`;
    titleStyle.paddingBottom = '10px';
    titleStyle.display = 'inline-block';
  }

  const renderColumn = (sections) =>
    sections.map((section, i) => (
      <SectionBlock
        key={section.id || i}
        section={section}
        template={template}
        mode={mode}
        isFirst={i === 0}
      />
    ));

  const borderInsetPx = layout.borderInset || 0;

  return (
    <>
      {fontUrl && <link rel="stylesheet" href={fontUrl} />}

      <div
        style={{
          width: `${menuWidth}px`,
          background: colors.bg,
          border: layout.outerBorder !== 'none' ? layout.outerBorder : undefined,
          position: 'relative',
          margin: '0 auto',
        }}
      >
        {/* Inner border with inset */}
        <div
          style={{
            border: layout.border !== 'none' ? layout.border : undefined,
            margin: borderInsetPx ? `${borderInsetPx}px` : undefined,
            padding: `${spacing.pagePadding}px`,
          }}
        >
          {/* Header */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: `${spacing.headerBottom}px`,
            }}
          >
            <HeaderDecor style={layout.headerDecor} colors={colors} />

            <h1 ref={titleRef} style={titleStyle}>
              {menu.restaurant_name || menu.name}
            </h1>

            {layout.headerDecor === 'double-rule' && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ height: '1px', background: colors.divider }} />
                <div
                  style={{
                    height: '2px',
                    background: colors.accent,
                    marginTop: '4px',
                  }}
                />
              </div>
            )}

            {layout.headerDecor === 'single-rule' && (
              <div style={{ marginTop: '6px' }}>
                <div
                  style={{
                    height: '1px',
                    background: colors.accent,
                    opacity: 0.4,
                    maxWidth: '200px',
                    margin: '0 auto',
                  }}
                />
              </div>
            )}

            {layout.headerDecor === 'dots-and-rule' && (
              <div style={{ marginTop: '6px' }}>
                <div
                  style={{
                    height: '1px',
                    background: colors.accent,
                    opacity: 0.3,
                    maxWidth: '180px',
                    margin: '0 auto',
                  }}
                />
              </div>
            )}

            {menu.subtitle && (
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: `${sizes.subtitle}px`,
                  color: colors.muted,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  marginTop: '10px',
                }}
              >
                {menu.subtitle}
              </div>
            )}
          </div>

          {/* Body */}
          {visibleSections.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                fontFamily: fonts.body,
                fontSize: `${sizes.dish}px`,
                color: colors.muted,
              }}
            >
              Add your first section to get started
            </div>
          ) : isTwoCol ? (
            <div style={{ display: 'flex', gap: '30px' }}>
              <div style={{ flex: 1 }}>{renderColumn(col1)}</div>
              <div
                style={{
                  width: '1px',
                  background: colors.divider,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>{renderColumn(col2)}</div>
            </div>
          ) : (
            <div>{renderColumn(visibleSections)}</div>
          )}
        </div>
      </div>
    </>
  );
}
