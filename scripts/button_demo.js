/**
 * Button style demo — renders button variants ON the actual aurora engage gradient.
 * Shows exactly how each button reads against the purple→teal slide background.
 *
 * Usage: node scripts/button_demo.js
 */

const path = require('path');
const fs   = require('fs');
const PROJECT  = path.resolve(__dirname, '..');
const FRONTEND = path.join(PROJECT, 'frontend');
const { chromium } = require(path.join(FRONTEND, 'node_modules/@playwright/test'));

const OUT = path.join(PROJECT, 'backend/outputs/test-runs/_multi/button_demo.png');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const dataUrl = await page.evaluate(() => {
    return new Promise((resolve) => {
      const W = 1080, H = 1080;
      const C = document.createElement('canvas');
      C.width = W; C.height = H;
      const ctx = C.getContext('2d');

      const PRIMARY = '#7C6EFA', SECONDARY = '#2DD4BF';

      // ── Engage-style gradient background ──────────────────────────────────────
      const bg = ctx.createLinearGradient(W, 0, 0, H);
      bg.addColorStop(0, PRIMARY);
      bg.addColorStop(1, SECONDARY);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Slight dark overlay for depth (matches aurora_engage createGradientBg)
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, W, H);

      // ── Title ─────────────────────────────────────────────────────────────────
      ctx.fillStyle = 'rgba(255,255,255,0.90)';
      ctx.font = 'bold 28px "Syne", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Button styles on Engage background', W / 2, 52);

      const BTN_TEXT = 'Hit Follow — it\'s worth it';
      const BTN_W = 420, BTN_H = 64;
      const R = BTN_H / 2;

      const styles = [
        // B3 first — user is interested in this
        { id: 'b3', name: 'Frosted Glow',   desc: 'Translucent white + bright border + purple glow' },
        // New: Semi-dark pill with white border — reads clearly on gradient
        { id: 'b5', name: 'Dark Pill',       desc: 'Dark semi-opaque center, clean white border' },
        // New: Inverse solid — deep dark fill, gradient text
        { id: 'b6', name: 'Dark + Gradient text', desc: 'Solid dark pill, gradient text pops on color bg' },
        // B4 solid white
        { id: 'b4', name: 'Solid White',     desc: 'Pure white pill, gradient text inside' },
        // B2 ghost
        { id: 'b2', name: 'Ghost Gradient',  desc: 'Transparent + gradient border + gradient text' },
        // B1 gradient fill
        { id: 'b1', name: 'Gradient Fill',   desc: 'Same gradient as bg — blends in on this slide' },
      ];

      styles.forEach((s, i) => {
        const y = 90 + i * 155;
        const x = (W - BTN_W) / 2;

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = 'bold 20px "Syne", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${s.id.toUpperCase()}: ${s.name}`, x, y + 6);
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.font = '14px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(s.desc, x, y + 24);

        const by = y + 38;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, by, BTN_W, BTN_H, R);

        if (s.id === 'b3') {
          // Frosted glow — translucent white + white border + glow
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fill();
          ctx.shadowColor = 'rgba(255,255,255,0.45)';
          ctx.shadowBlur = 20;
          ctx.strokeStyle = 'rgba(255,255,255,0.75)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(BTN_TEXT, x + BTN_W / 2, by + BTN_H / 2 + 6);

        } else if (s.id === 'b5') {
          // Dark pill
          ctx.fillStyle = 'rgba(9,9,9,0.55)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.70)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(BTN_TEXT, x + BTN_W / 2, by + BTN_H / 2 + 6);

        } else if (s.id === 'b6') {
          // Solid dark + gradient text
          ctx.fillStyle = 'rgba(9,9,9,0.72)';
          ctx.fill();
          const gt = ctx.createLinearGradient(x, 0, x + BTN_W * 0.9, 0);
          gt.addColorStop(0, '#A78BFA'); gt.addColorStop(1, '#5EEAD4');
          ctx.fillStyle = gt;
          ctx.font = 'bold 18px "Syne", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(BTN_TEXT, x + BTN_W / 2, by + BTN_H / 2 + 6);

        } else if (s.id === 'b4') {
          // Solid white + gradient text
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          const gt = ctx.createLinearGradient(x + BTN_W * 0.1, 0, x + BTN_W * 0.9, 0);
          gt.addColorStop(0, PRIMARY); gt.addColorStop(1, SECONDARY);
          ctx.fillStyle = gt;
          ctx.font = 'bold 18px "Syne", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(BTN_TEXT, x + BTN_W / 2, by + BTN_H / 2 + 6);

        } else if (s.id === 'b2') {
          // Ghost gradient border + gradient text
          const gBorder = ctx.createLinearGradient(x, 0, x + BTN_W, 0);
          gBorder.addColorStop(0, '#fff'); gBorder.addColorStop(1, '#fff');
          ctx.strokeStyle = 'rgba(255,255,255,0.80)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.90)';
          ctx.font = 'bold 18px "Syne", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(BTN_TEXT, x + BTN_W / 2, by + BTN_H / 2 + 6);

        } else if (s.id === 'b1') {
          // Gradient fill — same as bg
          const gBtn = ctx.createLinearGradient(x, 0, x + BTN_W, 0);
          gBtn.addColorStop(0, PRIMARY); gBtn.addColorStop(1, SECONDARY);
          ctx.fillStyle = gBtn;
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.font = 'bold 18px "Syne", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(BTN_TEXT, x + BTN_W / 2, by + BTN_H / 2 + 6);
        }

        ctx.restore();
      });

      resolve(C.toDataURL('image/png'));
    });
  });

  await browser.close();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`\n✅ Button demo saved: ${OUT}\n`);
})();
