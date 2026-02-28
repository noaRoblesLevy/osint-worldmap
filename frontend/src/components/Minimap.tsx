'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { TYPE_COLORS } from '@/lib/entityIcons';

const W = 180;
const H = 120;

export default function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entities = useStore((s) => s.entities);
  const activeTypes = useStore((s) => s.activeTypes);
  const cameraViewRect = useStore((s) => s.cameraViewRect);
  const setFlyToBookmark = useStore((s) => s.setFlyToBookmark);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark background
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, W, H);

    // Simple continent outlines (grid lines for reference)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = ((lon + 180) / 360) * W;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let lat = -90; lat <= 90; lat += 30) {
      const y = ((90 - lat) / 180) * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Entity dots
    entities.forEach((entity) => {
      if (!activeTypes.has(entity.type)) return;
      const x = ((entity.lng + 180) / 360) * W;
      const y = ((90 - entity.lat) / 180) * H;
      ctx.fillStyle = TYPE_COLORS[entity.type] || '#3b82f6';
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    });

    // Camera viewport rectangle
    if (cameraViewRect) {
      const { west, south, east, north } = cameraViewRect;
      let x1 = ((west + 180) / 360) * W;
      let x2 = ((east + 180) / 360) * W;
      const y1 = ((90 - north) / 180) * H;
      const y2 = ((90 - south) / 180) * H;

      // Handle wrap-around
      if (x2 < x1) x2 += W;

      const rw = Math.max(x2 - x1, 2);
      const rh = Math.max(y2 - y1, 2);

      ctx.strokeStyle = 'rgba(59,130,246,0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x1, y1, rw, rh);

      ctx.fillStyle = 'rgba(59,130,246,0.08)';
      ctx.fillRect(x1, y1, rw, rh);
    }

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);
  }, [entities, activeTypes, cameraViewRect]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Also redraw on interval for smooth updates
  useEffect(() => {
    const id = setInterval(draw, 2000);
    return () => clearInterval(id);
  }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lng = (x / W) * 360 - 180;
    const lat = 90 - (y / H) * 180;
    setFlyToBookmark({
      id: 'minimap-click',
      name: 'Minimap',
      lng,
      lat,
      alt: 5000000,
    });
  };

  return (
    <div className="absolute bottom-14 left-4 z-20">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={handleClick}
        className="cursor-crosshair rounded border border-white/10 shadow-lg"
        style={{ width: W, height: H }}
      />
      <div className="text-[8px] font-mono text-white/30 mt-1 text-center uppercase tracking-wider">
        Minimap
      </div>
    </div>
  );
}
