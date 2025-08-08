export function getDesktopDownloadUrl(): string {
  const repo = process.env.REACT_APP_GITHUB_REPO || 'allen6131/project-tracker-client';
  const base = `https://github.com/${repo}/releases/latest`;
  const directBase = `${base}/download`;

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  const isWindows = /Win/i.test(platform) || /Windows/i.test(ua);
  const isMac = /Mac/i.test(platform) || /Macintosh|Mac OS X/i.test(ua);
  const isLinux = /Linux/i.test(platform) || (/X11/i.test(ua) && !isMac && !isWindows);

  // Electron-builder artifactName: "${productName}-${os}.${ext}" where os in {win, mac, linux}
  if (isWindows) {
    return `${directBase}/Project%20Tracker-win.exe`;
  }
  if (isMac) {
    return `${directBase}/Project%20Tracker-mac.dmg`;
  }
  if (isLinux) {
    return `${directBase}/Project%20Tracker-linux.AppImage`;
  }

  // Fallback to releases page if unknown
  return base;
}

export function getPlatformLabel(): string {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  if (/Win/i.test(platform) || /Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(platform) || /Macintosh|Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux/i.test(platform) || (/X11/i.test(ua) && !/Mac|Win/i.test(platform))) return 'Linux';
  return 'your OS';
}