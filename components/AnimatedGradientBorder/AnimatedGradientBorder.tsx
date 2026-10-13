import React, {useEffect, useRef} from 'react';
import './AnimatedGradientBorder.css';

export type GradientLineConfig = {
  colors: string[];
  alpha: number[];
  width: number;
  length: number;
  opacity: number;
  enabled: boolean;
};

export type AnimatedGradientBorderConfig = {
  version: number;
  duration: number;
  phaseOffset: number;
  waves: number;
  base: GradientLineConfig;
  overlay: GradientLineConfig;
};

type Point = {x: number; y: number};
type Rgb = [number, number, number];

function pointOnRoundedRect(distance: number, width: number, height: number, radius: number): Point {
  const r = Math.min(radius, width / 2, height / 2);
  const horizontal = width - 2 * r;
  const vertical = height - 2 * r;
  const corner = Math.PI * r / 2;
  const perimeter = 2 * (horizontal + vertical) + 4 * corner;
  let position = ((distance % perimeter) + perimeter) % perimeter;

  if (position < horizontal) return {x: r + position, y: 0};
  position -= horizontal;
  if (position < corner) {
    const angle = -Math.PI / 2 + position / r;
    return {x: width - r + r * Math.cos(angle), y: r + r * Math.sin(angle)};
  }
  position -= corner;
  if (position < vertical) return {x: width, y: r + position};
  position -= vertical;
  if (position < corner) {
    const angle = position / r;
    return {x: width - r + r * Math.cos(angle), y: height - r + r * Math.sin(angle)};
  }
  position -= corner;
  if (position < horizontal) return {x: width - r - position, y: height};
  position -= horizontal;
  if (position < corner) {
    const angle = Math.PI / 2 + position / r;
    return {x: r + r * Math.cos(angle), y: height - r + r * Math.sin(angle)};
  }
  position -= corner;
  if (position < vertical) return {x: 0, y: height - r - position};
  position -= vertical;
  const angle = Math.PI + position / r;
  return {x: r + r * Math.cos(angle), y: r + r * Math.sin(angle)};
}

function parseColor(hex: string): Rgb {
  const value = hex.replace('#', '');
  return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16)) as Rgb;
}

function colorAt(stops: Rgb[], position: number): Rgb {
  const firstHalf = position <= .5;
  const from = stops[firstHalf ? 0 : 1];
  const to = stops[firstHalf ? 1 : 2];
  const amount = firstHalf ? position * 2 : (position - .5) * 2;
  return from.map((channel, index) => Math.round(channel + (to[index] - channel) * amount)) as Rgb;
}

function alphaAt(stops: number[], position: number): number {
  const firstHalf = position <= .5;
  const from = stops[firstHalf ? 0 : 1];
  const to = stops[firstHalf ? 1 : 2];
  const amount = firstHalf ? position * 2 : (position - .5) * 2;
  return from + (to - from) * amount;
}

export function AnimatedGradientBorder({config}: {config: AnimatedGradientBorderConfig}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !host || !context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const lines = [config.base, config.overlay].map(line => ({...line, rgb: line.colors.map(parseColor)}));
    let width = 0;
    let height = 0;
    let radius = 0;
    let perimeter = 0;
    let elapsed = 0;
    let lastFrame = performance.now();
    let animationFrame = 0;
    let inView = true;

    const render = (progress: number) => {
      if (width < 8 || height < 8) return;
      context.clearRect(0, 0, width, height);
      const inset = 4;
      const pathWidth = width - inset * 2;
      const pathHeight = height - inset * 2;

      const drawLine = (line: GradientLineConfig & {rgb: Rgb[]}, center: number) => {
        if (!line.enabled) return;
        // Length and phase offset are angular values from the supplied configuration.
        const span = perimeter * line.length / 360;
        const start = center - span / 2;
        const step = Math.min(1, span / 80);
        context.lineWidth = line.width;
        context.lineCap = 'butt';
        for (let offset = 0; offset < span; offset += step) {
          const end = Math.min(offset + step, span);
          const fraction = (offset + end) / (2 * span);
          const alpha = alphaAt(line.alpha, fraction) / 100 * line.opacity / 100;
          if (alpha <= 0) continue;
          const color = colorAt(line.rgb, fraction);
          const from = pointOnRoundedRect(start + offset, pathWidth, pathHeight, radius);
          const to = pointOnRoundedRect(start + end, pathWidth, pathHeight, radius);
          context.beginPath();
          context.moveTo(from.x + inset, from.y + inset);
          context.lineTo(to.x + inset, to.y + inset);
          context.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
          context.stroke();
        }
      };

      for (let index = 0; index < config.waves; index++) {
        const center = (progress + index * config.phaseOffset / 360) * perimeter;
        drawLine(lines[0], center);
        drawLine(lines[1], center);
      }
    };

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const inset = 4;
      radius = Math.max(0, parseFloat(getComputedStyle(host).borderTopLeftRadius) - inset);
      const innerWidth = Math.max(0, width - inset * 2);
      const innerHeight = Math.max(0, height - inset * 2);
      const r = Math.min(radius, innerWidth / 2, innerHeight / 2);
      perimeter = 2 * (innerWidth + innerHeight - 4 * r) + 2 * Math.PI * r;
      render(reducedMotion.matches ? 0 : elapsed / (config.duration * 1000) % 1);
    };

    const tick = (now: number) => {
      elapsed += Math.max(0, now - lastFrame);
      lastFrame = now;
      render(elapsed / (config.duration * 1000) % 1);
      animationFrame = requestAnimationFrame(tick);
    };

    const syncAnimation = () => {
      cancelAnimationFrame(animationFrame);
      if (reducedMotion.matches) {
        render(0);
      } else if (inView && !document.hidden) {
        lastFrame = performance.now();
        animationFrame = requestAnimationFrame(tick);
      }
    };

    const sizeObserver = new ResizeObserver(resize);
    const viewObserver = new IntersectionObserver(entries => {
      inView = entries[0]?.isIntersecting ?? true;
      syncAnimation();
    });
    sizeObserver.observe(host);
    viewObserver.observe(host);
    document.addEventListener('visibilitychange', syncAnimation);
    reducedMotion.addEventListener('change', syncAnimation);
    resize();
    syncAnimation();

    return () => {
      cancelAnimationFrame(animationFrame);
      sizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener('visibilitychange', syncAnimation);
      reducedMotion.removeEventListener('change', syncAnimation);
    };
  }, [config]);

  return <canvas ref={canvasRef} className="animated-gradient-border" aria-hidden="true"/>;
}
