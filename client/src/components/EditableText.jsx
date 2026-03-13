import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AutocompleteDropdown from './AutocompleteDropdown.jsx';

/**
 * Renders text as a span. On click, switches to an input for inline editing.
 * Commits on blur/Enter, reverts on Escape.
 *
 * Props:
 *  - value: string
 *  - onChange: (newValue) => void
 *  - style: inline style object for both display and input
 *  - tag: 'span' | 'div' | 'h1' (what to render in display mode)
 *  - inputType: 'text' | 'textarea' (default 'text')
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
  const wrapperRef = useRef(null);
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

  if (disabled) {
    const Tag = tag;
    return <Tag style={style}>{value}</Tag>;
  }

  if (editing) {
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
      <span ref={wrapperRef} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
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
            ...style,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            boxShadow: '0 0 0 1.5px rgba(59, 130, 246, 0.5)',
            borderRadius: '2px',
            padding: '1px 3px',
            margin: '-1px -3px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
        {dropdown}
      </span>
    );
  }

  const Tag = tag;
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
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 0 0 1.5px rgba(59, 130, 246, 0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {value || '\u00A0'}
    </Tag>
  );
}
