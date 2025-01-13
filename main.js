const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const config = require('config');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 讀取設定
ipcMain.handle('get-config', async () => {
  try {
    const configPath = path.join(__dirname, 'config', 'default.json');
    const configData = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error(`讀取設定檔失敗: ${error.message}`);
    return null;
  }
});

// 儲存設定
ipcMain.handle('save-config', async (event, newConfig) => {
  try {
    // 驗證新設定的格式
    if (!newConfig || typeof newConfig !== 'object') {
      throw new Error('無效的設定格式');
    }

    // 確保必要的欄位存在
    if (!newConfig.gitlab?.url || !newConfig.gitlab?.token) {
      throw new Error('缺少必要的 GitLab 設定');
    }

    // 建立基本的設定結構
    const configToSave = {
      gitlab: {
        url: String(newConfig.gitlab.url || ''),
        token: String(newConfig.gitlab.token || ''),
        branch: String(newConfig.gitlab.branch || 'master')
      },
      projectIncludeKeywords: [],
      exceptions: {
        projects: [],
        projectKeywords: []
      },
      packages: []
    };

    // 安全地複製陣列資料
    if (Array.isArray(newConfig.projectIncludeKeywords)) {
      configToSave.projectIncludeKeywords = newConfig.projectIncludeKeywords
        .filter(k => k && typeof k === 'string')
        .map(k => String(k));
    }

    if (newConfig.exceptions) {
      if (Array.isArray(newConfig.exceptions.projects)) {
        configToSave.exceptions.projects = newConfig.exceptions.projects
          .filter(p => p && typeof p === 'object')
          .map(p => ({ ...p }));
      }
      if (Array.isArray(newConfig.exceptions.projectKeywords)) {
        configToSave.exceptions.projectKeywords = newConfig.exceptions.projectKeywords
          .filter(k => k && typeof k === 'string')
          .map(k => String(k));
      }
    }

    if (Array.isArray(newConfig.packages)) {
      configToSave.packages = newConfig.packages
        .filter(p => p && typeof p === 'object' && p.name && p.targetVersion)
        .map(p => ({
          name: String(p.name || ''),
          targetVersion: String(p.targetVersion || '')
        }));
    }

    const configDir = path.join(__dirname, 'config');
    const configPath = path.join(configDir, 'default.json');

    // 確保目錄存在
    await fs.mkdir(configDir, { recursive: true });

    // 寫入設定檔
    await fs.writeFile(configPath, JSON.stringify(configToSave, null, 2), 'utf8');

    return true;
  } catch (error) {
    console.error('儲存設定檔失敗:', error.message);
    throw error;
  }
});