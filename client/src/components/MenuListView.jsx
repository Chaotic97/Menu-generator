import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMenus, createMenu, deleteMenu, listTemplates } from '../api/menus.js';

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">MenuForge</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            New Menu
          </button>
        </div>

        {showCreate && (
          <div className="mb-8 p-6 bg-white rounded-xl border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Create New Menu</h2>
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
            <p className="text-sm mt-1">Create your first menu to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {menus.map((menu) => (
              <div
                key={menu.id}
                onClick={() => navigate(`/menus/${menu.id}`)}
                className="p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-400 cursor-pointer transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{menu.name}</h3>
                    {menu.restaurant_name && (
                      <p className="text-sm text-gray-500">
                        {menu.restaurant_name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(menu.id, e)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  {new Date(menu.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
