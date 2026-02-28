// Canvas-drawn entity icons for Cesium BillboardCollection
// All icons are white on transparent — Cesium tints them via billboard.color

import { EntityType } from '@/types';

const SIZE = 64;
const cache = new Map<string, HTMLCanvasElement>();

function make(key: string, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  if (cache.has(key)) return cache.get(key)!;
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  draw(ctx);
  cache.set(key, c);
  return c;
}

export function getEntityIcon(type: EntityType, isMilitary?: boolean): HTMLCanvasElement {
  const key = isMilitary ? `${type}_mil` : type;
  return make(key, (ctx) => {
    switch (type) {
      case 'flight':
        drawAirplane(ctx, !!isMilitary);
        break;
      case 'ship':
        drawShip(ctx);
        break;
      case 'satellite':
        drawSatellite(ctx);
        break;
      case 'vehicle':
        drawVehicle(ctx);
        break;
      case 'event':
        drawEvent(ctx);
        break;
    }
  });
}

function drawAirplane(ctx: CanvasRenderingContext2D, military: boolean) {
  ctx.save();
  ctx.translate(32, 32);

  // Fuselage
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(4, -18);
  ctx.lineTo(4, 10);
  ctx.lineTo(0, 24);
  ctx.lineTo(-4, 10);
  ctx.lineTo(-4, -18);
  ctx.closePath();
  ctx.fill();

  // Main wings
  ctx.beginPath();
  ctx.moveTo(-24, 2);
  ctx.lineTo(24, 2);
  ctx.lineTo(20, 8);
  ctx.lineTo(-20, 8);
  ctx.closePath();
  ctx.fill();

  // Tail wings
  ctx.beginPath();
  ctx.moveTo(-12, 18);
  ctx.lineTo(12, 18);
  ctx.lineTo(10, 22);
  ctx.lineTo(-10, 22);
  ctx.closePath();
  ctx.fill();

  if (military) {
    // Small star for military
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.arc(0, -10, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawShip(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(32, 32);

  // Hull
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(12, -4);
  ctx.lineTo(12, 12);
  ctx.lineTo(6, 20);
  ctx.lineTo(-6, 20);
  ctx.lineTo(-12, 12);
  ctx.lineTo(-12, -4);
  ctx.closePath();
  ctx.fill();

  // Mast
  ctx.fillRect(-1, -24, 2, 8);

  ctx.restore();
}

function drawSatellite(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(32, 32);

  // Body (center box)
  ctx.fillRect(-5, -5, 10, 10);

  // Solar panels
  ctx.fillRect(-22, -4, 14, 8);
  ctx.fillRect(8, -4, 14, 8);

  // Panel lines
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-15, -4);
  ctx.lineTo(-15, 4);
  ctx.moveTo(-8, -4);
  ctx.lineTo(-8, 4);
  ctx.moveTo(15, -4);
  ctx.lineTo(15, 4);
  ctx.moveTo(8, -4);
  ctx.lineTo(8, 4);
  ctx.stroke();

  // Antenna
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -10, 3, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-0.5, -12, 1, 4);

  ctx.restore();
}

function drawVehicle(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(32, 32);

  // Car body
  ctx.beginPath();
  ctx.roundRect(-10, -6, 20, 12, 3);
  ctx.fill();

  // Roof
  ctx.beginPath();
  ctx.roundRect(-6, -10, 12, 6, 2);
  ctx.fill();

  // Wheels
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(-7, 8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7, 8, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawEvent(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(32, 32);

  // Warning triangle
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(20, 18);
  ctx.lineTo(-20, 18);
  ctx.closePath();
  ctx.fill();

  // Exclamation mark (dark cutout)
  ctx.fillStyle = '#000000';
  ctx.fillRect(-2, -12, 4, 16);
  ctx.beginPath();
  ctx.arc(0, 12, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
