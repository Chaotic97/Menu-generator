import { useEffect, useRef } from 'react';

export default function AutocompleteDropdown({
  suggestions,
  highlightIndex,
  onSelect,
  style,
}) {
  const listRef = useRef(null);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && highlightIndex >= 0) {
      const items = listRef.current.children;
      if (items[highlightIndex]) {
        items[highlightIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div
      ref={listRef}
      style={{
        position: 'absolute',
        zIndex: 9999,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        maxHeight: '200px',
        overflowY: 'auto',
        width: '100%',
        minWidth: '200px',
        ...style,
      }}
    >
      {suggestions.map((s, i) => (
        <div
          key={s.id}
          onPointerDown={(e) => {
            e.preventDefault();
            onSelect(s);
          }}
          style={{
            padding: '10px 12px',
            cursor: 'pointer',
            background: i === highlightIndex ? '#f3f4f6' : 'transparent',
            borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
            minHeight: '44px',
            boxSizing: 'border-box',
          }}
          onPointerEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
          }}
          onPointerLeave={(e) => {
            e.currentTarget.style.background = i === highlightIndex ? '#f3f4f6' : 'transparent';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '13px', color: '#111827', fontWeight: 500 }}>
              {s.name}
            </span>
            {s.price && s.price !== '0' && (
              <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px', flexShrink: 0 }}>
                {s.price}
              </span>
            )}
          </div>
          {s.description && (
            <div style={{
              fontSize: '11px',
              color: '#9ca3af',
              marginTop: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {s.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
