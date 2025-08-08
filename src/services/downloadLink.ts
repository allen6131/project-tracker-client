export function getDesktopDownloadUrl(): string {
  const repo = 'allen6131/project-tracker-client';
  const base = `https://github.com/${repo}/releases/latest/download`;

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  const isWindows = /Win/i.test(platform) || /Windows/i.test(ua);
  const isMac = /Mac/i.test(platform) || /Macintosh|Mac OS X/i.test(ua);
  const isLinux = /Linux/i.test(platform) || (/X11/i.test(ua) && !isMac && !isWindows);

  if (isWindows) {
    return `${base}/Project%20Tracker-windows.exe`;
  }
  if (isMac) {
    return `${base}/Project%20Tracker-mac.dmg`;
  }
  if (isLinux) {
    return `${base}/Project%20Tracker-linux.AppImage`;
  }

  // Fallback to releases page if unknown
  return `https://github.com/${repo}/releases/latest`;
}

export function getPlatformLabel(): string {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  if (/Win/i.test(platform) || /Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(platform) || /Macintosh|Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux/i.test(platform) || (/X11/i.test(ua) && !/Mac|Win/i.test(platform))) return 'Linux';
  return 'your OS';
}