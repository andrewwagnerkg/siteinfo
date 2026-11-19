import type { Page } from '@playwright/test';

/**
 * In-page detectors shared by the specs. Each one is covered by
 * tests/detectors.spec.ts so it cannot silently stop finding problems.
 */

export interface LayoutProblem {
  kind: string;
  detail: string;
}

export async function layoutProblems(page: Page): Promise<LayoutProblem[]> {
  return page.evaluate(() => {
    const problems: { kind: string; detail: string }[] = [];
    const vw = document.documentElement.clientWidth;
    const describe = (el: Element) => {
      const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '';
      const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
      return `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls}> "${text}"`;
    };
    const isHidden = (el: Element) => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return true;
      }
      return false;
    };
    // Visually hidden (sr-only) elements are clipped to 1px and are fine.
    const isSrOnly = (el: Element) => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.position === 'absolute' && (style.getPropertyValue('clip') === 'rect(0px, 0px, 0px, 0px)' || style.clipPath === 'inset(50%)')) return true;
        if (node.getBoundingClientRect().width <= 1 && style.overflow === 'hidden') return true;
      }
      return false;
    };
    // Inside an element that scrolls horizontally on its own (tables, code) is allowed.
    const insideScroller = (el: Element) => {
      for (let node: Element | null = el.parentElement; node; node = node.parentElement) {
        const ox = getComputedStyle(node).overflowX;
        if ((ox === 'auto' || ox === 'scroll') && node !== document.documentElement && node !== document.body) return true;
      }
      return false;
    };

    if (document.documentElement.scrollWidth > vw) {
      problems.push({ kind: 'page scroll', detail: `documentElement.scrollWidth ${document.documentElement.scrollWidth} > ${vw}` });
    }
    if (document.body.scrollWidth > vw) {
      problems.push({ kind: 'page scroll', detail: `body.scrollWidth ${document.body.scrollWidth} > ${vw} (hidden by overflow-x: hidden)` });
    }

    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) continue;
      if (isHidden(el) || isSrOnly(el) || insideScroller(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;

      // Decorative pseudo-layers (glows) are absolutely positioned and clipped by a parent.
      if (rect.right > vw + 1 || rect.left < -1) {
        let clipped = false;
        for (let node: Element | null = el.parentElement; node && node !== document.body; node = node.parentElement) {
          const s = getComputedStyle(node);
          if (s.overflowX === 'hidden' || s.overflowX === 'clip') {
            const r = node.getBoundingClientRect();
            if (r.right <= vw + 1 && r.left >= -1) clipped = true;
            break;
          }
        }
        if (!clipped) problems.push({ kind: 'element wider than viewport', detail: `${describe(el)} left=${Math.round(rect.left)} right=${Math.round(rect.right)} vw=${vw}` });
      }

      // Text that does not fit its box (long ru/ky words, nowrap labels).
      const style = getComputedStyle(el);
      const hasOwnText = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
      if (hasOwnText && style.display !== 'inline' && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
        problems.push({ kind: 'text overflows its box', detail: `${describe(el)} scrollWidth=${el.scrollWidth} clientWidth=${el.clientWidth} overflow=${style.overflowX}` });
      }

      // Images: inside the viewport and not distorted.
      if (el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0 && style.objectFit !== 'cover' && style.objectFit !== 'contain') {
        const natural = el.naturalWidth / el.naturalHeight;
        const rendered = rect.width / rect.height;
        if (Math.abs(natural - rendered) / natural > 0.02) {
          problems.push({ kind: 'distorted image', detail: `${el.currentSrc} natural ${natural.toFixed(2)} rendered ${rendered.toFixed(2)}` });
        }
      }
    }
    return problems;
  });
}

