import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMenu, updateMenu, updateSections, listTemplates, getPlateStackStatus, getPlateStackDishes, getPlateStackTags, exportPdf, searchDishLibrary } from '../api/menus.js';
import MenuPreview from './MenuPreview.jsx';
import useAutosave from '../hooks/useAutosave.js';
import useDishAutocomplete from '../hooks/useDishAutocomplete.js';
import AutocompleteDropdown from './AutocompleteDropdown.jsx';
import ImportDishesModal from './ImportDishesModal.jsx';
import templates from '../templates/index.js';

function formatPrice(raw) {
  if (!raw || raw === '0') return '';
  const upper = raw.toString().toUpperCase().trim();
  if (upper === 'MP') return 'M.P.';
  if (upper === 'AQ') return 'A.Q.';
  return raw;
}

// Save status indicator
function SaveIndicator({ status }) {
  if (status === 'idle') return null;
  const labels = { saving: 'Saving...', saved: 'Saved', error: 'Save failed' };
  const colorMap = { saving: 'text-gray-400', saved: 'text-green-500', error: 'text-red-500' };
  return (
    <span className={`text-xs ${colorMap[status]} transition-opacity duration-300`}>
      {labels[status]}
    </span>
  );
}

export default function MenuEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [template, setTemplate] = useState(null);
  const [templateList, setTemplateList] = useState([]);
  const [activeTab, setActiveTab] = useState('dishes');
  const [loading, setLoading] = useState(true);
  const [plateStackEnabled, setPlateStackEnabled] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [psDishes, setPsDishes] = useState([]);
  const [psTags, setPsTags] = useState([]);
  const [psSelected, setPsSelected] = useState(new Set());
  const [psLoading, setPsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const lastPinchDist = useRef(null);
  const [showImportDishesModal, setShowImportDishesModal] = useState(false);
  const [sidebarAutocompleteQuery, setSidebarAutocompleteQuery] = useState('');
  const [sidebarAutocompleteDishId, setSidebarAutocompleteDishId] = useState(null);
  const [sidebarHighlightIndex, setSidebarHighlightIndex] = useState(0);
  const [inlineAutocompleteQuery, setInlineAutocompleteQuery] = useState('');
  const [inlineAutocompleteDishId, setInlineAutocompleteDishId] = useState(null);
  const sidebarAcResult = useDishAutocomplete(sidebarAutocompleteQuery);
  const inlineAcResult = useDishAutocomplete(inlineAutocompleteQuery);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryResults, setLibraryResults] = useState([]);

  const previewContainerRef = useRef(null);

  // Pinch-to-zoom: use non-passive DOM listeners so preventDefault() works on iOS.
  // React's onTouchMove is passive by default, silently ignoring preventDefault().
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist.current = Math.hypot(dx, dy);
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && lastPinchDist.current !== null) {
        e.preventDefault(); // works because listener is { passive: false }
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const delta = dist / lastPinchDist.current;
        lastPinchDist.current = dist;
        setPreviewZoom((z) => Math.min(2, Math.max(0.3, z * delta)));
      }
    };

    const onTouchEnd = () => {
      lastPinchDist.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const {
    saveStatus,
    debouncedSaveSections,
    debouncedSaveMeta,
    saveSectionsNow,
  } = useAutosave(id, { updateSections, updateMenu });

  // Export PDF
  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const blob = await exportPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(menu.restaurant_name || menu.name || 'menu').replace(/[^a-zA-Z0-9\-_ ]/g, '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF export failed: ' + err.message);
    }
    setExporting(false);
  };

  // Load menu and templates
  useEffect(() => {
    Promise.all([getMenu(id), listTemplates(), getPlateStackStatus()]).then(
      ([menuData, tplList, psStatus]) => {
        setMenu(menuData);
        setTemplateList(tplList);
        setPlateStackEnabled(psStatus.enabled);
        // Use client-side template config (has full theme data)
        const tpl = templates[menuData.theme_id] || Object.values(templates)[0];
        setTemplate(tpl);
        setLoading(false);
      }
    );
  }, [id]);

  // Switch template
  const handleTemplateSwitch = async (templateId) => {
    const tpl = templates[templateId];
    if (!tpl) return;
    setTemplate(tpl);
    setMenu((prev) => ({ ...prev, theme_id: templateId }));
    await updateMenu(id, { theme_id: templateId });
  };

  // Change layout
  const handleLayoutChange = async (newLayout) => {
    if (menu.layout === newLayout) return;
    setMenu((prev) => ({ ...prev, layout: newLayout }));
    await updateMenu(id, { layout: newLayout });
  };

  // Update metadata with debounce
  const handleMetaChange = useCallback((field, value) => {
    setMenu((prev) => ({ ...prev, [field]: value }));
    debouncedSaveMeta({ [field]: value });
  }, [debouncedSaveMeta]);

  // Add section
  const handleAddSection = async () => {
    const name = prompt('Section name:');
    if (!name?.trim()) return;
    const newSection = {
      name: name.trim(),
      sort_order: (menu.sections?.length || 0),
      dishes: [],
    };
    const updatedSections = [...(menu.sections || []), newSection];
    setMenu((prev) => ({ ...prev, sections: updatedSections }));
    await updateSections(id, updatedSections);
    // Reload to get IDs
    const fresh = await getMenu(id);
    setMenu(fresh);
  };

  // Remove section
  const handleRemoveSection = async (sectionIndex) => {
    if (!confirm('Delete this section and all its items?')) return;
    const updatedSections = menu.sections.filter((_, i) => i !== sectionIndex);
    setMenu((prev) => ({ ...prev, sections: updatedSections }));
    await updateSections(id, updatedSections);
    const fresh = await getMenu(id);
    setMenu(fresh);
  };

  // Add dish to section
  const handleAddDish = async (sectionIndex) => {
    const sections = [...menu.sections];
    const section = { ...sections[sectionIndex] };
    section.dishes = [
      ...section.dishes,
      {
        name: 'New Dish',
        description: '',
        price: '0',
        sort_order: section.dishes.length,
      },
    ];
    sections[sectionIndex] = section;
    setMenu((prev) => ({ ...prev, sections }));
    await updateSections(id, sections);
    const fresh = await getMenu(id);
    setMenu(fresh);
  };

  // Remove dish
  const handleRemoveDish = async (sectionIndex, dishIndex) => {
    const sections = [...menu.sections];
    const section = { ...sections[sectionIndex] };
    section.dishes = section.dishes.filter((_, i) => i !== dishIndex);
    sections[sectionIndex] = section;
    setMenu((prev) => ({ ...prev, sections }));
    await updateSections(id, sections);
    const fresh = await getMenu(id);
    setMenu(fresh);
  };

  // Library browser search
  const handleLibrarySearch = useCallback(async (q) => {
    setLibrarySearch(q);
    if (q.trim().length < 2) {
      setLibraryResults([]);
      return;
    }
    try {
      const results = await searchDishLibrary(q.trim());
      setLibraryResults(results);
    } catch {
      setLibraryResults([]);
    }
  }, []);

  // Add a library dish to the current menu
  const handleAddLibraryDish = async (libraryDish) => {
    const sections = [...(menu.sections || [])];
    if (sections.length === 0) {
      // Create a default section
      sections.push({ name: 'Menu', sort_order: 0, dishes: [] });
    }
    // Add to the last section
    const lastIdx = sections.length - 1;
    const sec = { ...sections[lastIdx] };
    sec.dishes = [...(sec.dishes || []), {
      name: libraryDish.name,
      description: libraryDish.description || '',
      price: libraryDish.price || '0',
      sort_order: (sec.dishes || []).length,
    }];
    sections[lastIdx] = sec;
    setMenu((prev) => ({ ...prev, sections }));
    await updateSections(id, sections);
    const fresh = await getMenu(id);
    setMenu(fresh);
  };

  // Open PlateStack import modal
  const handleOpenImport = async () => {
    setPsLoading(true);
    setShowImportModal(true);
    setPsSelected(new Set());
    try {
      const [dishes, tags] = await Promise.all([
        getPlateStackDishes(),
        getPlateStackTags(),
      ]);
      setPsDishes(dishes);
      setPsTags(tags);
    } catch {
      setPsDishes([]);
      setPsTags([]);
    }
    setPsLoading(false);
  };

  // Toggle a single dish selection
  const handleTogglePsDish = (dishId) => {
    setPsSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dishId)) next.delete(dishId);
      else next.add(dishId);
      return next;
    });
  };

  // Toggle all dishes in a tag group
  const handleToggleTagGroup = (tag) => {
    const tagDishes = psDishes.filter(
      (d) => d.tags && d.tags.split(',').map((t) => t.trim()).includes(tag)
    );
    const allSelected = tagDishes.every((d) => psSelected.has(d.id));
    setPsSelected((prev) => {
      const next = new Set(prev);
      for (const d of tagDishes) {
        if (allSelected) next.delete(d.id);
        else next.add(d.id);
      }
      return next;
    });
  };

  // Import selected dishes into current menu
  const handleImportSelected = async () => {
    if (psSelected.size === 0) return;
    const selectedDishes = psDishes.filter((d) => psSelected.has(d.id));

    // Group selected dishes by their first tag (or "Imported" if no tags)
    const grouped = {};
    for (const dish of selectedDishes) {
      const tagList = dish.tags
        ? dish.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      const groupName = tagList[0] || 'Imported';
      if (!grouped[groupName]) grouped[groupName] = [];
      grouped[groupName].push(dish);
    }

    // Build updated sections
    const sections = [...(menu.sections || [])];
    for (const [tagName, dishes] of Object.entries(grouped)) {
      // Find existing section with this name
      let sectionIndex = sections.findIndex(
        (s) => s.name.toLowerCase() === tagName.toLowerCase()
      );
      if (sectionIndex === -1) {
        // Create new section
        sections.push({
          name: tagName,
          sort_order: sections.length,
          dishes: [],
        });
        sectionIndex = sections.length - 1;
      }
      const section = { ...sections[sectionIndex] };
      section.dishes = [...(section.dishes || [])];
      for (const dish of dishes) {
        section.dishes.push({
          name: dish.name,
          description: dish.description || '',
          price: dish.price != null ? String(dish.price) : '0',
          sort_order: section.dishes.length,
          platestack_dish_id: dish.id,
        });
      }
      sections[sectionIndex] = section;
    }

    setMenu((prev) => ({ ...prev, sections }));
    await updateSections(id, sections);
    const fresh = await getMenu(id);
    setMenu(fresh);
    setShowImportModal(false);
  };

  // ── Callbacks from MenuPreview ──────────────────────────

  // Drag-and-drop reorder: receives full new sections array
  const handleSectionsChange = useCallback((newSections) => {
    setMenu((prev) => ({ ...prev, sections: newSections }));
    saveSectionsNow(newSections);
  }, [saveSectionsNow]);

  // Inline field edits from the preview
  const handleFieldEdit = useCallback((entityType, entityId, field, value, sectionId) => {
    if (entityType === 'menu') {
      setMenu((prev) => ({ ...prev, [field]: value }));
      debouncedSaveMeta({ [field]: value });
      return;
    }

    // Track inline autocomplete for dish name edits
    if (entityType === 'dish' && field === 'name') {
      setInlineAutocompleteQuery(value);
      setInlineAutocompleteDishId(entityId);
    }

    setMenu((prev) => {
      const newSections = (prev.sections || []).map((s) => {
        if (entityType === 'section' && s.id === entityId) {
          return { ...s, [field]: value };
        }
        if (entityType === 'dish') {
          const dishIdx = (s.dishes || []).findIndex((d) => d.id === entityId);
          if (dishIdx !== -1) {
            const newDishes = [...s.dishes];
            newDishes[dishIdx] = { ...newDishes[dishIdx], [field]: value };
            return { ...s, dishes: newDishes };
          }
        }
        return s;
      });

      debouncedSaveSections(newSections);
      return { ...prev, sections: newSections };
    });
  }, [debouncedSaveSections, debouncedSaveMeta]);

  // Handle inline autocomplete suggestion selection
  const handleDishSelectSuggestion = useCallback((dishId, suggestion, sectionId) => {
    setInlineAutocompleteDishId(null);
    setInlineAutocompleteQuery('');

    setMenu((prev) => {
      const newSections = (prev.sections || []).map((s) => {
        const dishIdx = (s.dishes || []).findIndex((d) => d.id === dishId);
        if (dishIdx !== -1) {
          const newDishes = [...s.dishes];
          newDishes[dishIdx] = {
            ...newDishes[dishIdx],
            name: suggestion.name,
            price: suggestion.price || newDishes[dishIdx].price,
            description: suggestion.description || newDishes[dishIdx].description,
          };
          return { ...s, dishes: newDishes };
        }
        return s;
      });

      debouncedSaveSections(newSections);
      return { ...prev, sections: newSections };
    });
  }, [debouncedSaveSections]);

  // Build dishSuggestions map for inline preview autocomplete
  const dishSuggestions = {};
  if (inlineAutocompleteDishId && inlineAcResult.suggestions.length > 0) {
    dishSuggestions[inlineAutocompleteDishId] = inlineAcResult.suggestions;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!menu || !template) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400">Menu not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex relative">
      {/* Mobile sidebar overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-500 hover:text-gray-900 min-h-[44px] flex items-center"
            >
              &larr; All Menus
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center lg:hidden"
            >
              &times;
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-900 truncate">{menu.name}</h2>
            <SaveIndicator status={saveStatus} />
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="flex-shrink-0 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('dishes')}
            className={`flex-1 py-3 text-sm font-medium min-h-[44px] ${
              activeTab === 'dishes'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Items
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`flex-1 py-3 text-sm font-medium min-h-[44px] ${
              activeTab === 'style'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Style
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'dishes' ? (
            <div>
              {/* Meta */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Restaurant Name
                </label>
                <input
                  type="text"
                  value={menu.restaurant_name || ''}
                  onChange={(e) =>
                    handleMetaChange('restaurant_name', e.target.value)
                  }
                  className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="Restaurant name"
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={menu.subtitle || ''}
                  onChange={(e) => handleMetaChange('subtitle', e.target.value)}
                  className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="e.g. Dinner Menu"
                />
              </div>

              {/* Sections */}
              {(menu.sections || []).sort((a, b) => a.sort_order - b.sort_order).map((section, si) => (
                <div key={section.id || si} className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">
                      {section.name}
                    </h4>
                    <button
                      onClick={() => handleRemoveSection(si)}
                      className="text-xs text-gray-400 hover:text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-end"
                    >
                      Remove
                    </button>
                  </div>
                  {section.dishes?.length === 0 && (
                    <p className="text-xs text-gray-400 italic mb-1">(empty)</p>
                  )}
                  {(section.dishes || []).sort((a, b) => a.sort_order - b.sort_order).map((dish, di) => (
                    <div
                      key={dish.id || di}
                      className="mb-3 border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 min-w-0 relative">
                          <input
                            type="text"
                            value={dish.name}
                            onChange={(e) => {
                              handleFieldEdit('dish', dish.id, 'name', e.target.value, section.id);
                              setSidebarAutocompleteQuery(e.target.value);
                              setSidebarAutocompleteDishId(dish.id);
                              setSidebarHighlightIndex(0);
                            }}
                            onFocus={() => {
                              setSidebarAutocompleteQuery(dish.name);
                              setSidebarAutocompleteDishId(dish.id);
                              setSidebarHighlightIndex(0);
                            }}
                            onBlur={() => {
                              // Delay to allow click on dropdown
                              setTimeout(() => setSidebarAutocompleteDishId(null), 150);
                            }}
                            onKeyDown={(e) => {
                              const sugs = sidebarAutocompleteDishId === dish.id ? sidebarAcResult.suggestions : [];
                              if (sugs.length > 0) {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setSidebarHighlightIndex((p) => Math.min(p + 1, sugs.length - 1));
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setSidebarHighlightIndex((p) => Math.max(p - 1, 0));
                                } else if (e.key === 'Tab' || e.key === 'Enter') {
                                  e.preventDefault();
                                  const s = sugs[sidebarHighlightIndex];
                                  if (s) {
                                    handleFieldEdit('dish', dish.id, 'name', s.name, section.id);
                                    if (s.price) handleFieldEdit('dish', dish.id, 'price', s.price, section.id);
                                    if (s.description) handleFieldEdit('dish', dish.id, 'description', s.description, section.id);
                                    setSidebarAutocompleteDishId(null);
                                  }
                                } else if (e.key === 'Escape') {
                                  setSidebarAutocompleteDishId(null);
                                }
                              }
                            }}
                            className="w-full px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
                            placeholder="Item name"
                          />
                          {sidebarAutocompleteDishId === dish.id && sidebarAcResult.suggestions.length > 0 && (
                            <AutocompleteDropdown
                              suggestions={sidebarAcResult.suggestions}
                              highlightIndex={sidebarHighlightIndex}
                              onSelect={(s) => {
                                handleFieldEdit('dish', dish.id, 'name', s.name, section.id);
                                if (s.price) handleFieldEdit('dish', dish.id, 'price', s.price, section.id);
                                if (s.description) handleFieldEdit('dish', dish.id, 'description', s.description, section.id);
                                setSidebarAutocompleteDishId(null);
                              }}
                              style={{ top: '100%', left: 0 }}
                            />
                          )}
                        </div>
                        <input
                          type="text"
                          value={dish.price === '0' ? '' : dish.price || ''}
                          onChange={(e) => {
                            handleFieldEdit('dish', dish.id, 'price', e.target.value || '0', section.id);
                          }}
                          className="w-20 px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
                          placeholder="Price"
                        />
                        <button
                          onClick={() => handleRemoveDish(si, di)}
                          className="text-gray-300 hover:text-red-500 text-lg min-h-[44px] min-w-[32px] flex items-center justify-center flex-shrink-0"
                        >
                          &times;
                        </button>
                      </div>
                      <textarea
                        value={dish.description || ''}
                        onChange={(e) => {
                          handleFieldEdit('dish', dish.id, 'description', e.target.value, section.id);
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-gray-900"
                        placeholder="Description (optional)"
                        rows={2}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddDish(si)}
                    className="mt-1 text-sm text-gray-500 hover:text-gray-900 min-h-[44px] flex items-center"
                  >
                    + Add item
                  </button>
                </div>
              ))}

              <button
                onClick={handleAddSection}
                className="w-full py-3 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-gray-500 hover:text-gray-900 min-h-[44px]"
              >
                + Add Section
              </button>

              {/* Dish Library */}
              <div className="mt-4 border border-gray-200 rounded-lg">
                <button
                  onClick={() => setShowLibrary((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg min-h-[44px]"
                >
                  <span>Item Library</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform ${showLibrary ? 'rotate-180' : ''}`}>
                    <path d="M3 4.5L6 7.5L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {showLibrary && (
                  <div className="px-3 pb-3 border-t border-gray-100">
                    <input
                      type="text"
                      value={librarySearch}
                      onChange={(e) => handleLibrarySearch(e.target.value)}
                      className="w-full mt-2 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
                      placeholder="Search saved items..."
                    />
                    {libraryResults.length > 0 ? (
                      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                        {libraryResults.map((dish) => (
                          <div
                            key={dish.id}
                            className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-gray-50 group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-800 truncate">{dish.name}</span>
                                {dish.price && dish.price !== '0' && (
                                  <span className="text-xs text-gray-400 ml-1 flex-shrink-0">{dish.price}</span>
                                )}
                              </div>
                              {dish.description && (
                                <p className="text-xs text-gray-400 truncate">{dish.description}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleAddLibraryDish(dish)}
                              className="opacity-0 group-hover:opacity-100 text-xs text-gray-500 hover:text-gray-900 flex-shrink-0 min-h-[32px] px-1.5 transition-opacity"
                              title="Add to menu"
                            >
                              + Add
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : librarySearch.length >= 2 ? (
                      <p className="mt-2 text-xs text-gray-400 text-center py-2">No matches</p>
                    ) : (
                      <p className="mt-2 text-xs text-gray-400 text-center py-2">Type to search your saved items</p>
                    )}
                    <button
                      onClick={() => setShowImportDishesModal(true)}
                      className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-gray-900 border border-dashed border-gray-300 rounded hover:border-gray-400 min-h-[36px]"
                    >
                      Import from File
                    </button>
                  </div>
                )}
              </div>

              {plateStackEnabled && (
                <button
                  onClick={handleOpenImport}
                  className="w-full mt-2 py-3 text-sm text-indigo-600 border border-dashed border-indigo-300 rounded-lg hover:border-indigo-500 hover:text-indigo-900 hover:bg-indigo-50 min-h-[44px]"
                >
                  Import from PlateStack
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Template Grid — grouped by category */}
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Template
              </label>
              <div className="mb-6 space-y-1">
                {(() => {
                  const catLabels = { formal: 'Formal', classic: 'Classic', minimal: 'Minimal', natural: 'Natural', editorial: 'Editorial' };
                  const catOrder = ['formal', 'classic', 'minimal', 'natural', 'editorial'];
                  const grouped = {};
                  templateList.forEach((t) => {
                    const cat = t.category || 'other';
                    (grouped[cat] = grouped[cat] || []).push(t);
                  });
                  return catOrder.filter((c) => grouped[c]?.length).map((cat) => {
                    const isOpen = !collapsedCats[cat];
                    const hasActive = grouped[cat].some((t) => t.id === menu.theme_id);
                    return (
                      <div key={cat}>
                        <button
                          onClick={() => setCollapsedCats((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                          className={`w-full flex items-center justify-between px-2 py-2 text-xs font-medium rounded-md hover:bg-gray-100 transition-colors min-h-[44px] ${hasActive && !isOpen ? 'text-gray-900' : 'text-gray-500'}`}
                        >
                          <span className="uppercase tracking-wider">{catLabels[cat] || cat}</span>
                          <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                            <path d="M3 4.5L6 7.5L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div className="grid grid-cols-2 gap-1.5 mt-1 mb-2 ml-1">
                            {grouped[cat].map((t) => {
                              const colors = JSON.parse(t.preview_colors || '[]');
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => handleTemplateSwitch(t.id)}
                                  className={`p-2 rounded-lg border-2 text-left transition-colors min-h-[44px] ${
                                    menu.theme_id === t.id
                                      ? 'border-gray-900'
                                      : 'border-gray-200 hover:border-gray-400'
                                  }`}
                                >
                                  <div className="flex gap-0.5 mb-1">
                                    {colors.map((c, i) => (
                                      <div
                                        key={i}
                                        className="h-3 flex-1 rounded-sm"
                                        style={{ backgroundColor: c }}
                                      />
                                    ))}
                                  </div>
                                  <div className="text-xs text-gray-600 truncate">
                                    {t.name}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Layout Selector */}
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Layout
              </label>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {[
                  { id: 'single', label: 'Single', icon: (
                    <div className="flex justify-center"><div className="w-6 h-8 border border-current rounded-sm p-0.5"><div className="w-full h-1 bg-current rounded-sm mb-0.5 opacity-60" /><div className="w-full h-1 bg-current rounded-sm mb-0.5 opacity-40" /><div className="w-full h-1 bg-current rounded-sm opacity-30" /></div></div>
                  )},
                  { id: 'two-col', label: 'Two Column', icon: (
                    <div className="flex justify-center gap-0.5"><div className="w-3 h-8 border border-current rounded-sm p-0.5"><div className="w-full h-1 bg-current rounded-sm mb-0.5 opacity-60" /><div className="w-full h-1 bg-current rounded-sm opacity-40" /></div><div className="w-3 h-8 border border-current rounded-sm p-0.5"><div className="w-full h-1 bg-current rounded-sm mb-0.5 opacity-60" /><div className="w-full h-1 bg-current rounded-sm opacity-40" /></div></div>
                  )},
                  { id: 'featured', label: 'Featured', icon: (
                    <div className="flex flex-col items-center"><div className="w-6 h-3 border border-current rounded-sm p-0.5 mb-0.5"><div className="w-full h-1 bg-current rounded-sm opacity-60" /></div><div className="flex gap-0.5"><div className="w-3 h-4 border border-current rounded-sm p-0.5"><div className="w-full h-1 bg-current rounded-sm opacity-40" /></div><div className="w-3 h-4 border border-current rounded-sm p-0.5"><div className="w-full h-1 bg-current rounded-sm opacity-40" /></div></div></div>
                  )},
                  { id: 'sidebar', label: 'Sidebar', icon: (
                    <div className="flex justify-center gap-0.5"><div className="w-4 h-8 border border-current rounded-sm p-0.5"><div className="w-full h-1 bg-current rounded-sm mb-0.5 opacity-60" /><div className="w-full h-1 bg-current rounded-sm mb-0.5 opacity-40" /><div className="w-full h-1 bg-current rounded-sm opacity-30" /></div><div className="w-2.5 h-8 border border-current rounded-sm p-0.5"><div className="w-full h-1 bg-current rounded-sm mb-0.5 opacity-50" /><div className="w-full h-1 bg-current rounded-sm opacity-30" /></div></div>
                  )},
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleLayoutChange(opt.id)}
                    className={`py-3 px-2 text-xs rounded-lg border-2 flex flex-col items-center gap-1 min-h-[44px] ${
                      menu.layout === opt.id
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14 lg:hidden">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-500 hover:text-gray-900 min-h-[44px] flex items-center"
        >
          &larr; Back
        </button>
        <h2 className="font-semibold text-gray-900 truncate mx-2">{menu.name}</h2>
        <button
          onClick={() => setSidebarOpen(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-gray-900"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
      </div>

      {/* Preview Canvas */}
      <div
        ref={previewContainerRef}
        className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8"
        style={{
          backgroundImage:
            'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          touchAction: 'pan-x pan-y',
        }}
      >
        {/* Spacer for mobile top bar */}
        <div className="h-14 lg:hidden" />
        <div
          style={{
            transform: `scale(${previewZoom})`,
            transformOrigin: 'top center',
            transition: lastPinchDist.current !== null ? 'none' : 'transform 0.15s ease',
          }}
        >
          <MenuPreview
            menu={menu}
            template={template}
            mode="edit"
            onSectionsChange={handleSectionsChange}
            onFieldEdit={handleFieldEdit}
            dishSuggestions={dishSuggestions}
            onDishSelectSuggestion={handleDishSelectSuggestion}
          />
        </div>
      </div>

      {/* Zoom controls — visible on mobile/tablet */}
      <div className="fixed bottom-4 right-4 z-20 flex flex-col gap-2 lg:hidden">
        <button
          onClick={() => setPreviewZoom((z) => Math.min(2, z + 0.15))}
          className="w-11 h-11 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center text-lg font-bold text-gray-700 active:bg-gray-100"
        >
          +
        </button>
        <button
          onClick={() => setPreviewZoom((z) => Math.max(0.3, z - 0.15))}
          className="w-11 h-11 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center text-lg font-bold text-gray-700 active:bg-gray-100"
        >
          −
        </button>
        {previewZoom !== 1 && (
          <button
            onClick={() => setPreviewZoom(1)}
            className="w-11 h-11 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center text-xs font-medium text-gray-500 active:bg-gray-100"
          >
            1:1
          </button>
        )}
      </div>

      {/* Item Library Import Modal */}
      {showImportDishesModal && (
        <ImportDishesModal
          onClose={() => setShowImportDishesModal(false)}
          menuSections={menu.sections}
          onImported={async (dishes, addToMenu) => {
            if (addToMenu && dishes.length > 0) {
              // Add imported dishes to an "Imported" section on the current menu
              const sections = [...(menu.sections || [])];
              let importSection = sections.find(
                (s) => s.name.toLowerCase() === 'imported'
              );
              let sectionIdx = importSection
                ? sections.indexOf(importSection)
                : -1;
              if (!importSection) {
                importSection = {
                  name: 'Imported',
                  sort_order: sections.length,
                  dishes: [],
                };
                sections.push(importSection);
                sectionIdx = sections.length - 1;
              }
              const sec = { ...sections[sectionIdx] };
              sec.dishes = [...(sec.dishes || [])];
              for (const dish of dishes) {
                sec.dishes.push({
                  name: dish.name,
                  description: dish.description || '',
                  price: dish.price || '0',
                  sort_order: sec.dishes.length,
                });
              }
              sections[sectionIdx] = sec;
              setMenu((prev) => ({ ...prev, sections }));
              await updateSections(id, sections);
              const fresh = await getMenu(id);
              setMenu(fresh);
            }
          }}
        />
      )}

      {/* PlateStack Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Import from PlateStack
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center text-xl"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              {psLoading ? (
                <div className="text-center text-gray-400 py-12">
                  Loading items...
                </div>
              ) : psDishes.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  No items found in PlateStack.
                </div>
              ) : (
                <div>
                  {psTags.map((tag) => {
                    const tagDishes = psDishes.filter(
                      (d) =>
                        d.tags &&
                        d.tags
                          .split(',')
                          .map((t) => t.trim())
                          .includes(tag)
                    );
                    if (tagDishes.length === 0) return null;
                    const allSelected = tagDishes.every((d) =>
                      psSelected.has(d.id)
                    );
                    return (
                      <div key={tag} className="mb-4">
                        <label className="flex items-center gap-3 mb-2 min-h-[44px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => handleToggleTagGroup(tag)}
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <h4 className="text-sm font-semibold text-gray-700">
                            {tag}
                          </h4>
                          <span className="text-xs text-gray-400">
                            ({tagDishes.length})
                          </span>
                        </label>
                        <div className="ml-8 space-y-0.5">
                          {tagDishes.map((dish) => (
                            <label
                              key={dish.id}
                              className="flex items-start gap-3 py-2 cursor-pointer hover:bg-gray-50 rounded px-1 min-h-[44px]"
                            >
                              <input
                                type="checkbox"
                                checked={psSelected.has(dish.id)}
                                onChange={() => handleTogglePsDish(dish.id)}
                                className="mt-0.5 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-800 truncate">
                                    {dish.name}
                                  </span>
                                  <span className="text-sm text-gray-500 ml-2 flex-shrink-0">
                                    {dish.price != null ? `$${dish.price}` : ''}
                                  </span>
                                </div>
                                {dish.description && (
                                  <p className="text-xs text-gray-400 truncate">
                                    {dish.description}
                                  </p>
                                )}
                                {dish.allergens && (
                                  <p className="text-xs text-amber-500">
                                    Allergens: {dish.allergens}
                                  </p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Untagged dishes */}
                  {(() => {
                    const untagged = psDishes.filter(
                      (d) => !d.tags || d.tags.trim() === ''
                    );
                    if (untagged.length === 0) return null;
                    const allSelected = untagged.every((d) =>
                      psSelected.has(d.id)
                    );
                    return (
                      <div className="mb-4">
                        <label className="flex items-center gap-3 mb-2 min-h-[44px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => {
                              setPsSelected((prev) => {
                                const next = new Set(prev);
                                for (const d of untagged) {
                                  if (allSelected) next.delete(d.id);
                                  else next.add(d.id);
                                }
                                return next;
                              });
                            }}
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <h4 className="text-sm font-semibold text-gray-700">
                            Uncategorized
                          </h4>
                          <span className="text-xs text-gray-400">
                            ({untagged.length})
                          </span>
                        </label>
                        <div className="ml-8 space-y-0.5">
                          {untagged.map((dish) => (
                            <label
                              key={dish.id}
                              className="flex items-start gap-3 py-2 cursor-pointer hover:bg-gray-50 rounded px-1 min-h-[44px]"
                            >
                              <input
                                type="checkbox"
                                checked={psSelected.has(dish.id)}
                                onChange={() => handleTogglePsDish(dish.id)}
                                className="mt-0.5 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-800 truncate">
                                    {dish.name}
                                  </span>
                                  <span className="text-sm text-gray-500 ml-2 flex-shrink-0">
                                    {dish.price != null ? `$${dish.price}` : ''}
                                  </span>
                                </div>
                                {dish.description && (
                                  <p className="text-xs text-gray-400 truncate">
                                    {dish.description}
                                  </p>
                                )}
                                {dish.allergens && (
                                  <p className="text-xs text-amber-500">
                                    Allergens: {dish.allergens}
                                  </p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-gray-200">
              <span className="text-sm text-gray-500">
                {psSelected.size} item{psSelected.size !== 1 ? 's' : ''}{' '}
                selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSelected}
                  disabled={psSelected.size === 0}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  Import Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
