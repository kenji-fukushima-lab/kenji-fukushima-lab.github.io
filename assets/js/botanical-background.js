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
  let traps = [];
  let pitchers = [];
  let sundews = [];
  let sticky = null;
  let stickyFrame = 0;
  let hitGeometry = new WeakMap();

  function arrange() {
    traps.forEach((trap) => clearTimeout(trap.timer));
    pitchers.forEach((pitcher) => clearTimeout(pitcher.timer));
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
    traps = [...background.querySelectorAll("[data-botanical-flytrap]")].map((element) => {
      element.dataset.state = "open";
      return { element, inside: false, touches: 0, lastTouch: -Infinity, timer: 0 };
    });
    pitchers = [...background.querySelectorAll("[data-botanical-pitcher]")].map((element) => {
      element.dataset.state = "ready";
      return { element, target: element.querySelector("[data-botanical-insect-target]"), timer: 0 };
    });
    sundews = [...background.querySelectorAll("[data-botanical-sundew]")].map((element) => ({
      element,
      leaf: element.querySelector("[data-sundew-leaf]"),
      stalk: element.querySelector("[data-sundew-stalk]"),
      threads: [...element.querySelectorAll("[data-sundew-thread]")],
      drops: [...element.querySelectorAll("[data-sundew-drop]")].map((drop) => ({
        x: Number(drop.getAttribute("cx")),
        y: Number(drop.getAttribute("cy")),
      })),
    }));
    parts = [];
    background.querySelectorAll("[data-botanical-stem]").forEach((stem) => {
      parts.push({ element: stem, origin: "150 0", degrees: 7, angle: 0, impulse: 0, cos: 1, sin: 0 });
    });
    background.querySelectorAll("[data-botanical-leaf]").forEach((leaf) => {
      parts.push({ element: leaf, origin: "0 0", degrees: settings.leafDegrees, angle: 0, impulse: 0, cos: 1, sin: 0 });
    });
    tendrils.forEach((tip) => {
      tip.stem = parts.find((part) => part.element === tip.element.parentNode);
    });
    cacheHitGeometry();
  }

  function cacheHitGeometry() {
    hitGeometry = new WeakMap();
    const partByElement = new Map(parts.map((part) => [part.element, part]));
    const roots = new Map();
    const targets = [...traps.map((trap) => trap.element), ...pitchers.map((pitcher) => pitcher.target), ...sundews.map((dew) => dew.element)];
    targets.forEach((element) => {
      if (!element.getClientRects().length) return;
      const stem = element.closest("[data-botanical-stem]");
      let root = roots.get(stem);
      if (!root) {
        root = { inverse: stem.getScreenCTM().inverse(), part: partByElement.get(stem) };
        roots.set(stem, root);
      }
      const localToStem = root.inverse.multiply(element.getScreenCTM());
      const leaf = element.closest("[data-botanical-leaf]");
      const leafMatrix = leaf ? root.inverse.multiply(leaf.getScreenCTM()) : null;
      hitGeometry.set(element, {
        root,
        inverse: localToStem.inverse(),
        leaf: partByElement.get(leaf),
        leafX: leafMatrix ? leafMatrix.e : 0,
        leafY: leafMatrix ? leafMatrix.f : 0,
      });
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
    const angle = value === null ? 0 : (Number(part.angle.toFixed(4)) * Math.PI) / 180;
    part.cos = Math.cos(angle);
    part.sin = Math.sin(angle);
    if (value === null) part.element.removeAttribute("transform");
    else part.element.setAttribute("transform", value);
  }

  function clearTendril(tip) {
    if (!tip.drawn) return;
    tip.element.removeAttribute("d");
    tip.drawn = false;
  }

  function reset() {
    clearSticky();
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

  function clearSticky() {
    cancelAnimationFrame(stickyFrame);
    stickyFrame = 0;
    if (sticky) {
      sticky.dew.leaf.removeAttribute("transform");
      sticky.dew.stalk.setAttribute("d", "M40 46 Q8 43 0 24");
      sticky.dew.threads.forEach((thread) => thread.removeAttribute("d"));
      sticky.dew.element.removeAttribute("data-stuck");
      sticky = null;
    }
  }

  function localPoint(element, x, y) {
    const geometry = hitGeometry.get(element);
    if (!geometry) return null;
    const { root, inverse, leaf, leafX, leafY } = geometry;
    const m = root.inverse,
      stem = root.part;
    const sx = m.a * x + m.c * y + m.e - 150;
    const sy = m.b * x + m.d * y + m.f;
    // Undo only the live rotations; fixed placement is cached until reconfiguration.
    let px = 150 + sx * stem.cos + sy * stem.sin;
    let py = -sx * stem.sin + sy * stem.cos;
    if (leaf) {
      const dx = px - leafX,
        dy = py - leafY;
      px = leafX + dx * leaf.cos + dy * leaf.sin;
      py = leafY - dx * leaf.sin + dy * leaf.cos;
    }
    return { x: inverse.a * px + inverse.c * py + inverse.e, y: inverse.b * px + inverse.d * py + inverse.f };
  }

  function inMargin(x) {
    const margin = innerWidth < 768 ? innerWidth * 0.23 : gutterWidth;
    return x < margin || x > innerWidth - margin;
  }

  function animateSticky(time) {
    if (!sticky) return;
    const dt = Math.min(50, time - sticky.time);
    sticky.time = time;
    const { dew, anchor } = sticky;
    const point = localPoint(dew.element, sticky.x, sticky.y);
    if (!point) {
      clearSticky();
      return;
    }
    const dx = point.x - anchor.x,
      dy = point.y - anchor.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 320 || time - sticky.started > 8000) sticky.releasing = true;
    const scale = sticky.releasing ? 0 : Math.min(1, 260 / Math.max(1, distance));
    const ease = 1 - Math.exp(-dt / (sticky.releasing ? 130 : 65));
    sticky.dx += (dx * scale - sticky.dx) * ease;
    sticky.dy += (dy * scale - sticky.dy) * ease;
    const extension = Math.hypot(sticky.dx, sticky.dy);
    // Keep the original small leaf tug even when the mucus stretches much farther.
    const leafScale = 0.09 * Math.min(1, 55 / Math.max(1, extension));
    const pullX = sticky.dx * leafScale,
      pullY = sticky.dy * leafScale;
    dew.leaf.setAttribute("transform", `translate(${pullX} ${pullY})`);
    dew.stalk.setAttribute("d", `M40 46 Q${8 + pullX * 0.5} ${43 + pullY * 0.5} ${pullX} ${24 + pullY}`);
    const spread = Math.min(1, extension / 20);
    dew.threads.forEach((thread, index) => {
      const drop = sticky.anchors[index];
      const ax = drop.x + pullX,
        ay = drop.y + pullY;
      // Each strand starts at a different droplet and retracts to that droplet.
      const ex = ax + (anchor.x + sticky.dx - ax) * spread;
      const ey = ay + (anchor.y + sticky.dy - ay) * spread;
      const sag = Math.min(12, extension * 0.08) * (0.7 + index * 0.3);
      thread.setAttribute("d", `M${ax} ${ay} Q${(ax + ex) / 2} ${(ay + ey) / 2 + sag} ${ex} ${ey}`);
    });
    if (sticky.releasing && Math.hypot(sticky.dx, sticky.dy) < 0.2) {
      clearSticky();
      return;
    }
    stickyFrame = requestAnimationFrame(animateSticky);
  }

  function touchOtherPlants(event) {
    if (document.hidden) return;
    const tapping = event.type === "pointerdown";
    if (!tapping && (event.pointerType === "touch" || event.pointerType === "pen")) return;
    const x = event.clientX,
      y = event.clientY;
    if (sticky) {
      sticky.x = x;
      sticky.y = y;
    }
    if (!inMargin(x)) return;
    pitchers.forEach((pitcher) => {
      if (pitcher.element.dataset.state !== "ready") return;
      const point = localPoint(pitcher.target, x, y);
      if (!point || point.x ** 2 / 17 ** 2 + point.y ** 2 / 12 ** 2 > 1) return;
      pitcher.element.dataset.state = "fallen";
      pitcher.timer = setTimeout(() => {
        pitcher.element.dataset.state = "ready";
      }, 6500);
    });
    if (!enabled || tapping || sticky || event.pointerType === "touch" || event.pointerType === "pen") return;
    for (const dew of sundews) {
      const point = localPoint(dew.element, x, y);
      if (!point) continue;
      const anchor = dew.drops.find((drop) => Math.hypot(point.x - drop.x, point.y - drop.y) < 7);
      if (!anchor) continue;
      const time = performance.now();
      const anchors = [...dew.drops]
        .sort((a, b) => Math.hypot(a.x - anchor.x, a.y - anchor.y) - Math.hypot(b.x - anchor.x, b.y - anchor.y))
        .slice(0, 3);
      sticky = { dew, anchor, anchors, x, y, dx: 0, dy: 0, started: time, time, releasing: false };
      dew.element.dataset.stuck = "true";
      stickyFrame = requestAnimationFrame(animateSticky);
      break;
    }
  }

  // Observe input without intercepting links or scrolling beneath the decoration.
  function touchTraps(event) {
    if (document.hidden) return;
    const tapping = event.type === "pointerdown";
    if (!tapping && (event.pointerType === "touch" || event.pointerType === "pen")) return;
    if (tapping && event.pointerType === "mouse") return;
    const x = event.clientX,
      y = event.clientY;
    if (!inMargin(x)) {
      traps.forEach((trap) => {
        trap.inside = false;
      });
      return;
    }
    traps.forEach((trap) => {
      const local = localPoint(trap.element, x, y);
      if (!local) return;
      const inside = local.x ** 2 / 34 ** 2 + local.y ** 2 / 32 ** 2 <= 1;
      if (inside && (tapping || !trap.inside) && trap.element.dataset.state !== "closed") {
        const now = performance.now();
        trap.touches = now - trap.lastTouch > 30000 ? 1 : trap.touches + 1;
        trap.lastTouch = now;
        if (trap.touches === 2) {
          trap.element.dataset.state = "closed";
          trap.touches = 0;
          trap.timer = setTimeout(() => {
            trap.element.dataset.state = "open";
          }, 8000);
        }
      }
      trap.inside = inside;
    });
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
    if (sticky) sticky.releasing = true;
    traps.forEach((trap) => {
      trap.inside = false;
    });
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

  window.addEventListener("pointermove", touchOtherPlants, { passive: true });
  window.addEventListener("pointerdown", touchOtherPlants, { passive: true });
  window.addEventListener("pointermove", touchTraps, { passive: true });
  window.addEventListener("pointerdown", touchTraps, { passive: true });
  window.addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", leave);
  window.addEventListener("blur", reset);
  window.addEventListener("resize", configure, { passive: true });
  document.addEventListener("visibilitychange", reset);
  motion.addEventListener("change", configure);
  pointer.addEventListener("change", configure);
  configure();
})();
