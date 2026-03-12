import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMenu, updateMenu, updateSections, listTemplates } from '../api/menus.js';
import MenuPreview from './MenuPreview.jsx';
import templates from '../templates/index.js';

function formatPrice(raw) {
  if (!raw || raw === '0') return '';
  const upper = raw.toString().toUpperCase().trim();
  if (upper === 'MP') return 'M.P.';
  if (upper === 'AQ') return 'A.Q.';
  return raw;
}

export default function MenuEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [template, setTemplate] = useState(null);
  const [templateList, setTemplateList] = useState([]);
  const [activeTab, setActiveTab] = useState('dishes');
  const [loading, setLoading] = useState(true);

  // Load menu and templates
  useEffect(() => {
    Promise.all([getMenu(id), listTemplates()]).then(([menuData, tplList]) => {
      setMenu(menuData);
      setTemplateList(tplList);
      // Use client-side template config (has full theme data)
      const tpl = templates[menuData.theme_id] || Object.values(templates)[0];
      setTemplate(tpl);
      setLoading(false);
    });
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

  // Update restaurant name
  const handleMetaChange = async (field, value) => {
    setMenu((prev) => ({ ...prev, [field]: value }));
    await updateMenu(id, { [field]: value });
  };

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
          <h2 className="font-semibold text-gray-900 truncate">{menu.name}</h2>
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

              {/* Sections */}
              {menu.sections?.map((section, si) => (
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
                  {section.dishes?.map((dish, di) => (
                    <div
                      key={dish.id || di}
                      className="flex items-center justify-between py-1 text-sm group"
                    >
                      <span className="text-gray-600 truncate mr-2">
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
        <MenuPreview menu={menu} template={template} mode={mode || 'edit'} />
      </div>
    </div>
  );
}

