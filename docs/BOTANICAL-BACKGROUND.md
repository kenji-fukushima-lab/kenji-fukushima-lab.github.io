# Botanical background

The shared background uses pale SVG vines, occasional pitchers, Venus flytraps and sundews at equal frequency, local swaying,
and two nearby tendrils that approach the pointer in a shrinking spiral. Growth
takes 6.5 seconds; target tracking uses a 2.4-second smoothing time constant.
Reduced-motion and narrow/touch layouts remain static. The drawing is revealed
after placement, and its mask keeps it outside the content area.

The animation caches fixed SVG coordinate transforms until the viewport changes,
applies stem rotation numerically, and skips unchanged SVG transform writes.
It stops requesting frames once growth and tracking settle. Moving or leaving
the pointer restarts it as needed.

Flytraps close after two separate pointer entries (or touch/pen taps) within
30 seconds and reopen after 8 seconds. Remaining over a trap counts only once;
mouse clicks do not double-count entry. Hit testing observes global pointer
input without intercepting page controls, and only responds in the visible
margins. Reduced motion keeps the explicit closure instant. Resizing resets traps.

Pitcher lids carry a small insect: pointer contact or a tap drops it through the
mouth, and it returns after 6.5 seconds. If the pointer is already attached to
sundew mucilage, contact transfers the attachment to the insect: the insect is
pulled to the sundew and the pitcher remains ready. A second contact with the
captured insect lets the pointer drag it while the mucus remains within reach.
Pulling it beyond that reach retracts the mucus and brings the insect back to
the sundew leaf, keeping the insect captured there.
During that drag, the second separate entry into a flytrap transfers the insect
to the trap and closes it. While the pointer is operating a captured insect,
its respawn timer is paused. Otherwise, a captured insect disappears after 30
seconds and respawns at its original pitcher; reset and resize also restore it
immediately.
Reduced motion hides a pitcher insect immediately.
Sundew droplets attach to a precise pointer after contact, drawing three mucus
strands from nearby droplets to the pointer or captured insect. Attachment follows across the content margin for up to 320 SVG
units and releases after 8 seconds without pointer movement. Pulling the mucus
does not deform the sundew leaf or stalk. Leaving the window releases it; blur,
resize, tab hiding and reduced motion clear it. Page controls
remain unobstructed. Flytrap artwork uses two cupped lobes and curved marginal
teeth without internal trigger hairs.

## Reproducible component benchmark

After a production build, run from the repository root:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/path/to/chrome" \
  node tests/benchmarks/botanical-background.cjs assets/js/botanical-background.js /tmp/botanical-after.json
```

Pass a saved earlier script as the first argument for comparison. The harness
uses the built SVG and source CSS, a deterministic 60 Hz clock over 25 simulated
seconds, pointer arrival, a sudden move at 7 seconds, and exit at 13 seconds.
It includes one warmup and three measured runs at each viewport width, both
1440 pixels high. Optional JSON output contains path snapshots for equivalence
checks. No network or other site animations are included.

On macOS ARM64, Chrome 152.0.7977.84, the September 17, 2026 optimization produced:

| Width   | Before (median ms) | After (median ms) | Reduction |
| ------- | -----------------: | ----------------: | --------: |
| 1440 px |              126.8 |              42.0 |     66.9% |
| 2560 px |              409.5 |              81.1 |     80.2% |

These are cumulative callback and layout-flush times, not total page load,
paint/GPU time, memory, or an FPS claim. At 2560 pixels, SVG coordinate reads
dropped from 84,036 to 192 and attribute writes from 225,573 to 7,576. The harness
counts its initial anchor reads as well. Active frame counts were identical;
sampled SVG path coordinates differed by less than 0.000000005 SVG units.

Behavior regression tests are in `tests/ui/botanical-background.spec.js`, including
initial placement, masking, tangent continuity, spiral convergence, slow pointer
tracking, retraction, reduced motion, and responsive layouts.

## Carnivorous-plant interaction benchmark

`tests/benchmarks/botanical-interactions.cjs` uses the same built artwork and
source CSS, with 240 Hz pointer input, 60 Hz animation and 25 simulated seconds.
The sequence touches and drags a sundew, crosses page content, brushes a flytrap,
touches a pitcher lid and sweeps the margin. It includes pointer handlers and
animation callbacks plus a layout flush, virtualizes interaction timers, and
uses one warmup and three measured runs per width (1440 px tall).

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/path/to/chrome" \
  node tests/benchmarks/botanical-interactions.cjs assets/js/botanical-background.js /tmp/interactions-after.json
```

On macOS ARM64 with Chrome 152.0.7977.84, replacing per-input SVG geometry reads
with cached placement and inverse live rotations gave these median totals:

| Width   | Before (ms) | After (ms) | Reduction | Geometry reads before / after |
| ------- | ----------: | ---------: | --------: | ----------------------------: |
| 1440 px |       216.4 |      107.5 |     50.3% |                   95,596 / 76 |
| 2560 px |       676.1 |      224.1 |     66.9% |                 400,760 / 304 |

These are component CPU timings, not whole-page speed or FPS. Geometry counts
include fixture setup. State snapshots and path structure matched; the largest
sampled coordinate difference was below 0.00000015 SVG units. Cache entries are
rebuilt on resize and media-query changes; hidden mobile motifs are excluded.
Cached placement adds small per-motif metadata, without changing the artwork,
closure timing, three mucus strands, drag distance or small leaf displacement.
