export interface TimeRange {
  startMs: number;
  endMs: number;
}

/**
 * 将首尾裁剪与中间删除片段合并，计算最终保留的有效时间区间列表
 */
export function buildPlayableRanges(
  trimStartMs: number,
  trimEndMs: number,
  cutSegments: Array<{ startMs: number; endMs: number }> = []
): TimeRange[] {
  const start = Math.max(0, trimStartMs);
  const end = Math.max(start + 100, trimEndMs);

  const sortedCuts = cutSegments
    .map((c) => ({
      startMs: Math.max(start, c.startMs),
      endMs: Math.min(end, c.endMs)
    }))
    .filter((c) => c.endMs - c.startMs >= 80)
    .sort((a, b) => a.startMs - b.startMs);

  if (!sortedCuts.length) {
    return [{ startMs: start, endMs: end }];
  }

  // 合并重叠的删除区间
  const mergedCuts: TimeRange[] = [];
  for (const cut of sortedCuts) {
    const prev = mergedCuts[mergedCuts.length - 1];
    if (prev && cut.startMs <= prev.endMs) {
      prev.endMs = Math.max(prev.endMs, cut.endMs);
    } else {
      mergedCuts.push({ ...cut });
    }
  }

  const ranges: TimeRange[] = [];
  let cursor = start;
  for (const cut of mergedCuts) {
    if (cut.startMs > cursor + 40) {
      ranges.push({ startMs: cursor, endMs: cut.startMs });
    }
    cursor = Math.max(cursor, cut.endMs);
  }
  if (end > cursor + 40) {
    ranges.push({ startMs: cursor, endMs: end });
  }

  return ranges.length ? ranges : [{ startMs: start, endMs: end }];
}

export function getTotalRangesDuration(ranges: TimeRange[]): number {
  return ranges.reduce((sum, r) => sum + (r.endMs - r.startMs), 0);
}

/**
 * 将连续的输出时间（毫秒）映射回原始视频时间（跳过中间已删除片段）
 */
export function mapOutputMsToSourceMs(outputMs: number, ranges: TimeRange[]): number {
  let acc = 0;
  for (const r of ranges) {
    const len = r.endMs - r.startMs;
    if (outputMs <= acc + len) {
      return r.startMs + (outputMs - acc);
    }
    acc += len;
  }
  const last = ranges[ranges.length - 1];
  return last ? last.endMs : 0;
}
