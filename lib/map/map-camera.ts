export type MapCamera = { scale: number; x: number; y: number };
export const INITIAL_MAP_CAMERA: MapCamera = { scale: 1, x: 0, y: 0 };

export function clampCamera(camera: MapCamera, width: number, height: number): MapCamera {
  const scale = Math.min(4, Math.max(1, camera.scale));
  const maxX = (width * (scale - 1)) / 2;
  const maxY = (height * (scale - 1)) / 2;
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
