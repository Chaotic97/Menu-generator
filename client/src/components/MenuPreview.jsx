import { useRef, useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import EditableText from './EditableText.jsx';

// ── Utilities ──────────────────────────────────────────────

function formatPrice(raw) {
  if (!raw || raw === '0') return '';
  const upper = raw.toString().toUpperCase().trim();
  if (upper === 'MP') return 'M.P.';
  if (upper === 'AQ') return 'A.Q.';
  return raw;
}

function balanceColumns(sections, spacing) {
  const estimateHeight = (dishes) =>
    60 + dishes.length * (spacing.dishGap + 40);
  const col1 = [];
  const col2 = [];
  let h1 = 0;
  let h2 = 0;
  for (const section of sections) {
    const h = estimateHeight(section.dishes || []);
    if (h1 <= h2) { col1.push(section); h1 += h; }
    else { col2.push(section); h2 += h; }
  }
  return [col1, col2];
}

function buildFontUrl(imports) {
  if (!imports || imports.length === 0) return null;
  const families = imports.map((f) => `family=${f}`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

// ── Decorative components (unchanged) ──────────────────────

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
          <div style={{ width: '100%', height: '3px', background: colors.accent, marginBottom: '12px' }} />
        </div>
      );
    case 'simple-line':
      return (
        <div style={baseStyle}>
          <div style={{ width: '60px', height: '1px', background: colors.divider, margin: '0 auto' }} />
        </div>
      );
    case 'neon-bar':
      return (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ width: '30px', height: '4px', background: colors.accent }} />
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
    case 'line-through':
    case 'none':
    default:
      return null;
  }
}

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
        <div style={{ width: '40px', height: '40px', background: colors.accent, margin: '0 auto 16px' }} />
      );
    case 'underline':
      return null;
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

function DotLeader({ config, colors }) {
  if (!config.dotLeader || !config.dotChar || config.dotChar === ' ') {
    return <div style={{ flex: 1, minWidth: '20px' }} />;
  }
  return (
    <div
      style={{
        flex: 1, minWidth: '20px', overflow: 'hidden', whiteSpace: 'nowrap',
        color: config.dotColor || colors.divider, fontSize: '12px',
        lineHeight: '1', paddingTop: '4px', margin: '0 6px',
      }}
    >
      {config.dotChar.repeat(200)}
    </div>
  );
}

// ── Drag handle icon ───────────────────────────────────────

function DragHandleIcon({ color }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block' }}>
      <circle cx="4" cy="2.5" r="1.2" fill={color} />
      <circle cx="8" cy="2.5" r="1.2" fill={color} />
      <circle cx="4" cy="6" r="1.2" fill={color} />
      <circle cx="8" cy="6" r="1.2" fill={color} />
      <circle cx="4" cy="9.5" r="1.2" fill={color} />
      <circle cx="8" cy="9.5" r="1.2" fill={color} />
    </svg>
  );
}

// ── Sortable dish row ──────────────────────────────────────

