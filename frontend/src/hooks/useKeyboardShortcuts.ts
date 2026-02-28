'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

export function useKeyboardShortcuts() {
  const toggleHeatmap = useStore((s) => s.toggleHeatmap);
  const toggleClusters = useStore((s) => s.toggleClusters);
  const selectEntity = useStore((s) => s.selectEntity);
  const togglePause = useStore((s) => s.togglePause);
  const toggleDayNight = useStore((s) => s.toggleDayNight);
  const toggleCinemaMode = useStore((s) => s.toggleCinemaMode);
  const toggleLabels = useStore((s) => s.toggleLabels);
  const toggleTrails = useStore((s) => s.toggleTrails);
  const toggleMinimap = useStore((s) => s.toggleMinimap);

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
        case 'escape': {
          // In cinema mode, Esc exits cinema first before deselecting entities
          const state = useStore.getState();
          if (state.cinemaMode) {
            toggleCinemaMode();
          } else {
            selectEntity(null);
          }
          break;
        }
        case ' ':
          e.preventDefault();
          togglePause();
          break;
        case 'n':
          toggleDayNight();
          break;
        case 'f':
          toggleCinemaMode();
          break;
        case 'l':
          toggleLabels();
          break;
        case 't':
          toggleTrails();
          break;
        case 'm':
          toggleMinimap();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleHeatmap, toggleClusters, selectEntity, togglePause, toggleDayNight, toggleCinemaMode, toggleLabels, toggleTrails, toggleMinimap]);
}
