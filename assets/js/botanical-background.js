(() => {
  "use strict";

  const background = document.querySelector("[data-botanical-background]");
  if (!background) return;

  // Keep the static drawing when motion is unwanted or no precise pointer exists.
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)");
  const settings = { radius: 190, leafDegrees: 11, decayMs: 900, settleMs: 7500 };
  const originals = [...background.querySelectorAll(".botanical-background__plant")];
  let parts = [];
  let tendrils = [];
  let gutterWidth = 0;

  function arrange() {
    background.querySelectorAll("[data-botanical-copy]").forEach((plant) => plant.remove());
    originals.forEach((plant) => plant.removeAttribute("style"));
    const main = document.querySelector('[role="main"]');
    const gutter = Math.max(0, (main ? main.getBoundingClientRect().left : (innerWidth - 950) / 2) - 12);
    gutterWidth = gutter;
    background.style.setProperty("--botanical-gutter", `${gutter}px`);
    // Calculate stops here: the CSS minifier corrupts nested calc(var(...)) expressions.
    background.style.setProperty("--botanical-fade-left", `${Math.max(0, gutter - 60)}px`);
    background.style.setProperty("--botanical-edge-left", `${gutter}px`);
    background.style.setProperty("--botanical-edge-right", `${innerWidth - gutter}px`);
    background.style.setProperty("--botanical-fade-right", `${innerWidth - Math.max(0, gutter - 60)}px`);
    if (innerWidth >= 768) {
      // Repeat the artwork at a readable scale rather than enlarging it on wide displays.
      const columns = Math.max(1, Math.ceil(gutter / 240));
      const rows = Math.max(3, Math.ceil(innerHeight / 340) + 1);
      const spacing = Math.max(150, gutter / columns);
      for (let index = 0; index < rows * columns * 2; index += 1) {
        let plant = originals[index];
        if (!plant) {
          plant = originals[index % originals.length].cloneNode(true);
          plant.dataset.botanicalCopy = "";
          background.append(plant);
        }
        const side = index % 2;
        const column = Math.floor(index / 2) % columns;
        const row = Math.floor(index / (columns * 2));
        Object.assign(plant.style, {
          width: "320px",
          left: side ? "auto" : `${column * spacing - 70}px`,
          right: side ? `${column * spacing - 70}px` : "auto",
          top: `${row * 340 - 70 - (column % 2) * 100}px`,
          transform: `rotate(${(row + column) % 2 ? -14 : 12}deg) scaleX(${side ? -1 : 1})`,
        });
      }
    }
    tendrils = [...background.querySelectorAll("[data-botanical-tendril]")].map((element) => ({
      element,
      tx: Number(element.dataset.tangentX),
      ty: Number(element.dataset.tangentY),
      x: Number(element.dataset.x),
      y: Number(element.dataset.y),
      progress: 0,
      dx: 0,
      dy: 0,
    }));
    parts = [];
    background.querySelectorAll("[data-botanical-stem]").forEach((stem) => {
      parts.push({ element: stem, origin: "150 0", degrees: 7, angle: 0, impulse: 0 });
    });
    background.querySelectorAll("[data-botanical-leaf]").forEach((leaf) => {
      parts.push({ element: leaf, origin: "0 0", degrees: settings.leafDegrees, angle: 0, impulse: 0 });
    });
    tendrils.forEach((tip) => {
      tip.stem = parts.find((part) => part.element === tip.element.parentNode);
    });
  }

  let frame = 0;
  let lastTime = 0;
  let lastMove = -Infinity;
  let position = null;
  let bounds = [];
  let enabled = false;

  function measure() {
    // Measure only at rest: animated geometry must not move the interaction area.
    bounds = parts.map(({ element }) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    // Layout is fixed between resizes. Apply the stem's animated rotation numerically.
    tendrils.forEach((tip) => {
      tip.matrix = tip.element.getScreenCTM();
      tip.inverse = tip.matrix.inverse();
    });
  }

  function setTransform(part, value) {
    if (part.transform === value) return;
    part.transform = value;
    if (value === null) part.element.removeAttribute("transform");
    else part.element.setAttribute("transform", value);
  }

  function clearTendril(tip) {
    if (!tip.drawn) return;
    tip.element.removeAttribute("d");
    tip.drawn = false;
  }

  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    position = null;
    lastMove = -Infinity;
    tendrils.forEach((tip) => {
      tip.dx = tip.dy = tip.progress = 0;
      clearTendril(tip);
    });
    parts.forEach((part) => {
      part.angle = 0;
      part.impulse = 0;
      setTransform(part, null);
    });
  }

  function animate(time) {
    const dt = Math.min(time - lastTime, 50);
    lastTime = time;
    const age = time - lastMove;
    let moving = false;
    const swayEasing = 1 - Math.exp(-dt / settings.decayMs);
    const followEasing = 1 - Math.exp(-dt / 2400);
    parts.forEach((part, index) => {
      if (age >= settings.settleMs) {
        part.angle = part.impulse = 0;
        setTransform(part, null);
        return;
      }
      const distance = position ? Math.hypot(bounds[index].x - position.x, bounds[index].y - position.y) : Infinity;
      const proximity = Math.max(0, 1 - distance / settings.radius);
      const direction = position && position.x < bounds[index].x ? 1 : -1;
      const target = age < 550 ? direction * proximity * proximity : 0;
      part.impulse += (target - part.impulse) * swayEasing;
      // Slightly different phases let individual leaves respond like a soft breeze.
      const rustle = 1 + 0.22 * Math.sin(age / 650 + index * 0.7);
      part.angle = part.impulse * part.degrees * rustle;
      if (Math.abs(part.angle) > 0.003) moving = true;
      setTransform(part, `rotate(${part.angle.toFixed(4)} ${part.origin})`);
    });
    // Extend only the two nearest tips, in SVG coordinates, from their existing curls.
    const inMargin = position && (position.x < gutterWidth || position.x > innerWidth - gutterWidth);
    let nearest = null;
    let second = null;
    if (inMargin) {
      tendrils.forEach((tip) => {
        // Match the precision of the SVG rotation, including mirrored motifs.
        const angle = (Number(tip.stem.angle.toFixed(4)) * Math.PI) / 180;
        tip.cos = Math.cos(angle);
        tip.sin = Math.sin(angle);
        const x = 150 + (tip.x - 150) * tip.cos - tip.y * tip.sin;
        const y = (tip.x - 150) * tip.sin + tip.y * tip.cos;
        const m = tip.matrix;
        tip.distance = Math.hypot(m.a * x + m.c * y + m.e - position.x, m.b * x + m.d * y + m.f - position.y);
        if (tip.distance <= 8 || tip.distance >= settings.radius) return;
        if (!nearest || tip.distance < nearest.distance) {
          second = nearest;
          nearest = tip;
        } else if (!second || tip.distance < second.distance) second = tip;
      });
    }
    let growing = false;
    tendrils.forEach((tip) => {
      const active = tip === nearest || tip === second;
      if (active) {
        const m = tip.inverse;
        const x = m.a * position.x + m.c * position.y + m.e - 150;
        const y = m.b * position.x + m.d * position.y + m.f;
        const dx = 150 + x * tip.cos + y * tip.sin - tip.x;
        const dy = -x * tip.sin + y * tip.cos - tip.y;
        if (tip.progress === 0) tip.turn = tip.tx * dy - tip.ty * dx >= 0 ? 1 : -1;
        // Follow a moved pointer gently without slowing the 6.5-second growth.
        const easing = tip.progress === 0 ? 1 : followEasing;
        tip.dx += (dx - tip.dx) * easing;
        tip.dy += (dy - tip.dy) * easing;
        tip.progress = Math.min(1, tip.progress + dt / 6500);
        if (tip.progress < 1 || Math.hypot(dx - tip.dx, dy - tip.dy) > 0.1) growing = true;
      } else {
        tip.progress = Math.max(0, tip.progress - dt / 1600);
        if (tip.progress > 0) growing = true;
      }
      if (tip.progress === 0) {
        clearTendril(tip);
        return;
      }
      tip.element.setAttribute("d", growingVine(tip));
      tip.drawn = true;
    });
    if (growing || (age < settings.settleMs && (moving || age < 550))) {
      frame = requestAnimationFrame(animate);
    } else {
      // Keep the finished curl at a stationary pointer without an endless frame loop.
      frame = 0;
      parts.forEach((part) => {
        part.angle = part.impulse = 0;
        setTransform(part, null);
      });
    }
  }

  function growingVine(tip) {
    const length = Math.hypot(tip.dx, tip.dy);
    const center = { x: tip.x + tip.dx, y: tip.y + tip.dy };
    const radius = Math.min(32, length * 0.35);
    const turn = tip.turn;
    const startAngle = Math.atan2(-tip.dy, -tip.dx) + turn * 0.6;
    // A shrinking spiral takes one and a half turns, ending close to the pointer.
    const spiral = (angle) => {
      const r = radius * Math.exp(-0.32 * angle);
      const theta = startAngle + turn * angle;
      return {
        x: center.x + r * Math.cos(theta),
        y: center.y + r * Math.sin(theta),
        vx: r * (-0.32 * Math.cos(theta) - turn * Math.sin(theta)),
        vy: r * (-0.32 * Math.sin(theta) + turn * Math.cos(theta)),
      };
    };
    const entry = spiral(0);
    const handle = length * 0.55;
    const tangentLength = Math.hypot(tip.tx, tip.ty);
    const entrySpeed = Math.hypot(entry.vx, entry.vy);
    const p0 = { x: tip.x, y: tip.y };
    const p1 = { x: tip.x + (tip.tx / tangentLength) * handle, y: tip.y + (tip.ty / tangentLength) * handle };
    const p2 = { x: entry.x - (entry.vx / entrySpeed) * handle, y: entry.y - (entry.vy / entrySpeed) * handle };
    const mix = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    // Subdivide the approach curve so the visible tip travels along it, rather than stretching a line.
    const t = Math.min(1, tip.progress / 0.35);
    const a = mix(p0, p1, t),
      b = mix(p1, p2, t),
      c = mix(p2, entry, t);
    const d = mix(a, b, t),
      e = mix(b, c, t),
      end = mix(d, e, t);
    let path = `M${p0.x} ${p0.y} C${a.x} ${a.y} ${d.x} ${d.y} ${end.x} ${end.y}`;
    const sweep = Math.max(0, (tip.progress - 0.35) / 0.65) * Math.PI * 3;
    let from = entry;
    for (let angle = 0; angle < sweep; angle += Math.PI / 6) {
      const next = Math.min(sweep, angle + Math.PI / 6);
      const to = spiral(next),
        h = (next - angle) / 3;
      path += ` C${from.x + from.vx * h} ${from.y + from.vy * h} ${to.x - to.vx * h} ${to.y - to.vy * h} ${to.x} ${to.y}`;
      from = to;
    }
    return path;
  }

  function move(event) {
    if (!enabled || document.hidden || event.pointerType === "touch") return;
    position = { x: event.clientX, y: event.clientY };
    lastMove = performance.now();
    if (!frame) {
      if (!bounds.length) measure();
      const nearTip = tendrils.some((tip) => {
        const m = tip.matrix;
        return Math.hypot(m.a * tip.x + m.c * tip.y + m.e - position.x, m.b * tip.x + m.d * tip.y + m.f - position.y) < settings.radius;
      });
      if (
        !tendrils.some((tip) => tip.progress > 0) &&
        !nearTip &&
        !bounds.some((part) => Math.hypot(part.x - position.x, part.y - position.y) < settings.radius)
      )
        return;
      lastTime = lastMove;
      frame = requestAnimationFrame(animate);
    }
  }

  function leave() {
    position = null;
    if (!frame && tendrils.some((tip) => tip.progress > 0)) {
      lastTime = performance.now();
      frame = requestAnimationFrame(animate);
    }
  }

  function configure() {
    reset();
    enabled = !motion.matches && pointer.matches;
    bounds = [];
    arrange();
    // Reveal only after final positions are set, including on slow script loads.
    background.style.visibility = "visible";
  }

  window.addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", leave);
  window.addEventListener("blur", reset);
  window.addEventListener("resize", configure, { passive: true });
  document.addEventListener("visibilitychange", reset);
  motion.addEventListener("change", configure);
  pointer.addEventListener("change", configure);
  configure();
})();
