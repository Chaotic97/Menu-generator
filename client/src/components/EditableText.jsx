import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AutocompleteDropdown from './AutocompleteDropdown.jsx';

/**
 * Renders text as a span/div. On click, switches to an input for inline editing.
 * Commits on blur/Enter, reverts on Escape.
 *
 * IMPORTANT: This component always renders the SAME outer element (Tag) regardless
 * of editing state. This is critical for flex layout stability — the Tag is always
 * the flex child, and the input inside inherits text styles via CSS inheritance.
 * Never wrap the input in an extra element or return a fragment.
 *
 * Props:
 *  - value: string
 *  - onChange: (newValue) => void
 *  - style: inline style object (layout + text styles)
 *  - tag: 'span' | 'div' | 'h1' (outer element in ALL states)
 *  - disabled: boolean (for export mode)
 *  - suggestions: optional array of {id, name, price, description}
 *  - onSelectSuggestion: optional callback (suggestion) => void
 */
export default function EditableText({
  value,
  onChange,
  style = {},
  tag = 'span',
  disabled = false,
  suggestions,
  onSelectSuggestion,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [showDropdown, setShowDropdown] = useState(true);
  const inputRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlightIndex(0);
    setShowDropdown(true);
  }, [suggestions]);

  // Update dropdown position when editing
  useEffect(() => {
    if (editing && inputRef.current && suggestions && suggestions.length > 0 && showDropdown) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 2,
        left: rect.left,
        width: Math.max(rect.width, 200),
      });
    }
  }, [editing, suggestions, showDropdown]);

  const activeSuggestions = editing && showDropdown && suggestions && suggestions.length > 0
    ? suggestions
    : [];

  const commit = () => {
    setEditing(false);
    setShowDropdown(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onChange(trimmed);
    } else {
      setDraft(value);
    }
  };

  const revert = () => {
    if (activeSuggestions.length > 0) {
      setShowDropdown(false);
      return;
    }
    setEditing(false);
    setDraft(value);
  };

  const handleSelectSuggestion = (suggestion) => {
    setEditing(false);
    setShowDropdown(false);
    setDraft(suggestion.name);
    if (onSelectSuggestion) {
      onSelectSuggestion(suggestion);
    } else {
      onChange(suggestion.name);
    }
  };

  // ── Disabled (export) mode: plain element, no interactivity ──
  if (disabled) {
    const Tag = tag;
    return <Tag style={style}>{value}</Tag>;
  }

  const Tag = tag;

  // ── Editing mode ──────────────────────────────────────────────
  // The SAME Tag is always the outer element (the flex child).
  // The input inherits text styles from the Tag via CSS inheritance.
  // Layout/flex styles (maxWidth, flexShrink, etc.) stay on the Tag.
  if (editing) {
    // Build container style: keep all layout/text styles but strip
    // properties that would clip the input or its edit highlight.
    const editContainerStyle = { ...style };
    // Overflow/clamping would clip the input's box-shadow highlight
    delete editContainerStyle.overflow;
    delete editContainerStyle.textOverflow;
    delete editContainerStyle.whiteSpace;
    delete editContainerStyle.WebkitLineClamp;
    delete editContainerStyle.WebkitBoxOrient;
    // Force block display so the Tag always has a width for the input.
    // In flex: block is overridden by flex blockification — no-op.
    // In non-flex (e.g. section header span inside a div): ensures
    // the Tag takes width so `width: 100%` on the input works.
    if (!editContainerStyle.display || editContainerStyle.display === '-webkit-box') {
      editContainerStyle.display = 'block';
    }

    const dropdown = activeSuggestions.length > 0 && dropdownPos
      ? createPortal(
          <AutocompleteDropdown
            suggestions={activeSuggestions}
            highlightIndex={highlightIndex}
            onSelect={handleSelectSuggestion}
            style={{
              position: 'fixed',
              top: `${dropdownPos.top}px`,
              left: `${dropdownPos.left}px`,
              width: `${dropdownPos.width}px`,
            }}
          />,
          document.body
        )
      : null;

    return (
      <Tag style={editContainerStyle}>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setShowDropdown(true);
          }}
          onBlur={commit}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (activeSuggestions.length > 0) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIndex((prev) => Math.min(prev + 1, activeSuggestions.length - 1));
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIndex((prev) => Math.max(prev - 1, 0));
                return;
              }
              if (e.key === 'Tab') {
                e.preventDefault();
                handleSelectSuggestion(activeSuggestions[highlightIndex]);
                return;
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSelectSuggestion(activeSuggestions[highlightIndex]);
                return;
              }
            } else {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
                return;
              }
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              revert();
            }
          }}
          style={{
            // Inherit ALL text styles from the container Tag via CSS.
            // This avoids duplicating style props and ensures the input
            // always matches the surrounding template typography.
            font: 'inherit',
            color: 'inherit',
            letterSpacing: 'inherit',
            textTransform: 'inherit',
            textAlign: 'inherit',
            // Reset input browser chrome
            background: 'transparent',
            border: 'none',
            outline: 'none',
            // Fill the container Tag — layout is controlled by the Tag's
            // flex/maxWidth/flexShrink, not by the input itself.
            width: '100%',
            boxSizing: 'border-box',
            padding: '1px 3px',
            margin: '-1px -3px',
            // Edit highlight
            boxShadow: '0 0 0 1.5px rgba(59, 130, 246, 0.5)',
            borderRadius: '2px',
          }}
        />
        {dropdown}
      </Tag>
    );
  }

  // ── Display mode ──────────────────────────────────────────────
  return (
    <Tag
      style={{
        ...style,
        cursor: 'text',
        borderRadius: '2px',
        transition: 'box-shadow 0.15s',
      }}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      onPointerEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 0 0 1.5px rgba(59, 130, 246, 0.25)';
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {value || '\u00A0'}
    </Tag>
  );
}
