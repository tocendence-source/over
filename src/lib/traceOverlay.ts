import { damp } from "@/lib/motion";

/**
 * Pointer instrument overlay.
 *
 * The cursor behaves like a scanner: a reticle trails it, detection frames
 * lock onto the path it travels, and dashed connectors correlate them — the
 * same trace → correlate → verify idea the rest of the site describes.
 *
 * One 2D canvas, one rAF loop, no DOM nodes per detection. The loop sleeps
 * when the pointer is idle and the canvas simply keeps its last frame.
 */

const INK_LIGHT = { line: "235, 225, 205", gold: "209, 184, 135" };
const INK_DARK = { line: "38, 41, 33", gold: "112, 94, 57" };
type Ink = typeof INK_LIGHT;

const INTERACTIVE = 'a[href], button:not([disabled]), [role="tab"], summary, input, select';
const WORDS = ["TRACE", "NODE", "EDGE", "SCAN"];

type Detection = {
  cx: number;
  cy: number;
  w: number;
  h: number;
  born: number;
  life: number;
  ink: Ink;
  label: string | null;
};

export class TraceOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private width = 0;
  private height = 0;

  private frame = 0;
  private disposed = false;
  private lastTs = 0;
  private now = 0;
  private lastEvent = 0;

  /** Raw pointer target vs the damped reticle position. */
  private tx = -999;
  private ty = -999;
  private x = -999;
  private y = -999;
  private inside = false;
  private alpha = 0;

  private travel = 0;
  private gap = 150;
  private dwelled = false;
  private sampleAt = 0;
  private ink: Ink = INK_LIGHT;

  private hover: Element | null = null;
  private lock = { x: 0, y: 0, w: 0, h: 0, alpha: 0, placed: false };

  private detections: Detection[] = [];
  private spawned = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("pointermove", this.onMove, { passive: true });
    window.addEventListener("pointerdown", this.onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.onLeave);
    window.addEventListener("blur", this.onLeave);
  }

  /* ------------------------------------------------------------- events */

  private onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    if (this.inside) {
      // Real pointer travel, not the reticle's lag behind it.
      this.travel += Math.hypot(event.clientX - this.tx, event.clientY - this.ty);
      this.dwelled = false;
    } else {
      this.inside = true;
      this.x = event.clientX;
      this.y = event.clientY;
    }
    this.tx = event.clientX;
    this.ty = event.clientY;
    this.lastEvent = performance.now();
    this.wake();
  };

  private onDown = (event: PointerEvent) => {
    const target = event.target as Element | null;
    if (event.pointerType !== "mouse" || target?.closest?.(INTERACTIVE)) return;
    // A click on empty space commits a deliberate detection.
    this.spawn(event.clientX, event.clientY, true);
    this.lastEvent = performance.now();
    this.wake();
  };

  private onScroll = () => {
    this.lastEvent = performance.now();
    this.wake();
  };

  private onLeave = () => {
    this.inside = false;
    this.hover = null;
    this.lastEvent = performance.now();
    this.wake();
  };

  private resize = () => {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.lastEvent = performance.now();
    this.wake();
  };

  private wake() {
    if (this.frame || this.disposed) return;
    this.lastTs = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  /* ------------------------------------------------------------ sampling */

  /**
   * One hit test per ~110ms tells us both the hovered control and whether the
   * pointer sits on a light editorial section, so the ink stays readable.
   */
  private sample(ts: number) {
    if (ts - this.sampleAt < 110 || !this.inside) return;
    this.sampleAt = ts;
    const element = document.elementFromPoint(this.tx, this.ty);
    this.ink = element?.closest(".section-paper") ? INK_DARK : INK_LIGHT;
    const control = element?.closest(INTERACTIVE) ?? null;
    if (control !== this.hover) {
      this.hover = control;
      this.lock.placed = false;
    }
  }

  private spawn(cx: number, cy: number, deliberate = false) {
    if (this.detections.length > 11) this.detections.shift();
    const size = deliberate ? 54 : 26 + Math.random() * 46;
    const ratio = 0.62 + Math.random() * 0.85;
    this.spawned += 1;
    const labelled = this.spawned % 3 === 0;
    this.detections.push({
      cx,
      cy,
      w: Math.round(size * ratio + 18),
      h: Math.round(size),
      born: this.now,
      life: deliberate ? 2.8 : 1.5 + Math.random() * 0.9,
      ink: this.ink,
      label: labelled
        ? this.spawned % 6 === 0
          ? WORDS[Math.floor(this.spawned / 6) % WORDS.length]
          : `${Math.round(cx)}·${Math.round(cy)}`
        : null,
    });
  }

  /* --------------------------------------------------------------- draw */

  private frameRect(x: number, y: number, w: number, h: number, alpha: number, ink: Ink) {
    const ctx = this.ctx;
    ctx.strokeStyle = `rgba(${ink.line}, ${alpha * 0.7})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h));
  }

  private brackets(x: number, y: number, w: number, h: number, arm: number, alpha: number, ink: Ink) {
    const ctx = this.ctx;
    const l = Math.round(x) + 0.5;
    const t = Math.round(y) + 0.5;
    const r = l + Math.round(w);
    const b = t + Math.round(h);
    ctx.strokeStyle = `rgba(${ink.gold}, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(l, t + arm); ctx.lineTo(l, t); ctx.lineTo(l + arm, t);
    ctx.moveTo(r - arm, t); ctx.lineTo(r, t); ctx.lineTo(r, t + arm);
    ctx.moveTo(r, b - arm); ctx.lineTo(r, b); ctx.lineTo(r - arm, b);
    ctx.moveTo(l + arm, b); ctx.lineTo(l, b); ctx.lineTo(l, b - arm);
    ctx.stroke();
  }

  private text(value: string, x: number, y: number, alpha: number, ink: Ink) {
    const ctx = this.ctx;
    ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "1.4px";
    ctx.fillStyle = `rgba(${ink.gold}, ${alpha})`;
    ctx.fillText(value, Math.round(x), Math.round(y));
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  }

  /* --------------------------------------------------------------- loop */

  private tick = (ts: number) => {
    if (this.disposed) return;
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05);
    this.lastTs = ts;
    this.now = ts / 1000;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // A dialog owns the screen: stay quiet, but keep the loop alive.
    if (document.body.dataset.scrollLock === "true" || document.hidden) {
      this.frame = requestAnimationFrame(this.tick);
      return;
    }

    this.sample(ts);

    const moved = Math.hypot(this.tx - this.x, this.ty - this.y);
    this.x = damp(this.x, this.tx, 13, dt);
    this.y = damp(this.y, this.ty, 13, dt);
    this.alpha = damp(this.alpha, this.inside ? 1 : 0, 6, dt);

    // ---- detections follow the travelled path, but never while locked on
    if (this.inside && !this.hover) {
      if (this.travel > this.gap) {
        this.travel = 0;
        this.gap = 130 + Math.random() * 110;
        const angle = Math.random() * Math.PI * 2;
        const reach = 34 + Math.random() * 78;
        this.spawn(this.x + Math.cos(angle) * reach, this.y + Math.sin(angle) * reach * 0.7);
      } else if (!this.dwelled && ts - this.lastEvent > 520) {
        // The pointer came to rest: lock one frame where it stopped.
        this.dwelled = true;
        this.travel = 0;
        this.spawn(this.x, this.y, true);
      }
    }

    // ---- dashed correlation path between live detections
    const live = this.detections.filter((d) => this.now - d.born < d.life);
    this.detections = live;
    if (live.length > 1) {
      ctx.setLineDash([2, 5]);
      ctx.lineWidth = 1;
      for (let i = 1; i < live.length; i++) {
        const a = live[i - 1];
        const b = live[i];
        const fade = Math.min(1 - (this.now - a.born) / a.life, 1 - (this.now - b.born) / b.life);
        if (fade <= 0.05) continue;
        ctx.strokeStyle = `rgba(${b.ink.line}, ${fade * 0.3 * this.alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.cx, a.cy);
        ctx.lineTo(b.cx, b.cy);
        ctx.stroke();
      }
      const tail = live[live.length - 1];
      ctx.strokeStyle = `rgba(${tail.ink.gold}, ${0.26 * this.alpha})`;
      ctx.beginPath();
      ctx.moveTo(tail.cx, tail.cy);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ---- detection frames: overshoot, lock in, hold, release
    for (const d of live) {
      const t = (this.now - d.born) / d.life;
      const settle = Math.min(t / 0.16, 1);
      const ease = 1 - Math.pow(1 - settle, 3);
      const scale = 1.55 - 0.55 * ease;
      const alpha = (t > 0.72 ? 1 - (t - 0.72) / 0.28 : ease) * this.alpha;
      if (alpha <= 0.02) continue;
      const w = d.w * scale;
      const h = d.h * scale;
      const x = d.cx - w / 2;
      const y = d.cy - h / 2;
      this.frameRect(x, y, w, h, alpha, d.ink);
      if (ease > 0.98) this.brackets(x, y, w, h, 5, alpha * 0.85, d.ink);
      if (d.label) this.text(d.label, x, y - 7, alpha * 0.8, d.ink);
    }

    // ---- locked control: brackets snap to the element under the pointer
    let hovered = this.hover as HTMLElement | null;
    // A tab switch can detach the element that was under the pointer.
    if (hovered && !hovered.isConnected) {
      hovered = null;
      this.hover = null;
    }
    if (hovered) {
      const rect = hovered.getBoundingClientRect();
      if (rect.width < 1 && rect.height < 1) {
        hovered = null;
        this.hover = null;
      } else {
        const pad = 7;
        const target = { x: rect.left - pad, y: rect.top - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 };
        if (!this.lock.placed) {
          Object.assign(this.lock, target, { placed: true });
        } else {
          this.lock.x = damp(this.lock.x, target.x, 18, dt);
          this.lock.y = damp(this.lock.y, target.y, 18, dt);
          this.lock.w = damp(this.lock.w, target.w, 18, dt);
          this.lock.h = damp(this.lock.h, target.h, 18, dt);
        }
      }
    }
    this.lock.alpha = damp(this.lock.alpha, hovered ? 1 : 0, 9, dt);
    if (this.lock.alpha > 0.02) {
      const a = this.lock.alpha * this.alpha;
      this.brackets(this.lock.x, this.lock.y, this.lock.w, this.lock.h, 9, a * 0.9, this.ink);
    }

    // ---- reticle
    if (this.alpha > 0.02 && this.x > -900) {
      const a = this.alpha;
      const size = this.hover ? 9 : 13;
      const arm = this.hover ? 3 : 5;
      this.brackets(this.x - size, this.y - size, size * 2, size * 2, arm, a * 0.9, this.ink);
      ctx.strokeStyle = `rgba(${this.ink.line}, ${a * 0.34})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      const inner = size + 4;
      const outer = size + 13;
      ctx.moveTo(this.x - outer, this.y); ctx.lineTo(this.x - inner, this.y);
      ctx.moveTo(this.x + inner, this.y); ctx.lineTo(this.x + outer, this.y);
      ctx.moveTo(this.x, this.y - outer); ctx.lineTo(this.x, this.y - inner);
      ctx.moveTo(this.x, this.y + inner); ctx.lineTo(this.x, this.y + outer);
      ctx.stroke();
      ctx.fillStyle = `rgba(${this.ink.gold}, ${a * 0.9})`;
      ctx.fillRect(Math.round(this.x), Math.round(this.y), 1, 1);
      if (!this.hover) {
        this.text(`${Math.round(this.tx)} · ${Math.round(this.ty)}`, this.x + size + 12, this.y + size + 12, a * 0.55, this.ink);
      }
    }

    // Idle: keep the last frame on screen and release the loop.
    const idle = ts - this.lastEvent > 2600 && !live.length && this.lock.alpha < 0.03 && moved < 0.4;
    if (idle) {
      this.frame = 0;
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerdown", this.onDown);
    document.documentElement.removeEventListener("pointerleave", this.onLeave);
    window.removeEventListener("blur", this.onLeave);
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
