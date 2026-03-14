import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMenu, updateMenu, updateSections, listTemplates, getPlateStackStatus, getPlateStackDishes, getPlateStackTags, exportPdf, searchDishLibrary } from '../api/menus.js';
import MenuPreview from './MenuPreview.jsx';
import useAutosave from '../hooks/useAutosave.js';
import useDishAutocomplete from '../hooks/useDishAutocomplete.js';
import AutocompleteDropdown from './AutocompleteDropdown.jsx';
import ImportDishesModal from './ImportDishesModal.jsx';
import templates from '../templates/index.js';
import mergeTemplate from '../utils/mergeTemplate.js';

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

// ─── Font options curated from existing templates ───
const FONT_OPTIONS = [
  { label: 'Cinzel', value: "'Cinzel', serif", import: 'Cinzel:wght@400;500;600;700' },
  { label: 'Cormorant Garamond', value: "'Cormorant Garamond', serif", import: 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { label: 'Playfair Display', value: "'Playfair Display', serif", import: 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { label: 'Libre Baskerville', value: "'Libre Baskerville', serif", import: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400' },
  { label: 'EB Garamond', value: "'EB Garamond', serif", import: 'EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { label: 'Lora', value: "'Lora', serif", import: 'Lora:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { label: 'DM Serif Display', value: "'DM Serif Display', serif", import: 'DM+Serif+Display:ital@0;1' },
  { label: 'Inter', value: "'Inter', sans-serif", import: 'Inter:wght@300;400;500;600;700' },
  { label: 'DM Sans', value: "'DM Sans', sans-serif", import: 'DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400' },
  { label: 'Montserrat', value: "'Montserrat', sans-serif", import: 'Montserrat:wght@300;400;500;600;700' },
  { label: 'Raleway', value: "'Raleway', sans-serif", import: 'Raleway:wght@300;400;500;600;700' },
  { label: 'Space Grotesk', value: "'Space Grotesk', sans-serif", import: 'Space+Grotesk:wght@300;400;500;600;700' },
  { label: 'Josefin Sans', value: "'Josefin Sans', sans-serif", import: 'Josefin+Sans:wght@300;400;500;600;700' },
  { label: 'Crimson Pro', value: "'Crimson Pro', serif", import: 'Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400' },
  { label: 'Source Serif 4', value: "'Source Serif 4', serif", import: 'Source+Serif+4:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400' },
  { label: 'Noto Serif', value: "'Noto Serif', serif", import: 'Noto+Serif:ital,wght@0,400;0,700;1,400' },
  { label: 'Bitter', value: "'Bitter', serif", import: 'Bitter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400' },
  { label: 'Urbanist', value: "'Urbanist', sans-serif", import: 'Urbanist:wght@300;400;500;600;700' },
  { label: 'Poppins', value: "'Poppins', sans-serif", import: 'Poppins:wght@300;400;500;600;700' },
  { label: 'Work Sans', value: "'Work Sans', sans-serif", import: 'Work+Sans:wght@300;400;500;600;700' },
];

// ─── Customize sub-components ───
function CustomizeSection({ title, group, overrides, onReset, children }) {
  const [open, setOpen] = useState(false);
  const hasOverrides = overrides?.[group] && Object.keys(overrides[group]).length > 0;
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 text-xs font-medium text-gray-600 hover:text-gray-900"
      >
        <span className="flex items-center gap-1.5">
          <svg
            className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {title}
          {hasOverrides && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
        </span>
        {hasOverrides && (
          <span
            onClick={(e) => { e.stopPropagation(); onReset(group); }}
            className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            Reset
          </span>
        )}
      </button>
      {open && <div className="pl-1 pb-2 space-y-2">{children}</div>}
    </div>
  );
}

function ColorPicker({ label, value, isOverridden, onChange, onReset }) {
  // Strip alpha from hex for color input (only supports #rrggbb)
  const hexForInput = (value || '#000000').slice(0, 7);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-xs ${isOverridden ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={hexForInput}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded border border-gray-300 cursor-pointer p-0"
        />
        <span className="text-xs text-gray-400 font-mono w-16">{(value || '').slice(0, 7)}</span>
        {isOverridden && (
          <button onClick={onReset} className="text-gray-400 hover:text-red-500 text-xs">&times;</button>
        )}
      </div>
    </div>
  );
}

function FontPicker({ label, value, isOverridden, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-xs ${isOverridden ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white max-w-[140px] truncate"
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
        {/* Include current value if not in list */}
        {!FONT_OPTIONS.find((f) => f.value === value) && (
          <option value={value}>{value.replace(/'/g, '').split(',')[0]}</option>
        )}
      </select>
    </div>
  );
}

function SliderControl({ label, value, min, max, step = 1, suffix = '', isOverridden, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className={`text-xs ${isOverridden ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
          {label}
        </span>
        <span className="text-xs text-gray-400 font-mono">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
      />
    </div>
  );
}

function DropdownControl({ label, value, options, isOverridden, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className={`text-xs ${isOverridden ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function MenuEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [template, setTemplate] = useState(null);
  const [baseTemplate, setBaseTemplate] = useState(null);
  const [customOverrides, setCustomOverrides] = useState(null);
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
  const [templateSearch, setTemplateSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffsetStart = useRef({ x: 0, y: 0 });
  const spaceHeld = useRef(false);
  const lastPinchDist = useRef(null);
  const lastPinchCenter = useRef(null);
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

  // ─── Canvas interactions: wheel zoom, space/middle-click pan, pinch-zoom+pan ───
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;

    // Wheel zoom (toward cursor)
    const onWheel = (e) => {
      // Only zoom when Ctrl/Meta held (trackpad pinch sends ctrl+wheel) or plain wheel
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.08 : 1 / 1.08;

      setPreviewZoom((prevZoom) => {
        const newZoom = Math.min(4, Math.max(0.15, prevZoom * zoomFactor));
        const scale = newZoom / prevZoom;
        // Adjust pan so the point under cursor stays fixed
        setPanOffset((prev) => ({
          x: cursorX - scale * (cursorX - prev.x),
          y: cursorY - scale * (cursorY - prev.y),
        }));
        return newZoom;
      });
    };

    // Space key for pan mode
    const onKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && e.target === document.body) {
        e.preventDefault();
        spaceHeld.current = true;
        el.style.cursor = 'grab';
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        spaceHeld.current = false;
        if (!isPanning.current) el.style.cursor = '';
      }
    };

    // Mouse pan (middle button or space+left)
    const onMouseDown = (e) => {
      if (e.button === 1 || (e.button === 0 && spaceHeld.current)) {
        e.preventDefault();
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        setPanOffset((prev) => { panOffsetStart.current = prev; return prev; });
        el.style.cursor = 'grabbing';
      }
    };
    const onMouseMove = (e) => {
      if (!isPanning.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPanOffset({
        x: panOffsetStart.current.x + dx,
        y: panOffsetStart.current.y + dy,
      });
    };
    const onMouseUp = () => {
      if (isPanning.current) {
        isPanning.current = false;
        el.style.cursor = spaceHeld.current ? 'grab' : '';
      }
    };

    // Touch: 1-finger pan, 2-finger pinch+pan
    let singleTouchStart = null;
    let singleTouchPanStart = null;

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        // Pinch start
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist.current = Math.hypot(dx, dy);
        lastPinchCenter.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        singleTouchStart = null;
      } else if (e.touches.length === 1) {
        // Check if touch is on an interactive element (input, editable, drag handle)
        const target = e.target;
        const isInteractive = target.closest('[contenteditable]') ||
          target.closest('input') || target.closest('textarea') ||
          target.closest('[data-drag-handle]') || target.closest('button');
        if (!isInteractive) {
          singleTouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          setPanOffset((prev) => { singleTouchPanStart = prev; return prev; });
        } else {
          singleTouchStart = null;
        }
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && lastPinchDist.current !== null) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const center = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        const zoomFactor = dist / lastPinchDist.current;
        const panDx = center.x - lastPinchCenter.current.x;
        const panDy = center.y - lastPinchCenter.current.y;

        lastPinchDist.current = dist;
        lastPinchCenter.current = center;

        const rect = el.getBoundingClientRect();
        const cx = center.x - rect.left;
        const cy = center.y - rect.top;

        setPreviewZoom((prevZoom) => {
          const newZoom = Math.min(4, Math.max(0.15, prevZoom * zoomFactor));
          const scale = newZoom / prevZoom;
          setPanOffset((prev) => ({
            x: cx - scale * (cx - prev.x) + panDx,
            y: cy - scale * (cy - prev.y) + panDy,
          }));
          return newZoom;
        });
      } else if (e.touches.length === 1 && singleTouchStart && singleTouchPanStart) {
        // Single-finger pan — only after a small threshold to avoid blocking taps
        const dx = e.touches[0].clientX - singleTouchStart.x;
        const dy = e.touches[0].clientY - singleTouchStart.y;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          e.preventDefault();
          setPanOffset({
            x: singleTouchPanStart.x + dx,
            y: singleTouchPanStart.y + dy,
          });
        }
      }
    };

    const onTouchEnd = () => {
      lastPinchDist.current = null;
      lastPinchCenter.current = null;
      singleTouchStart = null;
      singleTouchPanStart = null;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
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
      const blob = await exportPdf(id, { pageSize: menu.page_size || 'letter' });
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
        setBaseTemplate(tpl);
        // Apply custom overrides if saved
        let overrides = null;
        if (menuData.custom_overrides) {
          try {
            overrides = typeof menuData.custom_overrides === 'string'
              ? JSON.parse(menuData.custom_overrides)
              : menuData.custom_overrides;
          } catch { /* ignore corrupt overrides */ }
        }
        setCustomOverrides(overrides);
        setTemplate(mergeTemplate(tpl, overrides));
        setLoading(false);
        // Center the menu in the viewport after first render
        requestAnimationFrame(() => {
          const el = previewContainerRef.current;
          if (el) {
            const rect = el.getBoundingClientRect();
            setPanOffset({ x: Math.max(32, rect.width * 0.1), y: 32 + (window.innerWidth < 1024 ? 56 : 0) });
          }
        });
      }
    );
  }, [id]);

  // Switch template
  const handleTemplateSwitch = async (templateId) => {
    const tpl = templates[templateId];
    if (!tpl) return;
    setBaseTemplate(tpl);
    setTemplate(mergeTemplate(tpl, customOverrides));
    setMenu((prev) => ({ ...prev, theme_id: templateId }));
    await updateMenu(id, { theme_id: templateId });
  };

  // Change layout
  const handleLayoutChange = async (newLayout) => {
    if (menu.layout === newLayout) return;
    setMenu((prev) => ({ ...prev, layout: newLayout }));
    await updateMenu(id, { layout: newLayout });
  };

  // Change page size
  const handlePageSizeChange = async (newSize) => {
    if (menu.page_size === newSize) return;
    setMenu((prev) => ({ ...prev, page_size: newSize }));
    await updateMenu(id, { page_size: newSize });
  };

  // Update a custom override value
  const handleOverrideChange = useCallback((group, key, value) => {
    setCustomOverrides((prev) => {
      const next = { ...(prev || {}), [group]: { ...((prev || {})[group] || {}), [key]: value } };
      setTemplate(mergeTemplate(baseTemplate, next));
      debouncedSaveMeta({ custom_overrides: next });
      return next;
    });
  }, [baseTemplate, debouncedSaveMeta]);

  // Reset overrides for a specific group, or all
  const handleResetOverrides = useCallback((group) => {
    setCustomOverrides((prev) => {
      if (!group) {
        // Reset all
        setTemplate(baseTemplate);
        debouncedSaveMeta({ custom_overrides: null });
        return null;
      }
      const next = { ...(prev || {}) };
      delete next[group];
      const isEmpty = Object.keys(next).length === 0;
      setTemplate(mergeTemplate(baseTemplate, isEmpty ? null : next));
      debouncedSaveMeta({ custom_overrides: isEmpty ? null : next });
      return isEmpty ? null : next;
    });
  }, [baseTemplate, debouncedSaveMeta]);

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
      <div className="min-h-[100dvh] bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!menu || !template) {
    return (
      <div className="min-h-[100dvh] bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400">Menu not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-100 flex relative">
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
                          inputMode="decimal"
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
                        className="w-full px-2 py-1.5 text-base border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-gray-900"
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
                      className="w-full mt-2 px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
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
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-xs font-medium text-gray-500 shrink-0">
                  Template
                </label>
                <input
                  type="text"
                  placeholder="Search..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full px-2 py-1 text-base border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div className="mb-6 space-y-1">
                {(() => {
                  const catLabels = { formal: 'Formal', classic: 'Classic', minimal: 'Minimal', natural: 'Natural', editorial: 'Editorial' };
                  const catOrder = ['formal', 'classic', 'minimal', 'natural', 'editorial'];
                  const query = templateSearch.trim().toLowerCase();
                  const grouped = {};
                  templateList
                    .filter((t) => !query || t.name.toLowerCase().includes(query) || (t.category || '').toLowerCase().includes(query))
                    .forEach((t) => {
                      const cat = t.category || 'other';
                      (grouped[cat] = grouped[cat] || []).push(t);
                    });
                  return catOrder.filter((c) => grouped[c]?.length).map((cat) => {
                    const isOpen = !!query || !collapsedCats[cat];
                    const hasActive = grouped[cat].some((t) => t.id === menu.theme_id);
                    return (
                      <div key={cat}>
                        <button
                          onClick={() => !query && setCollapsedCats((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                          className={`w-full flex items-center justify-between px-2 py-2 text-xs font-medium rounded-md hover:bg-gray-100 transition-colors min-h-[44px] ${hasActive && !isOpen ? 'text-gray-900' : 'text-gray-500'}`}
                        >
                          <span className="uppercase tracking-wider">{catLabels[cat] || cat}</span>
                          {!query && (
                            <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                              <path d="M3 4.5L6 7.5L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
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

              {/* Page Size Selector */}
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Page Size
              </label>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {[
                  { id: 'letter', label: 'Letter', desc: '8.5 × 11"', icon: (
                    <div className="w-5 h-7 border border-current rounded-sm" />
                  )},
                  { id: 'half', label: 'Half Page', desc: '5.5 × 8.5"', icon: (
                    <div className="w-5 h-6 border border-current rounded-sm" />
                  )},
                  { id: 'quarter', label: 'Quarter', desc: '4.25 × 5.5"', icon: (
                    <div className="w-4 h-5 border border-current rounded-sm" />
                  )},
                  { id: 'tall', label: 'Tall', desc: '4.25 × 11"', icon: (
                    <div className="w-3 h-7 border border-current rounded-sm" />
                  )},
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handlePageSizeChange(opt.id)}
                    className={`py-3 px-2 text-xs rounded-lg border-2 flex flex-col items-center gap-1 min-h-[44px] ${
                      (menu.page_size || 'half') === opt.id
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                    <span className="text-gray-400">{opt.desc}</span>
                  </button>
                ))}
              </div>

              {/* ─── Customize Panel ─── */}
              <div className="border-t border-gray-200 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-medium text-gray-500">
                    Customize
                  </label>
                  {customOverrides && (
                    <button
                      onClick={() => handleResetOverrides()}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Colors */}
                <CustomizeSection title="Colors" group="colors" overrides={customOverrides} onReset={handleResetOverrides}>
                  {[
                    { key: 'bg', label: 'Background' },
                    { key: 'text', label: 'Text' },
                    { key: 'accent', label: 'Accent' },
                    { key: 'heading', label: 'Heading' },
                    { key: 'muted', label: 'Muted' },
                    { key: 'divider', label: 'Divider' },
                  ].map(({ key, label }) => (
                    <ColorPicker
                      key={key}
                      label={label}
                      value={template.colors[key]}
                      isOverridden={!!customOverrides?.colors?.[key]}
                      onChange={(v) => handleOverrideChange('colors', key, v)}
                      onReset={() => {
                        setCustomOverrides((prev) => {
                          const next = { ...(prev || {}) };
                          if (next.colors) {
                            const { [key]: _, ...rest } = next.colors;
                            if (Object.keys(rest).length === 0) delete next.colors;
                            else next.colors = rest;
                          }
                          const isEmpty = Object.keys(next).length === 0;
                          setTemplate(mergeTemplate(baseTemplate, isEmpty ? null : next));
                          debouncedSaveMeta({ custom_overrides: isEmpty ? null : next });
                          return isEmpty ? null : next;
                        });
                      }}
                    />
                  ))}
                </CustomizeSection>

                {/* Fonts */}
                <CustomizeSection title="Fonts" group="fonts" overrides={customOverrides} onReset={handleResetOverrides}>
                  {[
                    { key: 'title', label: 'Title' },
                    { key: 'heading', label: 'Heading' },
                    { key: 'body', label: 'Body' },
                    { key: 'price', label: 'Price' },
                  ].map(({ key, label }) => (
                    <FontPicker
                      key={key}
                      label={label}
                      value={template.fonts[key]}
                      isOverridden={!!customOverrides?.fonts?.[key]}
                      onChange={(v) => {
                        // Update font family and imports
                        const font = FONT_OPTIONS.find((f) => f.value === v);
                        setCustomOverrides((prev) => {
                          const next = { ...(prev || {}), fonts: { ...((prev || {}).fonts || {}), [key]: v } };
                          // Rebuild imports from all active font choices
                          const merged = mergeTemplate(baseTemplate, next);
                          const usedFonts = new Set([merged.fonts.title, merged.fonts.heading, merged.fonts.body, merged.fonts.price]);
                          const imports = [];
                          for (const uf of usedFonts) {
                            const fo = FONT_OPTIONS.find((f) => f.value === uf);
                            if (fo) imports.push(fo.import);
                          }
                          if (imports.length > 0) next.fonts.imports = imports;
                          setTemplate(mergeTemplate(baseTemplate, next));
                          debouncedSaveMeta({ custom_overrides: next });
                          return next;
                        });
                      }}
                    />
                  ))}
                </CustomizeSection>

                {/* Sizes */}
                <CustomizeSection title="Sizes" group="sizes" overrides={customOverrides} onReset={handleResetOverrides}>
                  {[
                    { key: 'title', label: 'Title', min: 16, max: 60 },
                    { key: 'subtitle', label: 'Subtitle', min: 8, max: 24 },
                    { key: 'section', label: 'Section', min: 10, max: 30 },
                    { key: 'dish', label: 'Item Name', min: 10, max: 24 },
                    { key: 'desc', label: 'Description', min: 8, max: 20 },
                    { key: 'price', label: 'Price', min: 10, max: 24 },
                  ].map(({ key, label, min, max }) => (
                    <SliderControl
                      key={key}
                      label={label}
                      value={template.sizes[key]}
                      min={min}
                      max={max}
                      suffix="px"
                      isOverridden={!!customOverrides?.sizes?.[key]}
                      onChange={(v) => handleOverrideChange('sizes', key, v)}
                    />
                  ))}
                </CustomizeSection>

                {/* Spacing */}
                <CustomizeSection title="Spacing" group="spacing" overrides={customOverrides} onReset={handleResetOverrides}>
                  {[
                    { key: 'sectionGap', label: 'Section Gap', min: 8, max: 60 },
                    { key: 'dishGap', label: 'Item Gap', min: 4, max: 30 },
                    { key: 'pagePadding', label: 'Page Padding', min: 16, max: 80 },
                    { key: 'headerBottom', label: 'Header Bottom', min: 8, max: 60 },
                    { key: 'descTop', label: 'Desc. Spacing', min: 0, max: 12 },
                  ].map(({ key, label, min, max }) => (
                    <SliderControl
                      key={key}
                      label={label}
                      value={template.spacing[key]}
                      min={min}
                      max={max}
                      suffix="px"
                      isOverridden={!!customOverrides?.spacing?.[key]}
                      onChange={(v) => handleOverrideChange('spacing', key, v)}
                    />
                  ))}
                </CustomizeSection>

                {/* Typography */}
                <CustomizeSection title="Typography" group="typography" overrides={customOverrides} onReset={handleResetOverrides}>
                  <DropdownControl
                    label="Title Weight"
                    value={template.typography.titleWeight}
                    options={[
                      { value: 300, label: 'Light' },
                      { value: 400, label: 'Regular' },
                      { value: 500, label: 'Medium' },
                      { value: 600, label: 'Semibold' },
                      { value: 700, label: 'Bold' },
                    ]}
                    isOverridden={customOverrides?.typography?.titleWeight !== undefined}
                    onChange={(v) => handleOverrideChange('typography', 'titleWeight', Number(v))}
                  />
                  <SliderControl
                    label="Title Spacing"
                    value={parseFloat(template.typography.titleLetterSpacing) || 0}
                    min={0}
                    max={10}
                    step={0.5}
                    suffix="px"
                    isOverridden={customOverrides?.typography?.titleLetterSpacing !== undefined}
                    onChange={(v) => handleOverrideChange('typography', 'titleLetterSpacing', `${v}px`)}
                  />
                  <DropdownControl
                    label="Title Transform"
                    value={template.typography.titleTransform || 'none'}
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'uppercase', label: 'Uppercase' },
                      { value: 'capitalize', label: 'Capitalize' },
                    ]}
                    isOverridden={customOverrides?.typography?.titleTransform !== undefined}
                    onChange={(v) => handleOverrideChange('typography', 'titleTransform', v)}
                  />
                  <DropdownControl
                    label="Section Weight"
                    value={template.typography.sectionWeight}
                    options={[
                      { value: 300, label: 'Light' },
                      { value: 400, label: 'Regular' },
                      { value: 500, label: 'Medium' },
                      { value: 600, label: 'Semibold' },
                      { value: 700, label: 'Bold' },
                    ]}
                    isOverridden={customOverrides?.typography?.sectionWeight !== undefined}
                    onChange={(v) => handleOverrideChange('typography', 'sectionWeight', Number(v))}
                  />
                  <DropdownControl
                    label="Section Transform"
                    value={template.typography.sectionTransform || 'none'}
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'uppercase', label: 'Uppercase' },
                      { value: 'capitalize', label: 'Capitalize' },
                    ]}
                    isOverridden={customOverrides?.typography?.sectionTransform !== undefined}
                    onChange={(v) => handleOverrideChange('typography', 'sectionTransform', v)}
                  />
                  <DropdownControl
                    label="Description Style"
                    value={template.typography.descStyle || 'normal'}
                    options={[
                      { value: 'normal', label: 'Normal' },
                      { value: 'italic', label: 'Italic' },
                    ]}
                    isOverridden={customOverrides?.typography?.descStyle !== undefined}
                    onChange={(v) => handleOverrideChange('typography', 'descStyle', v)}
                  />
                </CustomizeSection>

                {/* Decorations */}
                <CustomizeSection title="Decorations" group="layout" overrides={customOverrides} onReset={handleResetOverrides}>
                  <DropdownControl
                    label="Divider Style"
                    value={template.layout.dividerStyle}
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'simple-line', label: 'Simple Line' },
                      { value: 'thick-rule', label: 'Thick Rule' },
                      { value: 'ornamental-line', label: 'Ornamental' },
                      { value: 'neon-bar', label: 'Neon Bar' },
                      { value: 'circle-line', label: 'Circle Line' },
                      { value: 'left-accent', label: 'Left Accent' },
                      { value: 'line-through', label: 'Line Through' },
                    ]}
                    isOverridden={customOverrides?.layout?.dividerStyle !== undefined}
                    onChange={(v) => handleOverrideChange('layout', 'dividerStyle', v)}
                  />
                  <DropdownControl
                    label="Header Decor"
                    value={template.layout.headerDecor}
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'single-rule', label: 'Single Rule' },
                      { value: 'double-rule', label: 'Double Rule' },
                      { value: 'block-accent', label: 'Block Accent' },
                      { value: 'underline', label: 'Underline' },
                      { value: 'top-rule', label: 'Top Rule' },
                      { value: 'dots-and-rule', label: 'Dots & Rule' },
                      { value: 'ornament-row', label: 'Ornament Row' },
                    ]}
                    isOverridden={customOverrides?.layout?.headerDecor !== undefined}
                    onChange={(v) => handleOverrideChange('layout', 'headerDecor', v)}
                  />
                  <DropdownControl
                    label="Section Alignment"
                    value={template.layout.sectionAlignment || 'center'}
                    options={[
                      { value: 'left', label: 'Left' },
                      { value: 'center', label: 'Center' },
                    ]}
                    isOverridden={customOverrides?.layout?.sectionAlignment !== undefined}
                    onChange={(v) => handleOverrideChange('layout', 'sectionAlignment', v)}
                  />
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-gray-600">Dot Leaders</span>
                    <button
                      onClick={() => handleOverrideChange('layout', 'dotLeader', !template.layout.dotLeader)}
                      className={`w-8 h-5 rounded-full transition-colors relative ${
                        template.layout.dotLeader ? 'bg-gray-900' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          template.layout.dotLeader ? 'left-3.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </CustomizeSection>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14 lg:hidden pt-[env(safe-area-inset-top)]">
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

      {/* Preview Canvas — Photoshop-style pan/zoom workspace */}
      <div
        ref={previewContainerRef}
        className="flex-1 overflow-hidden relative"
        style={{
          backgroundImage:
            'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: `${panOffset.x % 20}px ${panOffset.y % 20}px`,
          touchAction: 'none',
        }}
      >
        {/* Spacer for mobile top bar */}
        <div className="h-14 lg:hidden" />
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${previewZoom})`,
            transformOrigin: '0 0',
            position: 'absolute',
            left: 0,
            top: 0,
          }}
        >
          <div style={{ padding: '2rem' }}>
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
      </div>

      {/* Zoom controls */}
      <div className="fixed z-20 flex flex-col gap-2" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))', right: '1rem' }}>
        <button
          onClick={() => {
            const container = previewContainerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            setPreviewZoom((z) => {
              const newZ = Math.min(4, z * 1.25);
              const scale = newZ / z;
              setPanOffset((p) => ({ x: cx - scale * (cx - p.x), y: cy - scale * (cy - p.y) }));
              return newZ;
            });
          }}
          className="w-11 h-11 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center text-lg font-bold text-gray-700 active:bg-gray-100"
        >
          +
        </button>
        <button
          onClick={() => {
            const container = previewContainerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            setPreviewZoom((z) => {
              const newZ = Math.max(0.15, z / 1.25);
              const scale = newZ / z;
              setPanOffset((p) => ({ x: cx - scale * (cx - p.x), y: cy - scale * (cy - p.y) }));
              return newZ;
            });
          }}
          className="w-11 h-11 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center text-lg font-bold text-gray-700 active:bg-gray-100"
        >
          −
        </button>
        <button
          onClick={() => { setPreviewZoom(1); setPanOffset({ x: 0, y: 0 }); }}
          className="w-11 h-11 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center text-xs font-medium text-gray-500 active:bg-gray-100"
          title="Reset view"
        >
          {Math.round(previewZoom * 100)}%
        </button>
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
