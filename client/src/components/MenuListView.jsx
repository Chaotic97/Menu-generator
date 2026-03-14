import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMenus, createMenu, deleteMenu, listTemplates, getMenu } from '../api/menus.js';
import MenuPreview from './MenuPreview.jsx';
import ImportDishesModal from './ImportDishesModal.jsx';
import ItemLibraryModal from './ItemLibraryModal.jsx';
import clientTemplates from '../templates/index.js';

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function TemplateDots({ themeId }) {
  const template = clientTemplates[themeId];
  if (!template?.previewColors) return null;
  return (
    <div className="flex gap-1">
      {template.previewColors.map((c, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function MenuThumbnail({ menuId, themeId }) {
  const [fullMenu, setFullMenu] = useState(null);
  const template = clientTemplates[themeId] || Object.values(clientTemplates)[0];

  useEffect(() => {
    getMenu(menuId).then(setFullMenu);
  }, [menuId]);

  if (!fullMenu || !template) {
    return (
      <div
        className="rounded-t-xl"
        style={{ height: '180px', background: template ? template.colors.bg : '#f3f4f6' }}
      />
    );
  }

  const PAGE_SIZES = {
    letter:  { pw: 500, pwm: 660 },
    half:    { pw: 420, pwm: 540 },
    quarter: { pw: 340, pwm: 340 },
    tall:    { pw: 340, pwm: 340 },
  };
  const ps = PAGE_SIZES[fullMenu.page_size] || PAGE_SIZES.half;
  const allowMultiCol = fullMenu.page_size !== 'quarter' && fullMenu.page_size !== 'tall';
  const isMultiCol = allowMultiCol && fullMenu.layout && fullMenu.layout !== 'single';
  const previewWidth = isMultiCol ? ps.pwm : ps.pw;
  const thumbScale = Math.min(0.38, 280 / previewWidth * 0.38);

  return (
    <div
      style={{
        width: '100%',
        height: '180px',
        overflow: 'hidden',
        position: 'relative',
        background: template.colors.bg,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: `${previewWidth}px`,
          transform: `translateX(-50%) scale(${thumbScale})`,
          transformOrigin: 'top center',
          pointerEvents: 'none',
        }}
      >
        <MenuPreview
          menu={fullMenu}
          template={template}
          mode="export"
        />
      </div>
    </div>
  );
}

export default function MenuListView() {
  const [menus, setMenus] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('jade-palace');
  const navigate = useNavigate();

  useEffect(() => {
    listMenus().then(setMenus);
    listTemplates().then(setTemplates);
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const menu = await createMenu({
      name: newName.trim(),
      template_id: selectedTemplate,
    });
    navigate(`/menus/${menu.id}`);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this menu?')) return;
    await deleteMenu(id);
    setMenus(menus.filter((m) => m.id !== id));
  };

  const mostRecent = menus[0];

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      {/* Hero */}
      <div
        className="border-b border-gray-200 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #fff4ec 0%, #ffddbf 25%, #ffcfab 50%, #ffd9be 75%, #fff2e8 100%)',
        }}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-[0.12]"
            style={{ background: 'radial-gradient(circle, #FFBE98 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-[0.08]"
            style={{ background: 'radial-gradient(circle, #E8A07A 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #FFBE98 0%, transparent 50%)' }}
          />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center relative">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            Prixie
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Design beautiful restaurant menus in minutes
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Continue Editing */}
        {mostRecent && (
          <div className="mb-10">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              Continue Editing
            </h2>
            <div
              onClick={() => navigate(`/menus/${mostRecent.id}`)}
              className="bg-white rounded-xl border border-gray-200 cursor-pointer group overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-gray-200/60 hover:-translate-y-0.5 hover:border-gray-300"
              style={{ maxWidth: '320px' }}
            >
              <MenuThumbnail menuId={mostRecent.id} themeId={mostRecent.theme_id} />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {mostRecent.name}
                    </h3>
                    {mostRecent.restaurant_name && (
                      <p className="text-sm text-gray-500 truncate">
                        {mostRecent.restaurant_name}
                      </p>
                    )}
                  </div>
                  <TemplateDots themeId={mostRecent.theme_id} />
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {timeAgo(mostRecent.updated_at)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Your Menus */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              Your Menus
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLibrary(true)}
                className="px-4 py-2 bg-white text-gray-700 text-sm rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                Item Library
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="px-4 py-2 bg-white text-gray-700 text-sm rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                Import Items
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
              >
                + New Menu
              </button>
            </div>
          </div>

          {showCreate && (
            <div className="mb-6 p-6 bg-white rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Create New Menu</h3>
              <input
                type="text"
                placeholder="Menu name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-gray-900"
                autoFocus
              />
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template
                </label>
                <div className="space-y-2">
                  {(() => {
                    const catLabels = { formal: 'Formal', classic: 'Classic', minimal: 'Minimal', natural: 'Natural', editorial: 'Editorial' };
                    const catOrder = ['formal', 'classic', 'minimal', 'natural', 'editorial'];
                    const grouped = {};
                    templates.forEach((t) => {
                      const cat = t.category || 'other';
                      (grouped[cat] = grouped[cat] || []).push(t);
                    });
                    return catOrder.filter((c) => grouped[c]?.length).map((cat) => (
                      <div key={cat}>
                        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{catLabels[cat] || cat}</div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                          {grouped[cat].map((t) => {
                            const colors = JSON.parse(t.preview_colors || '[]');
                            return (
                              <button
                                key={t.id}
                                onClick={() => setSelectedTemplate(t.id)}
                                className={`p-2 rounded-lg border-2 transition-colors ${
                                  selectedTemplate === t.id
                                    ? 'border-gray-900'
                                    : 'border-gray-200 hover:border-gray-400'
                                }`}
                              >
                                <div className="flex gap-0.5 mb-1">
                                  {colors.map((c, i) => (
                                    <div
                                      key={i}
                                      className="h-4 flex-1 rounded-sm"
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
                      </div>
                    ));
                  })()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {menus.filter((m) => !mostRecent || m.id !== mostRecent.id).length === 0 && !showCreate ? (
            menus.length === 0 ? (
              <div className="text-center py-20">
                {/* Empty state illustration */}
                <div className="mx-auto mb-6 w-48 h-56 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 opacity-60">
                  <div className="w-24 h-2 bg-gray-200 rounded" />
                  <div className="w-20 h-1 bg-gray-100 rounded mt-1" />
                  <div className="w-full px-6 mt-4 space-y-2.5">
                    <div className="flex justify-between">
                      <div className="w-16 h-1.5 bg-gray-200 rounded" />
                      <div className="w-6 h-1.5 bg-gray-100 rounded" />
                    </div>
                    <div className="flex justify-between">
                      <div className="w-20 h-1.5 bg-gray-200 rounded" />
                      <div className="w-6 h-1.5 bg-gray-100 rounded" />
                    </div>
                    <div className="flex justify-between">
                      <div className="w-14 h-1.5 bg-gray-200 rounded" />
                      <div className="w-6 h-1.5 bg-gray-100 rounded" />
                    </div>
                  </div>
                  <div className="w-full px-6 mt-3 space-y-2.5">
                    <div className="flex justify-between">
                      <div className="w-18 h-1.5 bg-gray-200 rounded" />
                      <div className="w-6 h-1.5 bg-gray-100 rounded" />
                    </div>
                    <div className="flex justify-between">
                      <div className="w-12 h-1.5 bg-gray-200 rounded" />
                      <div className="w-6 h-1.5 bg-gray-100 rounded" />
                    </div>
                  </div>
                </div>
                <p className="text-gray-400">
                  Create your first menu to get started
                </p>
              </div>
            ) : null
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {menus.filter((m) => !mostRecent || m.id !== mostRecent.id).map((menu) => (
                <div
                  key={menu.id}
                  onClick={() => navigate(`/menus/${menu.id}`)}
                  className="bg-white rounded-xl border border-gray-200 cursor-pointer group overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-gray-200/60 hover:-translate-y-0.5 hover:border-gray-300"
                >
                  <MenuThumbnail menuId={menu.id} themeId={menu.theme_id} />
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {menu.name}
                        </h3>
                        {menu.restaurant_name && (
                          <p className="text-sm text-gray-500 truncate">
                            {menu.restaurant_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <TemplateDots themeId={menu.theme_id} />
                        <button
                          onClick={(e) => handleDelete(menu.id, e)}
                          className="text-gray-300/60 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {timeAgo(menu.updated_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showImport && (
        <ImportDishesModal
          onClose={() => setShowImport(false)}
          onImported={() => setShowImport(false)}
        />
      )}

      {showLibrary && (
        <ItemLibraryModal onClose={() => setShowLibrary(false)} />
      )}
    </div>
  );
}
