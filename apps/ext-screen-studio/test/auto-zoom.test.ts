import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCameraAtTime,
  generateAutoZoomSegments,
  sampleCursorAtTime
} from '../src/utils/auto-zoom.ts';
import {
  buildPlayableRanges,
  getTotalRangesDuration,
  mapOutputMsToSourceMs
} from '../src/utils/timeline-cuts.ts';

describe('auto-zoom core algorithm', () => {
  it('merges nearby clicks into a single pan segment', () => {
    const clicks = [
      { t: 1000, x: 0.2, y: 0.3, button: 0 },
      { t: 2200, x: 0.7, y: 0.6, button: 0 }
    ];
    const segments = generateAutoZoomSegments(clicks, 10000);
    assert.equal(segments.length, 1);
    assert.equal(segments[0].followCursor, true);
    assert.ok(segments[0].endMs >= 3600);
  });

  it('keeps distant clicks as separate zoom segments', () => {
    const clicks = [
      { t: 1000, x: 0.2, y: 0.3, button: 0 },
      { t: 7000, x: 0.8, y: 0.7, button: 0 }
    ];
    const segments = generateAutoZoomSegments(clicks, 10000);
    assert.equal(segments.length, 2);
  });

  it('clamps viewport center so zoomed frame never exposes out-of-bounds area', () => {
    const segs = [
      {
        id: 'edge',
        startMs: 0,
        endMs: 4000,
        scale: 2.0,
        targetX: 0.02,
        targetY: 0.98,
        followCursor: false
      }
    ];
    const cam = evaluateCameraAtTime(2000, segs, [], 300);
    assert.equal(cam.scale, 2.0);
    // 2.0x 时半视口为 0.25，中心必须在 [0.25, 0.75] 之间
    assert.ok(cam.centerX >= 0.25 && cam.centerX <= 0.75);
    assert.ok(cam.centerY >= 0.25 && cam.centerY <= 0.75);
  });

  it('smoothly interpolates cursor position at mid-timestamps', () => {
    const samples = [
      { t: 0, x: 0.1, y: 0.1 },
      { t: 100, x: 0.5, y: 0.5 },
      { t: 200, x: 0.9, y: 0.9 }
    ];
    const pos = sampleCursorAtTime(samples, 100);
    assert.ok(pos !== null);
    assert.ok(Math.abs(pos.x - 0.5) < 0.05);
    assert.ok(Math.abs(pos.y - 0.5) < 0.05);
  });
});

describe('timeline cut segments', () => {
  it('splits playable ranges and maps output time across middle cuts', () => {
    const ranges = buildPlayableRanges(1000, 10000, [
      { startMs: 3000, endMs: 5000 },
      { startMs: 4500, endMs: 6000 }
    ]);
    assert.deepEqual(ranges, [
      { startMs: 1000, endMs: 3000 },
      { startMs: 6000, endMs: 10000 }
    ]);
    assert.equal(getTotalRangesDuration(ranges), 6000);
    assert.equal(mapOutputMsToSourceMs(2500, ranges), 6500);
  });
});
