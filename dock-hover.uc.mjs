// Animate artwork from the pointer position; button geometry stays unchanged.
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
const originals = new Map();
const properties = ["transform", "transform-origin", "transition", "will-change"];
let bar;
let frame = 0;
let lastTime = 0;
let pointer;
let pressed = false;
let hoverRecorded = false;
let geometry = [];
let needsMeasure = true;
let resizeObserver;

// Record only loader/animation state locally, without any browsing data.
function status(phase) {
  try {
    IOUtils.writeJSON(PathUtils.join(PathUtils.profileDir, "chrome", "sine-mods", "zen-mac-style-dock", "status.json"), {
      version: "1.3.2", phase, reducedMotion: motion.matches,
      buttons: bar?.querySelectorAll("toolbarbutton[zen-workspace-id]").length ?? 0,
      animatedIcons: originals.size,
    }).catch(error => console.warn("[Zen Mac Style Dock] Cannot write local status", error));
  } catch (error) {
    console.warn("[Zen Mac Style Dock] Cannot record local status", error);
  }
}

function remember(icon) {
  if (!originals.has(icon)) {
    originals.set(icon, {
      amount: 0,
      styles: properties.map(name => [
        name, icon.style.getPropertyValue(name), icon.style.getPropertyPriority(name),
      ]),
    });
    icon.style.setProperty("transition", "opacity 150ms ease, filter 180ms ease", "important");
    icon.style.setProperty("transform-origin", "center 75%", "important");
    icon.style.setProperty("will-change", "transform", "important");
  }
  return originals.get(icon);
}

function restoreProperty(icon, name, value, priority) {
  if (value) icon.style.setProperty(name, value, priority);
  else icon.style.removeProperty(name);
}

function restoreIcon(icon, state) {
  for (const value of state.styles) restoreProperty(icon, ...value);
  originals.delete(icon);
}

function stop() {
  window.cancelAnimationFrame(frame);
  frame = 0;
  lastTime = 0;
  pointer = null;
  for (const [icon, state] of originals) restoreIcon(icon, state);
}

function schedule() {
  if (!frame) frame = window.requestAnimationFrame(render);
}

function invalidateGeometry() {
  needsMeasure = true;
  if (pointer) schedule();
}

function leave() {
  pointer = null;
  if (originals.size) schedule();
}

function render(time) {
  frame = 0;
  if (pressed || motion.matches || bar.hasAttribute("reorder-mode")) {
    stop();
    return;
  }
  // Read every position together, and only when layout may have changed.
  if (needsMeasure) {
    geometry = [...bar.querySelectorAll("toolbarbutton[zen-workspace-id]")].map(button => {
      const rect = button.getBoundingClientRect();
      return { button, icon: button.querySelector(".zen-workspace-icon"),
        center: rect.left + rect.width / 2, radius: Math.max(56, rect.width * 2) };
    });
    needsMeasure = false;
  }
  const dt = lastTime ? Math.min(time - lastTime, 40) : 16;
  const blend = 1 - Math.exp(-dt / 100);
  lastTime = time;
  const crowded = bar.hasAttribute("icons-overflow");
  const hovered = pointer?.target.closest?.("toolbarbutton[zen-workspace-id]");
  let moving = false;
  for (const [icon, state] of originals) {
    if (!icon.isConnected) restoreIcon(icon, state);
  }
  for (const { button, icon, center, radius } of geometry) {
    if (!icon) continue;
    const distance = pointer ? Math.abs(pointer.x - center) : radius;
    const target = !pointer ? 0 : crowded
      ? Number(button === hovered)
      : Math.cos(Math.min(distance / radius, 1) * Math.PI / 2) ** 2;
    if (target < 0.001 && !originals.has(icon)) continue;
    const state = remember(icon);
    let amount = state.amount + (target - state.amount) * blend;
    if (Math.abs(target - amount) < 0.001) amount = target;
    state.amount = amount;
    if (amount < 0.001 && target < 0.001) {
      restoreIcon(icon, state);
    } else {
      icon.style.setProperty("transform", `translate3d(0, ${-6 * amount}px, 0) scale(${1 + 0.8 * amount})`, "important");
      moving ||= amount !== target;
    }
  }
  if (originals.size && !hoverRecorded) {
    hoverRecorded = true;
    status("hover");
  }
  if (moving) schedule();
  else lastTime = 0;
}

function move(event) {
  if (event.pointerType === "touch" || motion.matches || pressed) return;
  pointer = { x: event.clientX, target: event.target };
  schedule();
}

function press() {
  pressed = true;
  stop();
}

function release() {
  pressed = false;
}

function motionChanged() {
  if (motion.matches) {
    stop();
  }
}

function init() {
  bar = document.getElementById("zen-workspaces-button");
  status(bar ? "ready" : "missing-bar");
  if (!bar) return;
  bar.addEventListener("pointermove", move);
  bar.addEventListener("pointerleave", leave);
  bar.addEventListener("pointerenter", invalidateGeometry);
  bar.addEventListener("scroll", invalidateGeometry);
  bar.addEventListener("pointerdown", press);
  window.addEventListener("pointerup", release, true);
  window.addEventListener("pointercancel", release, true);
  window.addEventListener("blur", stop);
  window.addEventListener("resize", invalidateGeometry);
  window.addEventListener("ZenWorkspacesUIUpdate", invalidateGeometry);
  resizeObserver = new ResizeObserver(invalidateGeometry);
  resizeObserver.observe(bar);
  motion.addEventListener("change", motionChanged);
}

function cleanup() {
  stop();
  resizeObserver?.disconnect();
  bar?.removeEventListener("pointermove", move);
  bar?.removeEventListener("pointerleave", leave);
  bar?.removeEventListener("pointerenter", invalidateGeometry);
  bar?.removeEventListener("scroll", invalidateGeometry);
  bar?.removeEventListener("pointerdown", press);
  window.removeEventListener("pointerup", release, true);
  window.removeEventListener("pointercancel", release, true);
  window.removeEventListener("blur", stop);
  window.removeEventListener("resize", invalidateGeometry);
  window.removeEventListener("ZenWorkspacesUIUpdate", invalidateGeometry);
  window.removeEventListener("DOMContentLoaded", init);
  motion.removeEventListener("change", motionChanged);
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
window.addUnloadListener?.(cleanup);
window.addEventListener("unload", cleanup, { once: true });
