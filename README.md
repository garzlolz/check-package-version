# GitLab 專案套件版本檢查工具

這個工具可以幫助您檢查 GitLab 上所有專案中特定 npm 套件的版本，並找出需要更新的專案。

## 功能特點

- 支援同時檢查多個套件版本
- 檢查專案的 `dependencies` 和 `devDependencies`
- 清楚顯示每個專案需要更新的套件及版本
- 支援自訂 GitLab API 設定

## 安裝

1. 確保您已安裝 Node.js (建議版本 >= 14)

2. 複製專案後安裝依賴：
```bash
npm install
```

## 設定

1. 在 `config` 目錄下複製範例設定檔：
```bash
cp config/default.example.json config/default.json
```

2. 編輯 `config/default.json`，填入您的 GitLab 設定：
```json
{
  "gitlab": {
    "url": "http://your-gitlab-url/api/v4",
    "token": "your-gitlab-token"
  },
  "packages": [
    {
      "name": "@telexpress/telligent-list-module",
      "targetVersion": "0.4.17"
    }
  ]
}
```

### 設定說明

- `gitlab.url`: GitLab API 的網址
- `gitlab.token`: GitLab 的個人存取權杖 (Personal Access Token)
- `packages`: 要檢查的套件列表
  - `name`: 套件名稱
  - `targetVersion`: 目標版本

## 使用方式

執行檢查：
```bash
node check-package-version.js
```

### 輸出範例

```
=== 需要更新的專案 ===

project-a:
  @telexpress/telligent-list-module: 0.4.15 → 0.4.17
  @telexpress/telligent-tag-module: 0.5.10 → 0.5.15

project-b:
  @telexpress/telligent-message-module: 0.9.1 → 0.9.2
```

## 注意事項

1. 確保您的 GitLab Token 具有足夠的權限讀取專案
2. 如果專案數量很多，檢查可能需要一些時間
3. 預設只檢查 master 分支的套件版本