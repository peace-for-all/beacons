export type MarkerAnchor = { id: string; x: number; y: number };
export type Rect = { left: number; top: number; width: number; height: number };
export type MarkerLabelLayout = MarkerAnchor & { labelX: number; labelY: number; visible: boolean; leader: { x1: number; y1: number; x2: number; y2: number } | null };
type Options = { labelWidth?: number; labelHeight?: number; edgePadding?: number; markerSize?: number; obstacles?: Rect[] };
const GAP = 10;

function overlaps(a: Rect, b: Rect) { return a.left < b.left + b.width + GAP && a.left + a.width + GAP > b.left && a.top < b.top + b.height + GAP && a.top + a.height + GAP > b.top; }

/** Labels never move anchors. When space runs out, lower-priority labels are
 * suppressed while their marker remains a native, named control. */
export function layoutMarkerLabels(anchors: MarkerAnchor[], width: number, height: number, options: Options = {}): MarkerLabelLayout[] {
  const labelWidth = options.labelWidth ?? 176;
  const labelHeight = options.labelHeight ?? 42;
  const edgePadding = options.edgePadding ?? 0;
  const markerSize = options.markerSize ?? 44;
  const markerOffset = markerSize / 2;
  const occupied = [...(options.obstacles ?? [])];
  return anchors.map((anchor) => {
    if (anchor.x < markerOffset || anchor.x > width - markerOffset || anchor.y < markerOffset || anchor.y > height - markerOffset) return { ...anchor, labelX: anchor.x, labelY: anchor.y, visible: false, leader: null };
    const rawCandidates = [[anchor.x + 22, anchor.y + 24], [anchor.x - labelWidth - 22, anchor.y + 24], [anchor.x + 22, anchor.y - labelHeight - 24], [anchor.x - labelWidth - 22, anchor.y - labelHeight - 24]];
    const candidates = rawCandidates.map(([left, top]) => ({ left: Math.min(width - labelWidth - edgePadding, Math.max(edgePadding, left)), top: Math.min(height - labelHeight - edgePadding, Math.max(edgePadding, top)), width: labelWidth, height: labelHeight }));
    const otherMarkers = anchors.filter((item) => item.id !== anchor.id).map((item) => ({ left: item.x - markerOffset, top: item.y - markerOffset, width: markerSize, height: markerSize }));
    const chosenIndex = candidates.findIndex((candidate) => !occupied.some((box) => overlaps(candidate, box)) && !otherMarkers.some((box) => overlaps(candidate, box)));
    const chosen = candidates[chosenIndex];
    if (!chosen) return { ...anchor, labelX: anchor.x, labelY: anchor.y, visible: false, leader: null };
    occupied.push(chosen);
    const direct = chosenIndex === 0 && chosen.left === rawCandidates[0][0] && chosen.top === rawCandidates[0][1];
    return { ...anchor, labelX: chosen.left, labelY: chosen.top, visible: true, leader: direct ? null : { x1: anchor.x, y1: anchor.y, x2: chosen.left < anchor.x ? chosen.left + labelWidth : chosen.left, y2: Math.max(chosen.top + 10, Math.min(chosen.top + labelHeight - 10, anchor.y)) } };
  });
}
