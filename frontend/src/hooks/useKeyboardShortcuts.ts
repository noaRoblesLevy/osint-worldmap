'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

export function useKeyboardShortcuts() {
  const toggleHeatmap = useStore((s) => s.toggleHeatmap);
  const toggleClusters = useStore((s) => s.toggleClusters);
  const selectEntity = useStore((s) => s.selectEntity);
  const togglePause = useStore((s) => s.togglePause);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'h':
          toggleHeatmap();
          break;
        case 'c':
          toggleClusters();
          break;
        case 'r':
          // Reset view — deselect and map will reset on next render
          selectEntity(null);
          break;
        case 'escape':
          selectEntity(null);
          break;
        case ' ':
          e.preventDefault();
          togglePause();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleHeatmap, toggleClusters, selectEntity, togglePause]);
}
