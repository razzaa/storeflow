/**
 * StoreFlow icon generator
 * Run: node tools/generate-icon.mjs
 * Requires: npm install canvas (or pnpm add -D canvas)
 *
 * Outputs:
 *   assets/icon.png             1024×1024  App Store / Play Store
 *   assets/android-icon-foreground.png  1024×1024  Adaptive icon foreground
 *   assets/favicon.png          48×48      Web favicon
 */

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dir, '../assets');

function drawIcon(size, { transparent = false } = {}) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;

  const r = s * 0.215;

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  if (!transparent) {
    ctx.save();
    roundedRect(ctx, 0, 0, s, s, r);
    ctx.clip();
  }

  // Background gradient
  const bg = ctx.createLinearGradient(0, s, s, 0);
  bg.addColorStop(0, '#071A0D');
  bg.addColorStop(0.55, '#0D3D1F');
  bg.addColorStop(1, '#1A5C38');
  ctx.fillStyle = bg;
  if (!transparent) {
    ctx.fillRect(0, 0, s, s);
  } else {
    roundedRect(ctx, 0, 0, s, s, r);
    ctx.fill();
  }

  // Radial glow
  const glow = ctx.createRadialGradient(s * 0.5, s * 0.28, 0, s * 0.5, s * 0.28, s * 0.55);
  glow.addColorStop(0, 'rgba(38,105,68,0.45)');
  glow.addColorStop(1, 'rgba(38,105,68,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, s, s);

  // Deterministic grain
  let seed = 42;
  function srng() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 4294967296; }
  const step = Math.max(3, Math.floor(s / 100));
  ctx.save();
  for (let y = 0; y < s; y += step) {
    for (let x = 0; x < s; x += step) {
      const n = srng();
      if (n < 0.18) {
        ctx.beginPath();
        ctx.arc(x + srng() * step, y + srng() * step, srng() * 0.8 + 0.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${(n * 0.28).toFixed(3)})`;
        ctx.fill();
      }
    }
  }
  ctx.restore();

  // ₨ symbol
  const fontSize = s * 0.53;
  ctx.font = `900 ${fontSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = s * 0.04;
  ctx.shadowOffsetY = s * 0.025;
  ctx.fillStyle = '#FEFDF8';
  ctx.fillText('₨', s * 0.5, s * 0.44);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Gold accent line
  const lineY = s * 0.705;
  const lineH = Math.max(2, s * 0.018);
  const lineX = s * 0.12;
  const lineW = s * 0.76;
  const lineR2 = lineH / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(200,146,42,0.45)';
  ctx.shadowBlur = s * 0.025;
  ctx.shadowOffsetY = s * 0.008;

  const lineGrad = ctx.createLinearGradient(lineX, 0, lineX + lineW, 0);
  lineGrad.addColorStop(0, 'rgba(200,146,42,0.3)');
  lineGrad.addColorStop(0.15, '#C8922A');
  lineGrad.addColorStop(0.85, '#C8922A');
  lineGrad.addColorStop(1, 'rgba(200,146,42,0.3)');

  ctx.beginPath();
  ctx.moveTo(lineX + lineR2, lineY);
  ctx.lineTo(lineX + lineW - lineR2, lineY);
  ctx.quadraticCurveTo(lineX + lineW, lineY, lineX + lineW, lineY + lineH);
  ctx.lineTo(lineX + lineR2, lineY + lineH);
  ctx.quadraticCurveTo(lineX, lineY + lineH, lineX, lineY);
  ctx.closePath();
  ctx.fillStyle = lineGrad;
  ctx.fill();
  ctx.restore();

  if (!transparent) ctx.restore();

  return canvas;
}

// 1024×1024 main icon (for App Store, Expo icon)
const main = drawIcon(1024);
writeFileSync(`${OUT}/icon.png`, main.toBuffer('image/png'));
console.log('✓ assets/icon.png  (1024×1024)');

// Android adaptive foreground (transparent background, centered rupee)
const fg = drawIcon(1024, { transparent: true });
writeFileSync(`${OUT}/android-icon-foreground.png`, fg.toBuffer('image/png'));
console.log('✓ assets/android-icon-foreground.png  (1024×1024)');

// Favicon
const fav = drawIcon(48);
writeFileSync(`${OUT}/favicon.png`, fav.toBuffer('image/png'));
console.log('✓ assets/favicon.png  (48×48)');

// Splash icon (same design, larger clear zone)
const splash = drawIcon(512);
writeFileSync(`${OUT}/splash-icon.png`, splash.toBuffer('image/png'));
console.log('✓ assets/splash-icon.png  (512×512)');

console.log('\nAll icons generated. Run `npx expo start --clear` to pick them up.');
