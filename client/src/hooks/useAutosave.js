import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Hook that debounces saves to the API.
 * Returns { saveStatus, debouncedSaveSections, debouncedSaveMeta, flushAll }
 *
 * saveStatus: 'idle' | 'saving' | 'saved' | 'error'
 */
export default function useAutosave(menuId, { updateSections, updateMenu }) {
  const [saveStatus, setSaveStatus] = useState('idle');
  const sectionsTimerRef = useRef(null);
  const metaTimerRef = useRef(null);
  const savedTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(sectionsTimerRef.current);
      clearTimeout(metaTimerRef.current);
      clearTimeout(savedTimerRef.current);
    };
  }, []);

  const showSaved = useCallback(() => {
    if (!mountedRef.current) return;
    setSaveStatus('saved');
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setSaveStatus('idle');
    }, 2000);
  }, []);

  const doSave = useCallback(async (saveFn) => {
    if (!mountedRef.current) return;
    setSaveStatus('saving');
    try {
      await saveFn();
      if (mountedRef.current) showSaved();
    } catch (err) {
      console.error('Autosave error:', err);
      if (mountedRef.current) setSaveStatus('error');
    }
  }, [showSaved]);

  // Track pending data so flushAll can fire saves immediately
  const pendingSectionsRef = useRef(null);
  const pendingMetaRef = useRef(null);

  const debouncedSaveSections = useCallback(
    (sections) => {
      pendingSectionsRef.current = sections;
      clearTimeout(sectionsTimerRef.current);
      sectionsTimerRef.current = setTimeout(() => {
        pendingSectionsRef.current = null;
        doSave(() => updateSections(menuId, sections));
      }, 800);
    },
    [menuId, updateSections, doSave]
  );

  const debouncedSaveMeta = useCallback(
    (data) => {
      pendingMetaRef.current = data;
      clearTimeout(metaTimerRef.current);
      metaTimerRef.current = setTimeout(() => {
        pendingMetaRef.current = null;
        doSave(() => updateMenu(menuId, data));
      }, 800);
    },
    [menuId, updateMenu, doSave]
  );

  // Immediate save (for drag-and-drop reorder — user expects instant persistence)
  const saveSectionsNow = useCallback(
    (sections) => {
      pendingSectionsRef.current = null;
      clearTimeout(sectionsTimerRef.current);
      doSave(() => updateSections(menuId, sections));
    },
    [menuId, updateSections, doSave]
  );

  // Flush any pending debounced saves immediately
  const flushAll = useCallback(() => {
    if (pendingSectionsRef.current) {
      clearTimeout(sectionsTimerRef.current);
      const sections = pendingSectionsRef.current;
      pendingSectionsRef.current = null;
      doSave(() => updateSections(menuId, sections));
    }
    if (pendingMetaRef.current) {
      clearTimeout(metaTimerRef.current);
      const data = pendingMetaRef.current;
      pendingMetaRef.current = null;
      doSave(() => updateMenu(menuId, data));
    }
  }, [menuId, updateSections, updateMenu, doSave]);

  // Flush pending saves when page becomes hidden (iOS kills background tabs)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushAll();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [flushAll]);

  return {
    saveStatus,
    debouncedSaveSections,
    debouncedSaveMeta,
    saveSectionsNow,
    flushAll,
  };
}
