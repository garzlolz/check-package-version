const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const config = require("config");

// 從設定檔讀取設定
const GITLAB_URL = config.get("gitlab.url");
const PRIVATE_TOKEN = config.get("gitlab.token");
const PACKAGES = config.get("packages");

async function getAllProjects() {
  try {
    const response = await axios.get(`${GITLAB_URL}/projects`, {
      headers: {
        "PRIVATE-TOKEN": PRIVATE_TOKEN,
      },
      params: {
        per_page: 100,
        membership: true,
      },
    });
    return response.data;
  } catch (error) {
    console.error("取得專案列表失敗:", error.message);
    return [];
  }
}

async function checkPackageJson(projectId, projectName) {
  try {
    const response = await axios.get(
      `${GITLAB_URL}/projects/${projectId}/repository/files/package.json/raw`,
      {
        headers: {
          "PRIVATE-TOKEN": PRIVATE_TOKEN,
        },
        params: {
          ref: "master",
        },
        responseType: 'text'
      }
    );

    let packageJson;
    try {
      packageJson = JSON.parse(response.data);
    } catch (parseError) {
      console.error(`解析 ${projectName} 的 package.json 失敗:`, parseError.message);
      return null;
    }

    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const results = [];

    for (const targetPackage of PACKAGES) {
      if (dependencies[targetPackage.name]) {
        const currentVersion = dependencies[targetPackage.name];
        const needsUpdate = currentVersion !== targetPackage.targetVersion;

        if (needsUpdate) {
          results.push({
            projectName,
            packageName: targetPackage.name,
            currentVersion,
            targetVersion: targetPackage.targetVersion
          });
        }
      }
    }

    return results;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    return null;
  }
}

async function main() {
  const projects = await getAllProjects();
  if (projects.length === 0) {
    console.error('無法取得專案列表，請確認 PRIVATE_TOKEN 是否正確且有足夠權限');
    return;
  }

  console.log('檢查中...');

  // 用來存儲每個專案需要更新的套件
  const projectUpdates = {};

  for (const project of projects) {
    const results = await checkPackageJson(project.id, project.name);
    if (results && results.length > 0) {
      projectUpdates[project.name] = results.map(r => ({
        name: r.packageName,
        from: r.currentVersion,
        to: r.targetVersion
      }));
    }
  }

  // 輸出結果
  console.log('\n=== 需要更新的專案 ===');
  Object.entries(projectUpdates).forEach(([projectName, updates]) => {
    console.log(`\n${projectName}:`);
    updates.forEach(update => {
      console.log(`  ${update.name}: ${update.from} → ${update.to}`);
    });
  });
}

main().catch(console.error);
