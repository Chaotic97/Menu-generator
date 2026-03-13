import { useState, useRef, useCallback } from 'react';
import { importDishLibrary } from '../api/menus.js';

export default function ImportDishesModal({ onClose, onImported, menuSections }) {
  const [activeTab, setActiveTab] = useState('upload');
  const [pasteText, setPasteText] = useState('');
  const [pasteFormat, setPasteFormat] = useState('text');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [addToMenu, setAddToMenu] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && /\.(csv|docx|txt)$/i.test(droppedFile.name)) {
      setFile(droppedFile);
      setError('');
    } else if (droppedFile) {
      setError('Only CSV, DOCX, and TXT files are supported.');
    }
  }, []);

  const handleParse = async () => {
    setLoading(true);
    setError('');
    try {
      let result;
      if (activeTab === 'upload' && file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('preview', 'true');
        result = await importDishLibrary(formData);
      } else if (activeTab === 'paste' && pasteText.trim()) {
        result = await importDishLibrary({
          text: pasteText,
          format: pasteFormat,
          preview: 'true',
        });
      }
      if (result?.dishes && result.dishes.length > 0) {
        setPreview(result.dishes);
        setSelected(new Set(result.dishes.map((_, i) => i)));
      } else {
        setError(
          'No items found. Make sure each line has a name, optionally followed by a price.\n\nExamples:\n  Margherita Pizza $14.95\n  Caesar Salad 12\n  Chef\'s Special M.P.'
        );
      }
    } catch (err) {
      setError('Failed to parse: ' + (err.message || 'Unknown error'));
    }
    setLoading(false);
  };

  const handleImport = async () => {
    if (!preview || selected.size === 0) return;
    setImporting(true);
    setError('');
    try {
      const dishes = preview.filter((_, i) => selected.has(i));

      // Send as JSON array directly — avoids CSV re-encoding issues with commas
      await importDishLibrary({ dishes });

      onImported(dishes, addToMenu);
      onClose();
    } catch (err) {
      setError('Import failed: ' + (err.message || 'Unknown error'));
    }
    setImporting(false);
  };

  const toggleDish = (index) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (!preview) return;
    if (selected.size === preview.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(preview.map((_, i) => i)));
    }
  };

  const updatePreviewDish = (index, field, value) => {
    setPreview((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removePreviewDish = (index) => {
    setPreview((prev) => prev.filter((_, i) => i !== index));
    setSelected((prev) => {
      const next = new Set();
      for (const idx of prev) {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      }
      return next;
    });
    setEditingIdx(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Import Items
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center text-xl"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {!preview ? (
            <>
              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-2 text-sm font-medium min-h-[44px] ${
                    activeTab === 'upload'
                      ? 'text-gray-900 border-b-2 border-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Upload File
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 py-2 text-sm font-medium min-h-[44px] ${
                    activeTab === 'paste'
                      ? 'text-gray-900 border-b-2 border-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Paste Text
                </button>
              </div>

              {activeTab === 'upload' ? (
                <div>
                  {/* Drop zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      dragOver
                        ? 'border-gray-900 bg-gray-50'
                        : file
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.docx,.txt"
                      onChange={(e) => {
                        setFile(e.target.files[0] || null);
                        setError('');
                      }}
                      className="hidden"
                    />
                    {file ? (
                      <div>
                        <div className="text-2xl mb-2">
                          {file.name.endsWith('.csv') ? '📊' : file.name.endsWith('.docx') ? '📄' : '📝'}
                        </div>
                        <p className="text-sm font-medium text-gray-800">{file.name}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {(file.size / 1024).toFixed(1)} KB — Click or drop to replace
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-3xl mb-2 text-gray-300">
                          <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600">
                          Drop a file here or click to browse
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          CSV, DOCX, or TXT — up to 5 MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm text-gray-600">
                      Paste your item list
                    </label>
                    <select
                      value={pasteFormat}
                      onChange={(e) => setPasteFormat(e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="text">Auto-detect</option>
                      <option value="csv">CSV</option>
                    </select>
                  </div>
                  <textarea
                    value={pasteText}
                    onChange={(e) => {
                      setPasteText(e.target.value);
                      setError('');
                    }}
                    placeholder={'Margherita Pizza $14.95\n  Classic tomato and mozzarella\nCaesar Salad 12\nLobster Tail M.P.\n\n— or CSV —\n\nname,price,description\nMargherita Pizza,14.95,Classic tomato and mozzarella'}
                    className="w-full h-48 px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Preview header */}
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preview.length > 0 && selected.size === preview.length}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-600">
                    {preview.length} item{preview.length !== 1 ? 's' : ''} found
                  </span>
                </label>
                <button
                  onClick={() => { setPreview(null); setSelected(new Set()); setError(''); }}
                  className="text-xs text-gray-500 hover:text-gray-900 min-h-[44px] flex items-center"
                >
                  &larr; Back
                </button>
              </div>

              {/* Column headers */}
              <div className="flex items-center gap-3 px-2 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
                <div className="w-5" />
                <div className="flex-1">Name</div>
                <div className="w-20 text-right">Price</div>
                <div className="w-6" />
              </div>

              {/* Preview list */}
              <div className="max-h-[50vh] overflow-y-auto">
                {preview.map((dish, i) => (
                  <div key={i} className={`border-b border-gray-50 ${!selected.has(i) ? 'opacity-40' : ''}`}>
                    {editingIdx === i ? (
                      /* Editing mode */
                      <div className="py-2 px-2 bg-blue-50 rounded-lg my-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <input
                            type="text"
                            value={dish.name}
                            onChange={(e) => updatePreviewDish(i, 'name', e.target.value)}
                            className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
                            placeholder="Item name"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={dish.price}
                            onChange={(e) => updatePreviewDish(i, 'price', e.target.value)}
                            className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
                            placeholder="Price"
                          />
                        </div>
                        <input
                          type="text"
                          value={dish.description}
                          onChange={(e) => updatePreviewDish(i, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
                          placeholder="Description (optional)"
                        />
                        <div className="flex justify-end gap-2 mt-1.5">
                          <button
                            onClick={() => removePreviewDish(i)}
                            className="text-xs text-red-500 hover:text-red-700 min-h-[32px] px-2"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => setEditingIdx(null)}
                            className="text-xs text-gray-900 font-medium min-h-[32px] px-2"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display mode */
                      <label className="flex items-start gap-3 py-2 px-2 cursor-pointer hover:bg-gray-50 rounded min-h-[44px] group">
                        <input
                          type="checkbox"
                          checked={selected.has(i)}
                          onChange={() => toggleDish(i)}
                          className="mt-1 w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-800">{dish.name}</span>
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              <span className="text-sm text-gray-500">
                                {dish.price || ''}
                              </span>
                            </div>
                          </div>
                          {dish.description && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{dish.description}</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingIdx(i);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 min-h-[32px] min-w-[32px] flex items-center justify-center flex-shrink-0 transition-opacity"
                          title="Edit"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </label>
                    )}
                  </div>
                ))}
              </div>

              {/* Error in preview */}
              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
          {preview && (
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addToMenu}
                onChange={(e) => setAddToMenu(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
              />
              <span className="text-sm text-gray-600">
                Also add to current menu
              </span>
            </label>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {preview ? `${selected.size} selected` : ''}
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 min-h-[44px]"
              >
                Cancel
              </button>
              {!preview ? (
                <button
                  onClick={handleParse}
                  disabled={loading || (activeTab === 'upload' ? !file : !pasteText.trim())}
                  className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {loading ? 'Parsing...' : 'Parse'}
                </button>
              ) : (
                <button
                  onClick={handleImport}
                  disabled={importing || selected.size === 0}
                  className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {importing ? 'Importing...' : `Import ${selected.size} Item${selected.size !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
