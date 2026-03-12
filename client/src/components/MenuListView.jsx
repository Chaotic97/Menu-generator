import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMenus, createMenu, deleteMenu, listTemplates } from '../api/menus.js';

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

function ColorSwatches({ colors }) {
  if (!colors || colors.length === 0) return null;
  return (
    <div className="flex gap-0.5">
      {colors.map((c, i) => (
        <div
          key={i}
          className="h-2 flex-1 rounded-sm"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

export default function MenuListView() {
  const [menus, setMenus] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateMap, setTemplateMap] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('jade-palace');
  const navigate = useNavigate();

  useEffect(() => {
    listMenus().then(setMenus);
    listTemplates().then((ts) => {
      setTemplates(ts);
      const map = {};
      ts.forEach((t) => {
        map[t.id] = {
          name: t.name,
          colors: JSON.parse(t.preview_colors || '[]'),
        };
      });
      setTemplateMap(map);
    });
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
  const getColors = (themeId) => templateMap[themeId]?.colors || [];

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
              className="p-5 bg-white rounded-xl border border-gray-200 hover:border-gray-400 cursor-pointer transition-colors flex items-center gap-5"
            >
              <div className="flex-shrink-0 w-24 h-14 rounded-lg overflow-hidden flex gap-0.5">
                {getColors(mostRecent.theme_id).map((c, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-lg truncate">
                  {mostRecent.name}
                </h3>
                {mostRecent.restaurant_name && (
                  <p className="text-sm text-gray-500 truncate">
                    {mostRecent.restaurant_name}
                  </p>
                )}
              </div>
              <div className="text-sm text-gray-400 flex-shrink-0">
                {timeAgo(mostRecent.updated_at)}
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
                <div className="grid grid-cols-5 gap-2">
                  {templates.map((t) => {
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

          {menus.length === 0 && !showCreate ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg">No menus yet</p>
              <p className="text-sm mt-1">
                Create your first menu to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {menus.map((menu) => (
                <div
                  key={menu.id}
                  onClick={() => navigate(`/menus/${menu.id}`)}
                  className="bg-white rounded-xl border border-gray-200 hover:border-gray-400 cursor-pointer transition-colors group overflow-hidden"
                >
                  {/* Color swatch bar */}
                  <div className="flex h-2">
                    {getColors(menu.theme_id).map((c, i) => (
                      <div
                        key={i}
                        className="flex-1"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
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
                    <div className="mt-3 text-xs text-gray-400">
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
