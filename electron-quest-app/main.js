const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 720,
    minWidth: 360,
    minHeight: 540,
    resizable: true,
    title: 'Quest Forge',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  win.setMenuBarVisibility(false);
}

// IPC: write bat script to copy new exe over current exe, then relaunch
ipcMain.handle('perform-update', async (event, newExePath) => {
  const currentExe = process.execPath;
  const batPath = path.join(os.tmpdir(), 'quest-forge-update.bat');

  const bat = [
    '@echo off',
    'timeout /t 2 /nobreak >nul',
    `copy /Y "${newExePath}" "${currentExe}"`,
    `start "" "${currentExe}"`,
    'del "%~f0"',
  ].join('\r\n');

  fs.writeFileSync(batPath, bat, 'utf8');

  spawn('cmd.exe', ['/c', batPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  }).unref();

  setTimeout(() => app.quit(), 500);
  return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});
