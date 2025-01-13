# NPM 套件版本檢查工具

這是一個基於 Electron 的桌面應用程式，用於檢查 GitLab 專案中的 NPM 套件版本，並提供便捷的更新建議。

## 功能特點

- 🔍 自動掃描 GitLab 專案中的 NPM 套件版本
- 🎯 支援專案關鍵字過濾，精確定位目標專案
- ⚡ 即時比對套件版本，快速找出需要更新的套件
- 📋 一鍵複製 yarn 更新指令，提升工作效率
- 💾 自動儲存設定，下次使用無需重新輸入
- 🎨 現代化的使用者介面，提供絕佳的使用體驗

## 使用方式

1. 設定 GitLab 連線資訊：
   - GitLab API URL
   - Private Token
   - 預設分支（選填，預設為 master）

2. 設定專案過濾條件：
   - 新增專案包含關鍵字，用於篩選要檢查的專案
   - 新增排除關鍵字，用於排除不需要檢查的專案

3. 設定要檢查的套件：
   - 輸入套件名稱
   - 輸入目標版本

4. 執行檢查：
   - 點擊「檢查版本」按鈕
   - 系統會自動掃描符合條件的專案
   - 顯示需要更新的套件清單
   - 提供一鍵複製更新指令

## 開發環境需求

- Node.js 18.0 或以上
- Yarn 1.22 或以上
- Electron 29.1 或以上

## 安裝與執行

```bash
# 安裝依賴
yarn install

# 啟動應用程式
yarn start
```

## 設定檔說明

設定檔位於 `config/default.json`，包含以下內容：

```json
{
  "gitlab": {
    "url": "GitLab API URL",
    "token": "Private Token",
    "branch": "master"
  },
  "projectIncludeKeywords": ["關鍵字1", "關鍵字2"],
  "exceptions": {
    "projects": [],
    "projectKeywords": ["排除關鍵字1", "排除關鍵字2"]
  },
  "packages": [
    {
      "name": "套件名稱",
      "targetVersion": "目標版本"
    }
  ]
}
```

## 注意事項

1. Private Token 需要具有讀取專案的權限
2. 建議定期更新 GitLab API Token
3. 大量專案掃描可能需要較長時間，請耐心等待

## 授權

MIT License