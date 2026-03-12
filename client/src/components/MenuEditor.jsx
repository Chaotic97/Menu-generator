import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMenu, updateMenu, updateSections, listTemplates, getPlateStackStatus, getPlateStackDishes, getPlateStackTags, exportPdf } from '../api/menus.js';
import MenuPreview from './MenuPreview.jsx';
import useAutosave from '../hooks/useAutosave.js';
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

  // Toggle layout
  const handleLayoutToggle = async () => {
    const newLayout = menu.layout === 'single' ? 'two-col' : 'single';
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
    if (!confirm('Delete this section and all its dishes?')) return;
    const updatedSections = menu.sections.filter((_, i) => i !== sectionIndex);
    setMenu((prev) => ({ ...prev, sections: updatedSections }));
    await updateSections(id, updatedSections);
    const fresh = await getMenu(id);
    setMenu(fresh);
  };

  // Add dish to section
  const handleAddDish = async (sectionIndex) => {
    const name = prompt('Dish name:');
    if (!name?.trim()) return;
    const sections = [...menu.sections];
    const section = { ...sections[sectionIndex] };
    section.dishes = [
      ...section.dishes,
      {
        name: name.trim(),
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
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-900 mb-2 block"
          >
            &larr; All Menus
          </button>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-900 truncate">{menu.name}</h2>
            <SaveIndicator status={saveStatus} />
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('dishes')}
            className={`flex-1 py-2 text-sm font-medium ${
              activeTab === 'dishes'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Dishes
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`flex-1 py-2 text-sm font-medium ${
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
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
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
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="e.g. Dinner Menu"
                />
              </div>

              {/* Sections — read-only mirror of current order */}
              {(menu.sections || []).sort((a, b) => a.sort_order - b.sort_order).map((section, si) => (
                <div key={section.id || si} className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">
                      {section.name}
                    </h4>
                    <button
                      onClick={() => handleRemoveSection(si)}
                      className="text-xs text-gray-400 hover:text-red-500"
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
                      className="flex items-center justify-between py-1 text-sm group"
                    >
                      <span className="text-gray-600 truncate mr-2 flex items-center gap-1">
                        {dish.platestack_dish_id && (
                          <svg className="w-3 h-3 text-indigo-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                          </svg>
                        )}
                        {dish.name}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-gray-400 text-xs">
                          {formatPrice(dish.price) || '—'}
                        </span>
                        <button
                          onClick={() => handleRemoveDish(si, di)}
                          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddDish(si)}
                    className="mt-1 text-xs text-gray-500 hover:text-gray-900"
                  >
                    + Add dish
                  </button>
                </div>
              ))}

              <button
                onClick={handleAddSection}
                className="w-full py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-gray-500 hover:text-gray-900"
              >
                + Add Section
              </button>

              {plateStackEnabled && (
                <button
                  onClick={handleOpenImport}
                  className="w-full mt-2 py-2 text-sm text-indigo-600 border border-dashed border-indigo-300 rounded-lg hover:border-indigo-500 hover:text-indigo-900 hover:bg-indigo-50"
                >
                  Import from PlateStack
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Template Grid */}
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Template
              </label>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {templateList.map((t) => {
                  const colors = JSON.parse(t.preview_colors || '[]');
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTemplateSwitch(t.id)}
                      className={`p-2 rounded-lg border-2 text-left transition-colors ${
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

              {/* Layout Toggle */}
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Layout
              </label>
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() =>
                    menu.layout !== 'single' && handleLayoutToggle()
                  }
                  className={`flex-1 py-2 text-sm rounded-lg border-2 ${
                    menu.layout === 'single'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  Single
                </button>
                <button
                  onClick={() =>
                    menu.layout !== 'two-col' && handleLayoutToggle()
                  }
                  className={`flex-1 py-2 text-sm rounded-lg border-2 ${
                    menu.layout === 'two-col'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  Two Column
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Canvas */}
      <div
        className="flex-1 overflow-y-auto p-8"
        style={{
          backgroundImage:
            'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <MenuPreview
          menu={menu}
          template={template}
          mode="edit"
          onSectionsChange={handleSectionsChange}
          onFieldEdit={handleFieldEdit}
        />
      </div>

      {/* PlateStack Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Import from PlateStack
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {psLoading ? (
                <div className="text-center text-gray-400 py-12">
                  Loading dishes...
                </div>
              ) : psDishes.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  No dishes found in PlateStack.
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
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => handleToggleTagGroup(tag)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <h4 className="text-sm font-semibold text-gray-700">
                            {tag}
                          </h4>
                          <span className="text-xs text-gray-400">
                            ({tagDishes.length})
                          </span>
                        </div>
                        <div className="ml-6 space-y-1">
                          {tagDishes.map((dish) => (
                            <label
                              key={dish.id}
                              className="flex items-start gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1"
                            >
                              <input
                                type="checkbox"
                                checked={psSelected.has(dish.id)}
                                onChange={() => handleTogglePsDish(dish.id)}
                                className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
                        <div className="flex items-center gap-2 mb-2">
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
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <h4 className="text-sm font-semibold text-gray-700">
                            Uncategorized
                          </h4>
                          <span className="text-xs text-gray-400">
                            ({untagged.length})
                          </span>
                        </div>
                        <div className="ml-6 space-y-1">
                          {untagged.map((dish) => (
                            <label
                              key={dish.id}
                              className="flex items-start gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1"
                            >
                              <input
                                type="checkbox"
                                checked={psSelected.has(dish.id)}
                                onChange={() => handleTogglePsDish(dish.id)}
                                className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <span className="text-sm text-gray-500">
                {psSelected.size} dish{psSelected.size !== 1 ? 'es' : ''}{' '}
                selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSelected}
                  disabled={psSelected.size === 0}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