function SortableDishRow({ dish, template, interactive, onFieldEdit, sectionId }) {
  const { colors, fonts, sizes, spacing, typography, layout } = template;
  const price = formatPrice(dish.price);
  const priceColor = colors.priceColor || colors.accent;
  const dishId = `dish-${dish.id}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dishId,
    data: { type: 'dish', dish, sectionId },
    disabled: !interactive,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    marginBottom: `${spacing.dishGap}px`,
    position: 'relative',
  };

  const handleText = interactive
    ? (field) => (newVal) => onFieldEdit('dish', dish.id, field, newVal, sectionId)
    : () => () => {};

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        {/* Drag handle — only visible on hover */}
        {interactive && (
          <div
            {...listeners}
            style={{
              position: 'absolute',
              left: '-22px',
              top: '2px',
              cursor: 'grab',
              opacity: 0,
              transition: 'opacity 0.15s',
              padding: '2px',
              zIndex: 2,
            }}
            className="drag-handle"
          >
            <DragHandleIcon color={colors.muted || '#999'} />
          </div>
        )}

        <EditableText
          value={dish.name}
          onChange={handleText('name')}
          disabled={!interactive}
          tag="span"
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
        />

        <DotLeader config={layout} colors={colors} />

        {price && (
          <EditableText
            value={dish.price}
            onChange={handleText('price')}
            disabled={!interactive}
            tag="span"
            style={{
              fontFamily: fonts.price,
              fontSize: `${sizes.price}px`,
              color: priceColor,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              textAlign: 'right',
              minWidth: '40px',
            }}
          />
        )}
        {!price && interactive && (
          <EditableText
            value=""
            onChange={handleText('price')}
            disabled={false}
            tag="span"
            style={{
              fontFamily: fonts.price,
              fontSize: `${sizes.price}px`,
              color: priceColor,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              textAlign: 'right',
              minWidth: '40px',
              opacity: 0.4,
            }}
          />
        )}
      </div>

      {/* Description */}
      {(dish.description || interactive) && (
        <EditableText
          value={dish.description || ''}
          onChange={handleText('description')}
          disabled={!interactive}
          tag="div"
          style={{
            fontFamily: fonts.body,
            fontSize: `${sizes.desc}px`,
            color: colors.muted,
            fontStyle: typography.descStyle || 'normal',
            marginTop: `${spacing.descTop}px`,
            display: dish.description ? '-webkit-box' : 'block',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: '1.5',
          }}
        />
      )}
    </div>
  );
}

// Static dish row for drag overlay and export mode
function StaticDishRow({ dish, template }) {
  const { colors, fonts, sizes, spacing, typography, layout } = template;
  const price = formatPrice(dish.price);
  const priceColor = colors.priceColor || colors.accent;

  return (
    <div style={{ marginBottom: `${spacing.dishGap}px` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
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

// ── Sortable section block ─────────────────────────────────

function SortableSectionBlock({ section, template, interactive, isFirst, onFieldEdit }) {
  const { colors, fonts, sizes, spacing, typography, layout } = template;
  const sectionAlignment = layout.sectionAlignment || 'center';
  const isLeftAccent = layout.dividerStyle === 'left-accent';
  const isLineThrough = layout.dividerStyle === 'line-through';

  const sectionId = `section-${section.id}`;
  const dishIds = (section.dishes || [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((d) => `dish-${d.id}`);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sectionId,
    data: { type: 'section', section },
    disabled: !interactive,
  });

  const wrapperStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    marginBottom: `${spacing.sectionGap}px`,
    position: 'relative',
  };

  // Hide empty sections in export mode
  if (!interactive && (!section.dishes || section.dishes.length === 0)) return null;

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

  if (isLeftAccent) {
    sectionHeaderStyle.borderLeft = `4px solid ${colors.accent}`;
    sectionHeaderStyle.paddingLeft = '12px';
    sectionHeaderStyle.textAlign = 'left';
  }

  const handleSectionNameEdit = interactive
    ? (newVal) => onFieldEdit('section', section.id, 'name', newVal)
    : () => {};

  const renderSectionHeader = () => {
    const nameElement = (
      <EditableText
        value={section.name}
        onChange={handleSectionNameEdit}
        disabled={!interactive}
        tag="span"
        style={isLineThrough ? sectionHeaderStyle : sectionHeaderStyle}
      />
    );

    // Attach dnd-kit listeners directly to the section header wrapper
    // so users can drag from the text itself (click = edit, drag = reorder)
    const dragProps = interactive ? { ...listeners, style: { cursor: 'grab' } } : {};

    if (isLineThrough) {
      return (
        <div {...dragProps} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', position: 'relative', ...(interactive ? { cursor: 'grab' } : {}) }}>
          <div style={{ flex: 1, height: '1px', background: colors.divider }} />
          {nameElement}
          <div style={{ flex: 1, height: '1px', background: colors.divider }} />
        </div>
      );
    }

    return (
      <div>
        {!isFirst && !isLeftAccent && (
          <SectionDivider style={layout.dividerStyle} colors={colors} sectionAlignment={sectionAlignment} />
        )}
        <div {...dragProps} style={{ ...sectionHeaderStyle, ...(interactive ? { cursor: 'grab' } : {}) }}>{nameElement}</div>
      </div>
    );
  };

  const sortedDishes = (section.dishes || []).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div ref={setNodeRef} style={wrapperStyle} {...attributes}>
      {renderSectionHeader()}
      <SortableContext items={dishIds} strategy={verticalListSortingStrategy}>
        <div>
          {sortedDishes.map((dish) => (
            <SortableDishRow
              key={dish.id}
              dish={dish}
              template={template}
              interactive={interactive}
              onFieldEdit={onFieldEdit}
              sectionId={section.id}
            />
          ))}
        </div>
      </SortableContext>
      {/* Empty section hint */}
      {interactive && sortedDishes.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          fontFamily: fonts.body,
          fontSize: `${sizes.desc}px`,
          color: colors.muted,
          opacity: 0.5,
          fontStyle: 'italic',
        }}>
          Drop dishes here
        </div>
      )}
    </div>
  );
}

// Static section for drag overlay
function StaticSectionBlock({ section, template, isFirst }) {
  const { colors, fonts, sizes, spacing, typography, layout } = template;
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
  if (isLeftAccent) {
    sectionHeaderStyle.borderLeft = `4px solid ${colors.accent}`;
    sectionHeaderStyle.paddingLeft = '12px';
    sectionHeaderStyle.textAlign = 'left';
  }

  return (
    <div style={{ marginBottom: `${spacing.sectionGap}px` }}>
      {isLineThrough ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: '1px', background: colors.divider }} />
          <span style={sectionHeaderStyle}>{section.name}</span>
          <div style={{ flex: 1, height: '1px', background: colors.divider }} />
        </div>
      ) : (
        <div>
          {!isFirst && !isLeftAccent && (
            <SectionDivider style={layout.dividerStyle} colors={colors} sectionAlignment={sectionAlignment} />
          )}
          <div style={sectionHeaderStyle}>{section.name}</div>
        </div>
      )}
      <div>
        {(section.dishes || [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((dish) => (
            <StaticDishRow key={dish.id} dish={dish} template={template} />
          ))}
      </div>
    </div>
  );
}

// ── Hover styles injection ─────────────────────────────────

const hoverStylesId = 'menupreview-hover-styles';
function ensureHoverStyles() {
  if (document.getElementById(hoverStylesId)) return;
  const sheet = document.createElement('style');
  sheet.id = hoverStylesId;
  sheet.textContent = `
    [data-interactive="true"] .drag-handle { opacity: 0 !important; }
    [data-interactive="true"] > div:hover > .drag-handle,
    [data-interactive="true"] div[style]:hover > div > .drag-handle,
    [data-interactive="true"] div:hover > .drag-handle {
      opacity: 0.6 !important;
    }
    [data-interactive="true"] .drag-handle:hover {
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(sheet);
}

// ── Custom collision detection for cross-section moves ─────

function customCollisionDetection(args) {
  // First try pointer-within for precise targeting
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  // Fallback to rect intersection
  return rectIntersection(args);
}

// ── Main MenuPreview component ─────────────────────────────

export default function MenuPreview({
  menu,
  template,
  mode = 'edit',
  onSectionsChange,
  onFieldEdit,
}) {
  const titleRef = useRef();
  const [titleScale, setTitleScale] = useState(1);
  const [activeDrag, setActiveDrag] = useState(null);
  const fontUrl = buildFontUrl(template.fonts.imports);

  const { colors, fonts, sizes, spacing, typography, layout } = template;
  const isTwoCol = menu.layout === 'two-col';
  const menuWidth = isTwoCol ? 660 : 500;
  const interactive = mode === 'edit' && !!onSectionsChange;

  // Inject hover styles for drag handles
  useEffect(() => {
    if (interactive) ensureHoverStyles();
  }, [interactive]);

  // Drag sensors — activation distance prevents accidental drags while clicking to edit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Title auto-scaling
  useEffect(() => {
    if (titleRef.current) {
      const lineHeight = parseFloat(getComputedStyle(titleRef.current).lineHeight);
      const height = titleRef.current.scrollHeight;
      if (height > lineHeight * 2.2) setTitleScale(0.75);
      else setTitleScale(1);
    }
  }, [menu.name, menu.restaurant_name, template]);

  // All sections sorted
  const allSections = (menu.sections || []).sort((a, b) => a.sort_order - b.sort_order);

  // For export mode, filter empty
  const visibleSections = interactive
    ? allSections
    : allSections.filter((s) => s.dishes && s.dishes.length > 0);

  // Section IDs for sortable context
  const sectionIds = allSections.map((s) => `section-${s.id}`);

  // Build columns for two-col layout
  const displaySections = visibleSections.filter((s) => s.dishes && s.dishes.length > 0);
  const [col1, col2] = isTwoCol ? balanceColumns(displaySections, spacing) : [displaySections, []];

  // ── DnD handlers ───────────────────────────────────────

  const findDishAndSection = (dragId) => {
    const dishId = parseInt(dragId.replace('dish-', ''), 10);
    for (const section of allSections) {
      const idx = (section.dishes || []).findIndex((d) => d.id === dishId);
      if (idx !== -1) return { section, dishIndex: idx, dish: section.dishes[idx] };
    }
    return null;
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const data = active.data.current;
    setActiveDrag(data);
  };

  const handleDragEnd = (event) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData.type === 'section' && overData?.type === 'section') {
      // Reorder sections
      const oldIndex = allSections.findIndex((s) => s.id === activeData.section.id);
      const newIndex = allSections.findIndex((s) => s.id === overData.section.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove([...allSections], oldIndex, newIndex)
        .map((s, i) => ({ ...s, sort_order: i }));
      onSectionsChange(reordered);
      return;
    }

    if (activeData.type === 'dish') {
      const activeDishId = parseInt(active.id.replace('dish-', ''), 10);

      // Determine target section and position
      let targetSectionId;
      let overDishId;

      if (overData?.type === 'dish') {
        overDishId = parseInt(over.id.replace('dish-', ''), 10);
        targetSectionId = overData.sectionId;
      } else if (overData?.type === 'section') {
        targetSectionId = overData.section.id;
      } else {
        return;
      }

      const sourceInfo = findDishAndSection(active.id);
      if (!sourceInfo) return;

      const sourceSectionId = sourceInfo.section.id;

      // Deep clone sections
      const newSections = allSections.map((s) => ({
        ...s,
        dishes: (s.dishes || []).map((d) => ({ ...d })),
      }));

      if (sourceSectionId === targetSectionId) {
        // Same section reorder
        const sec = newSections.find((s) => s.id === sourceSectionId);
        const sorted = sec.dishes.sort((a, b) => a.sort_order - b.sort_order);
        const oldIdx = sorted.findIndex((d) => d.id === activeDishId);
        const newIdx = overDishId !== undefined
          ? sorted.findIndex((d) => d.id === overDishId)
          : sorted.length;
        if (oldIdx === -1 || oldIdx === newIdx) return;
        sec.dishes = arrayMove(sorted, oldIdx, newIdx).map((d, i) => ({ ...d, sort_order: i }));
      } else {
        // Cross-section move
        const srcSec = newSections.find((s) => s.id === sourceSectionId);
        const dstSec = newSections.find((s) => s.id === targetSectionId);
        const dish = srcSec.dishes.find((d) => d.id === activeDishId);
        if (!dish) return;

        srcSec.dishes = srcSec.dishes
          .filter((d) => d.id !== activeDishId)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((d, i) => ({ ...d, sort_order: i }));

        const dstSorted = dstSec.dishes.sort((a, b) => a.sort_order - b.sort_order);
        const insertIdx = overDishId !== undefined
          ? dstSorted.findIndex((d) => d.id === overDishId)
          : dstSorted.length;
        const insertAt = insertIdx === -1 ? dstSorted.length : insertIdx;
        dstSorted.splice(insertAt, 0, { ...dish });
        dstSec.dishes = dstSorted.map((d, i) => ({ ...d, sort_order: i }));
      }

      onSectionsChange(newSections);
    }
  };

  const handleDragCancel = () => {
    setActiveDrag(null);
  };

  // ── Title style ────────────────────────────────────────

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

  if (layout.headerDecor === 'underline') {
    titleStyle.borderBottom = `3px solid ${colors.accent}`;
    titleStyle.paddingBottom = '10px';
    titleStyle.display = 'inline-block';
  }

  // ── Render column helper ───────────────────────────────

  const renderColumn = (sections) =>
    sections.map((section, i) =>
      interactive ? (
        <SortableSectionBlock
          key={section.id}
          section={section}
          template={template}
          interactive={interactive}
          isFirst={i === 0}
          onFieldEdit={onFieldEdit}
        />
      ) : (
        <StaticSectionBlock
          key={section.id || i}
          section={section}
          template={template}
          isFirst={i === 0}
        />
      )
    );

  // ── Drag overlay content ───────────────────────────────

  const renderDragOverlay = () => {
    if (!activeDrag) return null;
    if (activeDrag.type === 'dish') {
      return (
        <div style={{
          background: colors.bg,
          padding: '8px 12px',
          borderRadius: '4px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          transform: 'scale(1.03)',
          opacity: 0.95,
        }}>
          <StaticDishRow dish={activeDrag.dish} template={template} />
        </div>
      );
    }
    if (activeDrag.type === 'section') {
      return (
        <div style={{
          background: colors.bg,
          padding: '12px 16px',
          borderRadius: '4px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          transform: 'scale(1.02)',
          opacity: 0.95,
          maxWidth: `${menuWidth}px`,
        }}>
          <StaticSectionBlock
            section={activeDrag.section}
            template={template}
            isFirst={true}
          />
        </div>
      );
    }
    return null;
  };

  const borderInsetPx = layout.borderInset || 0;

  // ── Render body ────────────────────────────────────────

  const bodyContent = (
    <>
      {fontUrl && <link rel="stylesheet" href={fontUrl} />}

      <div
        data-interactive={interactive ? 'true' : undefined}
        style={{
          width: `${menuWidth}px`,
          background: colors.bg,
          border: layout.outerBorder !== 'none' ? layout.outerBorder : undefined,
          position: 'relative',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            border: layout.border !== 'none' ? layout.border : undefined,
            margin: borderInsetPx ? `${borderInsetPx}px` : undefined,
            padding: `${spacing.pagePadding}px`,
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: `${spacing.headerBottom}px` }}>
            {template.logo && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <div style={{
                  width: `${template.logo.width || 80}px`,
                  height: `${template.logo.height || 80}px`,
                  border: `1.5px dashed ${colors.muted}`,
                  borderRadius: template.logo.shape === 'circle' ? '50%' : '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  opacity: 0.5,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span style={{
                    fontFamily: fonts.body,
                    fontSize: '8px',
                    color: colors.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                  }}>Logo</span>
                </div>
              </div>
            )}
            <HeaderDecor style={layout.headerDecor} colors={colors} />

            {interactive ? (
              <h1 ref={titleRef} style={{ ...titleStyle, margin: 0 }}>
                <EditableText
                  value={menu.restaurant_name || menu.name}
                  onChange={(val) => onFieldEdit('menu', null, 'restaurant_name', val)}
                  disabled={false}
                  tag="span"
                  style={titleStyle}
                />
              </h1>
            ) : (
              <h1 ref={titleRef} style={titleStyle}>
                {menu.restaurant_name || menu.name}
              </h1>
            )}

            {layout.headerDecor === 'double-rule' && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ height: '1px', background: colors.divider }} />
                <div style={{ height: '2px', background: colors.accent, marginTop: '4px' }} />
              </div>
            )}

            {layout.headerDecor === 'single-rule' && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ height: '1px', background: colors.accent, opacity: 0.4, maxWidth: '200px', margin: '0 auto' }} />
              </div>
            )}

            {layout.headerDecor === 'dots-and-rule' && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ height: '1px', background: colors.accent, opacity: 0.3, maxWidth: '180px', margin: '0 auto' }} />
              </div>
            )}

            {interactive ? (
              <div style={{
                fontFamily: fonts.body,
                fontSize: `${sizes.subtitle}px`,
                color: colors.muted,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginTop: '10px',
              }}>
                <EditableText
                  value={menu.subtitle || ''}
                  onChange={(val) => onFieldEdit('menu', null, 'subtitle', val)}
                  disabled={false}
                  tag="span"
                  style={{
                    fontFamily: fonts.body,
                    fontSize: `${sizes.subtitle}px`,
                    color: colors.muted,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                  }}
                />
              </div>
            ) : (
              menu.subtitle && (
                <div style={{
                  fontFamily: fonts.body,
                  fontSize: `${sizes.subtitle}px`,
                  color: colors.muted,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  marginTop: '10px',
                }}>
                  {menu.subtitle}
                </div>
              )
            )}
          </div>

          {/* Body */}
          {displaySections.length === 0 && !interactive ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              fontFamily: fonts.body, fontSize: `${sizes.dish}px`, color: colors.muted,
            }}>
              Add your first section to get started
            </div>
          ) : isTwoCol ? (
            <div style={{ display: 'flex', gap: '30px' }}>
              <div style={{ flex: 1 }}>{renderColumn(col1)}</div>
              <div style={{ width: '1px', background: colors.divider, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>{renderColumn(col2)}</div>
            </div>
          ) : (
            <div>{renderColumn(interactive ? allSections : visibleSections)}</div>
          )}
        </div>
      </div>
    </>
  );

  // Wrap in DndContext only for interactive mode
  if (interactive) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
          {bodyContent}
        </SortableContext>
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {renderDragOverlay()}
        </DragOverlay>
      </DndContext>
    );
  }

  return bodyContent;
}
