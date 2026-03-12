import { useState, useRef, useEffect } from 'react';

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
 */
export default function EditableText({
  value,
  onChange,
  style = {},
  tag = 'span',
  disabled = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onChange(trimmed);
    } else {
      setDraft(value);
    }
  };

  const revert = () => {
    setEditing(false);
    setDraft(value);
  };

  if (disabled) {
    const Tag = tag;
    return <Tag style={style}>{value}</Tag>;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
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
