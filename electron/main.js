'use strict';

// Desktop shell for MEOW GLITCH. The web app runs unchanged; this file only
// serves it from a private app:// origin and lets the file browser read the
// folders you pick.

const { app, BrowserWindow, protocol, net, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');

// A standard, secure scheme gives the app a stable origin, so IndexedDB
// (saved folders, stars) and localStorage persist between launches.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function serveApp() {
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(ROOT, decodeURIComponent(pathname === '/' ? '/index.html' : pathname)));
    if (!file.startsWith(ROOT + path.sep)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

// The folder browser uses the File System Access API (read-only). Allow
// that; refuse everything else (camera, mic, location, notifications...).
function setPermissions() {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_wc, permission, callback) => callback(permission === 'fileSystem'));
  ses.setPermissionCheckHandler((_wc, permission) => permission === 'fileSystem');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#000000',
    title: 'MEOW GLITCH',
    icon: path.join(ROOT, 'assets', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // Links that try to leave the app open in the default browser instead.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://')) e.preventDefault();
  });
  win.loadURL('app://meowglitch/index.html');
}

app.setName('MEOW GLITCH');

app.whenReady().then(() => {
  serveApp();
  setPermissions();
  if (process.platform === 'darwin') app.dock?.setIcon(path.join(ROOT, 'assets', 'icon.png'));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
