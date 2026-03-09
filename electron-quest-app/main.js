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

// IPC: write bat script to replace running exe after process exits, then relaunch
ipcMain.handle('perform-update', async (event, newExePath) => {
  const currentExe = process.execPath;
  const exeName = path.basename(currentExe);
  const batPath = path.join(os.tmpdir(), 'quest-forge-update.bat');

  // Wait for app to exit, force-kill any lingering process, then replace & relaunch
  const bat = [
    '@echo off',
    'timeout /t 3 /nobreak >nul',
    `taskkill /F /IM "${exeName}" >nul 2>&1`,
    'timeout /t 1 /nobreak >nul',
    `copy /Y "${newExePath}" "${currentExe}"`,
    `if errorlevel 1 (`,
    `  echo Copy failed, retrying...`,
    `  timeout /t 2 /nobreak >nul`,
    `  copy /Y "${newExePath}" "${currentExe}"`,
    `)`,
    `start "" "${currentExe}"`,
    `del "${newExePath}" >nul 2>&1`,
    'del "%~f0"',
  ].join('\r\n');

  fs.writeFileSync(batPath, bat, 'utf8');

  spawn('cmd.exe', ['/c', batPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  }).unref();

  // Force-exit immediately so the bat can replace the file
  app.exit(0);
  return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});
