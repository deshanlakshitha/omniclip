import { type Block, type PickerMode } from '@omniclip/shared';
import { extractBlock } from './extract.js';

type CaptureHandler = (block: Block) => void;
type CancelHandler = () => void;

export class ElementPicker {
  private overlay: HTMLDivElement;
  private label: HTMLDivElement;
  private region: HTMLDivElement;
  private current: Element | null = null;
  private mode: PickerMode = 'off';
  private regionStart: { x: number; y: number } | null = null;

  constructor(
    private onCapture: CaptureHandler,
    private onCancel: CancelHandler,
  ) {
    this.overlay = this.makeEl('omniclip-overlay');
    this.label = this.makeEl('omniclip-label');
    this.region = this.makeEl('omniclip-region');
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  private makeEl(cls: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = cls;
    el.style.display = 'none';
    return el;
  }

  private ensureMounted() {
    for (const el of [this.overlay, this.label, this.region]) {
      if (!el.isConnected) document.documentElement.appendChild(el);
    }
  }

  setMode(mode: PickerMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === 'off') {
      this.stop();
      return;
    }
    this.start();
  }

  private start() {
    this.ensureMounted();
    document.documentElement.classList.add('omniclip-picking');
    document.addEventListener('mousemove', this.onMouseMove, true);
    document.addEventListener('click', this.onClick, true);
    document.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('wheel', this.onWheel, { capture: true, passive: false });
    if (this.mode === 'region') {
      document.addEventListener('mousedown', this.onMouseDown, true);
      document.addEventListener('mouseup', this.onMouseUp, true);
    }
  }

  private stop() {
    document.documentElement.classList.remove('omniclip-picking');
    document.removeEventListener('mousemove', this.onMouseMove, true);
    document.removeEventListener('click', this.onClick, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    document.removeEventListener('wheel', this.onWheel, true);
    document.removeEventListener('mousedown', this.onMouseDown, true);
    document.removeEventListener('mouseup', this.onMouseUp, true);
    this.overlay.style.display = 'none';
    this.label.style.display = 'none';
    this.region.style.display = 'none';
    this.current = null;
    this.regionStart = null;
  }

  private isOurEl(el: Element | null): boolean {
    return (
      el === this.overlay ||
      el === this.label ||
      el === this.region ||
      (el?.className?.toString().startsWith('omniclip-') ?? false)
    );
  }

  private highlight(el: Element) {
    const rect = el.getBoundingClientRect();
    Object.assign(this.overlay.style, {
      display: 'block',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    const tag = el.tagName.toLowerCase();
    const cls = el.className && typeof el.className === 'string' ? `.${el.className.split(' ')[0]}` : '';
    this.label.textContent = `${tag}${cls}  ·  click to capture · Alt+scroll to widen`;
    Object.assign(this.label.style, {
      display: 'block',
      left: `${rect.left}px`,
      top: `${Math.max(rect.top - 24, 2)}px`,
    });
  }

  private onMouseMove(e: MouseEvent) {
    if (this.mode === 'region' && this.regionStart) {
      this.drawRegion(e.clientX, e.clientY);
      return;
    }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || this.isOurEl(el)) return;
    this.current = el;
    this.highlight(el);
  }

  private onWheel(e: WheelEvent) {
    if (!e.altKey || !this.current) return;
    e.preventDefault();
    if (e.deltaY < 0 && this.current.parentElement) {
      this.current = this.current.parentElement;
    } else if (e.deltaY > 0 && this.current.firstElementChild) {
      this.current = this.current.firstElementChild;
    }
    this.highlight(this.current);
  }

  private onClick(e: MouseEvent) {
    if (this.mode !== 'element') return;
    if (!this.current || this.isOurEl(this.current)) return;
    e.preventDefault();
    e.stopPropagation();
    const block = extractBlock(this.current);
    this.onCapture(block);
    this.flash();
  }

  private onMouseDown(e: MouseEvent) {
    if (this.mode !== 'region') return;
    this.regionStart = { x: e.clientX, y: e.clientY };
  }

  private onMouseUp(e: MouseEvent) {
    if (this.mode !== 'region' || !this.regionStart) return;
    const x1 = Math.min(this.regionStart.x, e.clientX);
    const y1 = Math.min(this.regionStart.y, e.clientY);
    const x2 = Math.max(this.regionStart.x, e.clientX);
    const y2 = Math.max(this.regionStart.y, e.clientY);
    this.regionStart = null;
    this.region.style.display = 'none';
    if (x2 - x1 < 8 || y2 - y1 < 8) return;
    this.captureRegion(x1, y1, x2, y2);
  }

  private drawRegion(cx: number, cy: number) {
    if (!this.regionStart) return;
    const x = Math.min(this.regionStart.x, cx);
    const y = Math.min(this.regionStart.y, cy);
    Object.assign(this.region.style, {
      display: 'block',
      left: `${x}px`,
      top: `${y}px`,
      width: `${Math.abs(cx - this.regionStart.x)}px`,
      height: `${Math.abs(cy - this.regionStart.y)}px`,
    });
  }

  private captureRegion(x1: number, y1: number, x2: number, y2: number) {
    const texts: string[] = [];
    const seen = new Set<Element>();
    document.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,span,td,th,figcaption').forEach((el) => {
      const r = el.getBoundingClientRect();
      const intersects = r.left < x2 && r.right > x1 && r.top < y2 && r.bottom > y1;
      if (intersects && !seen.has(el)) {
        const t = (el as HTMLElement).innerText?.trim();
        if (t && t.length > 1) {
          texts.push(t);
          seen.add(el);
        }
      }
    });
    const merged = texts.join('\n\n');
    const block = extractBlock(document.body); // base; we override below
    block.type = 'region';
    block.text = merged;
    block.source.boundingRect = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
    this.onCapture(block);
    this.flash();
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.onCancel();
    }
  }

  private flash() {
    const toast = document.createElement('div');
    toast.className = 'omniclip-toast';
    toast.textContent = 'Captured to OmniClip';
    document.documentElement.appendChild(toast);
    setTimeout(() => toast.remove(), 900);
  }
}
