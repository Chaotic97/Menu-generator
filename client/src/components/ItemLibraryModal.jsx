import { useState, useEffect, useCallback } from 'react';
import { listAllDishLibrary, searchDishLibrary, deleteDishFromLibrary } from '../api/menus.js';

export default function ItemLibraryModal({ onClose }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAllDishLibrary();
      setItems(data);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSearch = useCallback(async (q) => {
    setSearch(q);
    if (q.trim().length < 2) {
      loadAll();
      return;
    }
    try {
      const data = await searchDishLibrary(q.trim());
      setItems(data);
    } catch {
      setItems([]);
    }
  }, [loadAll]);

  const handleDelete = async (id) => {
    try {
      await deleteDishFromLibrary(id);
      setItems((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Item Library</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            autoFocus
          />
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">
                {search ? 'No matches found' : 'No items in library yet'}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Import items from a file or add them while editing a menu
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </span>
                      {item.price && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {item.price}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity min-h-[32px] min-w-[32px] flex items-center justify-center flex-shrink-0"
                    title="Remove from library"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
