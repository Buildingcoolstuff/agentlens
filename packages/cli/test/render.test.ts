import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { renderHydratedDom } from '../src/render.js';
import { auditCommand } from '../src/commands/audit.js';

describe('agentlens CLI — Headless Browser Dual-DOM Mode (render.ts, Issue #35)', () => {
  it('renders a local HTML file and evaluates client-side DOM mutations', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlens-render-test-'));
    const htmlFile = path.join(tmpDir, 'page.html');

    const htmlContent = `<!DOCTYPE html>
<html>
  <head><title>Hydration Parity Test</title></head>
  <body>
    <main>
      <h1>Product Catalog</h1>
      <div id="ssr-summary">Direct SSR definition of the product catalog.</div>
      <div id="container"></div>
    </main>
    <script>
      const p = document.createElement('div');
      p.id = 'ghost-price';
      p.className = 'price-tag';
      p.textContent = '$499.00 USD';
      document.getElementById('container').appendChild(p);
    </script>
  </body>
</html>`;

    fs.writeFileSync(htmlFile, htmlContent, 'utf8');

    try {
      const fileUrl = pathToFileURL(htmlFile).href;
      const result = await renderHydratedDom(fileUrl, { timeoutMs: 15000, settleDelayMs: 200 });

      expect(result.success).toBe(true);
      expect(result.durationMs).toBeGreaterThan(0);
      expect(['chrome', 'msedge', 'chromium']).toContain(result.renderedVia);
      expect(result.html).toContain('id="ghost-price"');
      expect(result.html).toContain('$499.00 USD');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('gracefully handles missing browser or invalid executable path', async () => {
    const result = await renderHydratedDom('https://example.com', {
      executablePath: '/non/existent/path/to/browser/binary',
    });

    expect(result.success).toBe(false);
    expect(result.html).toBe('');
    expect(result.renderedVia).toBe('none');
    expect(result.error).toBeDefined();
  });

  it('executes auditCommand with --render flag without throwing', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentlens-audit-render-'));
    const htmlFile = path.join(tmpDir, 'index.html');

    const samplePage = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Acme Cloud Services</title>
  </head>
  <body>
    <main>
      <h1>Acme Cloud Services</h1>
      <p>Acme Cloud Services is an enterprise cloud computing and automated infrastructure management platform that delivers 99.99% uptime, unified database replication, and zero-trust authentication across thirty global availability regions.</p>
      <div id="client-target"></div>
    </main>
    <script>
      const el = document.createElement('span');
      el.id = 'live-pricing';
      el.textContent = '$129.00 / month';
      document.getElementById('client-target').appendChild(el);
    </script>
  </body>
</html>`;

    fs.writeFileSync(htmlFile, samplePage, 'utf8');
    const prevCwd = process.cwd();
    process.chdir(tmpDir);

    try {
      // Should complete without uncaught exceptions
      await expect(
        auditCommand(htmlFile, {
          render: true,
          threshold: '0',
          badge: false,
        })
      ).resolves.not.toThrow();

      // Dynamic badge file should be generated
      expect(fs.existsSync(path.join(tmpDir, 'agentlens-badge.svg'))).toBe(true);
    } finally {
      process.chdir(prevCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
