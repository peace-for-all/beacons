export type MapCamera = { scale: number; x: number; y: number };
export const INITIAL_MAP_CAMERA: MapCamera = { scale: 1, x: 0, y: 0 };

export function clampCamera(camera: MapCamera, width: number, height: number): MapCamera {
  const scale = Math.min(4, Math.max(1, camera.scale));
  const maxX = Math.max(width * 0.08, (width * (scale - 1)) / 2);
  const maxY = Math.max(height * 0.08, (height * (scale - 1)) / 2);
  return { scale, x: Math.min(maxX, Math.max(-maxX, camera.x)), y: Math.min(maxY, Math.max(-maxY, camera.y)) };
}

export function panCamera(camera: MapCamera, dx: number, dy: number, width: number, height: number) {
  return clampCamera({ ...camera, x: camera.x + dx, y: camera.y + dy }, width, height);
}

export function zoomCameraAt(camera: MapCamera, factor: number, point: { x: number; y: number }, width: number, height: number) {
  const scale = Math.min(4, Math.max(1, camera.scale * factor));
  const ratio = scale / camera.scale;
  return clampCamera({
    scale,
    x: (1 - ratio) * (point.x - width / 2) + ratio * camera.x,
    y: (1 - ratio) * (point.y - height / 2) + ratio * camera.y,
  }, width, height);
}

export function pinchCamera(
  camera: MapCamera,
  previous: { distance: number; center: { x: number; y: number } },
  current: { distance: number; center: { x: number; y: number } },
  width: number,
  height: number,
) {
  if (previous.distance <= 0 || current.distance <= 0) return camera;
  const zoomed = zoomCameraAt(camera, current.distance / previous.distance, previous.center, width, height);
  return panCamera(zoomed, current.center.x - previous.center.x, current.center.y - previous.center.y, width, height);
}

export function cameraPoint(point: { x: number; y: number }, camera: MapCamera, width: number, height: number) {
  return { x: (point.x - width / 2) * camera.scale + width / 2 + camera.x, y: (point.y - height / 2) * camera.scale + height / 2 + camera.y };
}

export function ensurePointVisible(camera: MapCamera, point: { x: number; y: number }, width: number, height: number, inset = 52) {
  const visible = cameraPoint(point, camera, width, height);
  return panCamera(camera, visible.x < inset ? inset - visible.x : visible.x > width - inset ? width - inset - visible.x : 0, visible.y < inset ? inset - visible.y : visible.y > height - inset ? height - inset - visible.y : 0, width, height);
}