export async function smallTouchTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const MIN = 44;
    const targets = Array.from(document.querySelectorAll<HTMLElement>('a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"]'));
    for (const el of targets) {
      const style = getComputedStyle(el);
      if (el.closest('[hidden]') || style.visibility === 'hidden') continue;
      let rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      // sr-only skip link is only visible on focus; checked in a11y.spec.ts.
      if (rect.width <= 1 || rect.height <= 1) continue;
      // WCAG 2.5.8 exception: links inside a sentence / block of text.
      const block = el.parentElement?.closest('p, li, dd, td, blockquote, figcaption');
      const inline = style.display === 'inline';
      if (inline && block && (block.textContent ?? '').trim().length > (el.textContent ?? '').trim().length + 1 && !block.closest('nav')) continue;
      if (el.closest('.prose-content') && inline) continue;
      // Card title link is stretched over the whole card with ::after.
      const after = getComputedStyle(el, '::after');
      if (after.position === 'absolute' && after.content !== 'none') {
        const card = el.closest('.card');
        if (card) rect = card.getBoundingClientRect();
      }
      if (rect.width < MIN - 0.5 || rect.height < MIN - 0.5) {
        const text = (el.textContent ?? el.getAttribute('aria-label') ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
        out.push(`<${el.tagName.toLowerCase()}> "${text}" ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    }
    return out;
  });
}


export interface ContrastIssue {
  text: string;
  ratio: number;
  required: number;
  fg: string;
  bg: string;
}

/** Returns text elements whose contrast is below WCAG AA (4.5:1, large text 3:1). */
export async function contrastIssues(page: Page): Promise<{ issues: ContrastIssue[]; skipped: number }> {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    // Converts any CSS color (rgb, oklch, color-mix result...) to sRGB via canvas.
    const toRgba = (color: string): [number, number, number, number] => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0, (d[3] ?? 0) / 255];
    };
    type Rgba = [number, number, number, number];
    const blend = (top: Rgba, bottom: Rgba): Rgba => {
      const a = top[3];
      const mix = (i: 0 | 1 | 2) => top[i] * a + bottom[i] * (1 - a);
      return [mix(0), mix(1), mix(2), 1];
    };
    const channel = (v: number) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (c: Rgba) => 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
    const ratio = (a: Rgba, b: Rgba) => {
      const la = luminance(a);
      const lb = luminance(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };

    /** Effective background behind an element, or null if it is an image/gradient. */
    const background = (el: Element): Rgba | null => {
      const layers: Rgba[] = [];
      for (let node: Element | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.backgroundImage && style.backgroundImage !== 'none') return null;
        const color = toRgba(style.backgroundColor);
        if (color[3] > 0) {
          layers.push(color);
          if (color[3] >= 1) break;
        }
      }
      let result: Rgba = [255, 255, 255, 1];
      // Canvas/root default when nothing is opaque: the page background color.
      const rootBg = toRgba(getComputedStyle(document.documentElement).backgroundColor);
      const bodyBg = toRgba(getComputedStyle(document.body).backgroundColor);
      if (rootBg[3] >= 1) result = rootBg;
      else if (bodyBg[3] >= 1) result = bodyBg;
      for (const layer of layers.reverse()) result = blend(layer, result);
      return result;
    };

    const issues: { text: string; ratio: number; required: number; fg: string; bg: string }[] = [];
    let skipped = 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      const el = node.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      if (el.closest('script, style, noscript, [aria-hidden="true"]')) continue;
      // Disabled controls are exempt from WCAG 1.4.3.
      if (el.closest('fieldset:disabled, :disabled')) continue;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.visibility === 'hidden' || rect.width <= 1 || rect.height <= 1) continue;
      let opacity = 1;
      for (let n: Element | null = el; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
      if (opacity === 0) continue;

      const bg = background(el);
      if (!bg) {
        skipped++;
        continue;
      }
      const fgRaw = toRgba(style.color);
      const fg = blend([fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * opacity], bg);
      const size = parseFloat(style.fontSize);
      const weight = Number(style.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const required = large ? 3 : 4.5;
      const value = ratio(fg, bg);
      if (value < required - 0.01) {
        issues.push({
          text: `<${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).trim().split(/\s+/).slice(0, 3).join('.')}` : ''}> "${node.textContent.trim().slice(0, 40)}"`,
          ratio: Math.round(value * 100) / 100,
          required,
          fg: `rgb(${fg.slice(0, 3).map(Math.round).join(',')})`,
          bg: `rgb(${bg.slice(0, 3).map(Math.round).join(',')})`,
        });
      }
    }
    return { issues, skipped };
  });
}

