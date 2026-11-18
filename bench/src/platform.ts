/**
 * Browser flags that depend on the operating system. ANGLE translates WebGL to the
 * native graphics API, so each platform names its own back end: Metal on macOS and
 * Direct3D 11 on Windows. Other platforms keep Chromium's default.
 */
export function angleArgs(platform: NodeJS.Platform = process.platform): string[] {
  if (platform === 'darwin') return ['--use-angle=metal'];
  if (platform === 'win32') return ['--use-angle=d3d11'];
  return [];
}
