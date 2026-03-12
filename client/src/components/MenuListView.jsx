import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMenus, createMenu, deleteMenu, listTemplates, getMenu } from '../api/menus.js';
import MenuPreview from './MenuPreview.jsx';
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

function MenuThumbnail({ menuId, themeId, borderRadius = '8px 8px 0 0' }) {
  const [fullMenu, setFullMenu] = useState(null);
  const template = clientTemplates[themeId] || Object.values(clientTemplates)[0];

  useEffect(() => {
    getMenu(menuId).then(setFullMenu);
  }, [menuId]);

  if (!fullMenu || !template) {
    return (
      <div
        className="bg-gray-100 rounded-lg"
        style={{ height: '200px' }}
      />
    );
  }

  const isMultiCol = fullMenu.layout && fullMenu.layout !== 'single';
  const previewWidth = isMultiCol ? 660 : 500;
  const scale = 0.38;

  return (
    <div
      style={{
        width: '100%',
        height: '200px',
        overflow: 'hidden',
        position: 'relative',
        borderRadius,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${previewWidth}px`,
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
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            MenuForge
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Design beautiful restaurant menus in minutes
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Continue Editing */}
        {mostRecent && (
          <div className="mb-10">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              Continue Editing
            </h2>
            <div
              onClick={() => navigate(`/menus/${mostRecent.id}`)}
              className="bg-white rounded-xl border border-gray-200 hover:border-gray-400 cursor-pointer transition-colors group overflow-hidden"
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
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
            >
              + New Menu
            </button>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-gray-900"
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
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg">No menus yet</p>
                <p className="text-sm mt-1">
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
                  className="bg-white rounded-xl border border-gray-200 hover:border-gray-400 cursor-pointer transition-colors group overflow-hidden"
                >
                  <MenuThumbnail menuId={menu.id} themeId={menu.theme_id} />
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {menu.name}
                        </h3>
                        {menu.restaurant_name && (
                          <p className="text-sm text-gray-500 truncate">
                            {menu.restaurant_name}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDelete(menu.id, e)}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                      >
                        &times;
                      </button>
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
    </div>
  );
}
