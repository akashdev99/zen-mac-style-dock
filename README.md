# Zen Mac Style Dock

A local Sine mod for Zen's bottom workspace icons, using a browser UI script.

- Icons magnify continuously with pointer distance, up to 1.8× with a 6px lift.
- Resting artwork is about 20% smaller: 12px emoji and 13px image icons on macOS.
- Regular dock icons use 26px button slots with a 1px gap for tighter spacing.
- A continuous animation loop eases each icon toward its target with a 100ms response time.
- Geometry is cached and read before style updates to avoid repeated layout work.
- Hover adds a bright light rim and a theme-colored halo around the artwork.
- Click targets and workspace order stay stationary.
- Workspace reordering retains Zen's native behavior.
- Crowded bars keep Zen's dots and magnify only the revealed icon.
- macOS Reduce Motion disables the effect.

Disable or remove **Zen Mac Style Dock** from Settings → Sine Mods to revert it.
The script only reads icon geometry and temporarily changes inline styles.
It makes no network requests or workspace-data changes.
