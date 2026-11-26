/**
 * Headless Browser Dual-DOM Runner (render.ts)
 *
 * Uses playwright-core to launch an installed browser (Google Chrome, Microsoft Edge,
 * or standard Chromium) without heavy binary downloads. Captures the fully evaluated
 * client-side hydrated DOM after hydration microtasks settle, enabling deterministic
 * dual-DOM diffing in the CLI (--render).
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';

export interface RenderOptions {
  /** Timeout in milliseconds for navigation and content extraction (default: 20000ms) */
  timeoutMs?: number;
  /** Explicit browser channel to try ('chrome' | 'msedge' | 'chromium') */
  channel?: 'chrome' | 'msedge' | 'chromium';
  /** Custom browser executable path */
  executablePath?: string;
  /** Navigation wait condition ('domcontentloaded' | 'load' | 'networkidle') (default: 'domcontentloaded') */
  waitUntil?: 'domcontentloaded' | 'load' | 'networkidle';
  /** Additional stabilization delay in ms after load to let framework hydration settle (default: 500ms) */
  settleDelayMs?: number;
  /** Custom user-agent header */
  userAgent?: string;
}

export interface RenderResult {
  html: string;
  renderedVia: string;
  durationMs: number;
  success: boolean;
  error?: string;
}

/**
 * Attempts to launch a headless browser across candidate channels in sequence:
 * 1. Explicitly provided channel or executablePath
 * 2. 'chrome' (Google Chrome)
 * 3. 'msedge' (Microsoft Edge)
 * 4. Default Chromium (if installed via playwright)
 */
async function launchBrowser(options?: RenderOptions): Promise<{ browser: Browser; channelUsed: string }> {
  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ];

  if (options?.executablePath) {
    const browser = await chromium.launch({
      headless: true,
      executablePath: options.executablePath,
      args: launchArgs,
    });
    return { browser, channelUsed: `custom:${options.executablePath}` };
  }

  const candidateChannels: Array<'chrome' | 'msedge' | undefined> = options?.channel
    ? [options.channel === 'chromium' ? undefined : options.channel]
    : ['chrome', 'msedge', undefined];

  let lastError: unknown;
  for (const channel of candidateChannels) {
    try {
      const browser = await chromium.launch({
        headless: true,
        channel,
        args: launchArgs,
      });
      return { browser, channelUsed: channel ?? 'chromium' };
    } catch (err) {
      lastError = err;
      // Continue to next candidate channel
    }
  }

  throw new Error(
    `No headless browser available. Attempted channels: ${candidateChannels.map((c) => c ?? 'chromium').join(', ')}. ` +
      `Install Google Chrome, Microsoft Edge, or run 'npx playwright install chromium'. Original error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

/**
 * Renders a target URL or local file in a headless browser and returns the fully hydrated DOM HTML.
 */
export async function renderHydratedDom(url: string, options?: RenderOptions): Promise<RenderResult> {
  const startTime = Date.now();
  const timeout = options?.timeoutMs ?? 20000;
  const waitUntil = options?.waitUntil ?? 'domcontentloaded';
  const settleDelay = options?.settleDelayMs ?? 500;

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    const { browser: launchedBrowser, channelUsed } = await launchBrowser(options);
    browser = launchedBrowser;

    context = await browser.newContext({
      userAgent: options?.userAgent ?? 'Mozilla/5.0 (compatible; AgentLens-DualDOM/1.0; +https://agentlens.dev)',
      bypassCSP: true,
      ignoreHTTPSErrors: true,
    });

    page = await context.newPage();
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    await page.goto(url, { waitUntil, timeout });

    // Allow framework hydration (React 18/19, Vue, Svelte, Next.js streaming) to settle
    if (settleDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, settleDelay));
    }

    const html = await page.content();
    const durationMs = Date.now() - startTime;

    return {
      html,
      renderedVia: channelUsed,
      durationMs,
      success: true,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      html: '',
      renderedVia: 'none',
      durationMs,
      success: false,
      error: errorMessage,
    };
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // ignore
      }
    }
    if (context) {
      try {
        await context.close();
      } catch {
        // ignore
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
  }
}
