# Botanical background

The shared background uses pale SVG vines, occasional pitchers, local swaying,
and two nearby tendrils that approach the pointer in a shrinking spiral. Growth
takes 6.5 seconds; target tracking uses a 2.4-second smoothing time constant.
Reduced-motion and narrow/touch layouts remain static. The drawing is revealed
after placement, and its mask keeps it outside the content area.

The animation caches fixed SVG coordinate transforms until the viewport changes,
applies stem rotation numerically, and skips unchanged SVG transform writes.
It stops requesting frames once growth and tracking settle. Moving or leaving
the pointer restarts it as needed.

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
