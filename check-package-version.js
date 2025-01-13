const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const config = require("config");
const semver = require("semver");

// 檢查版本是否需要更新
function needsUpdate(currentVersion, targetVersion) {
  // 移除版本字串開頭的 ^ 或 ~
  const cleanCurrentVersion = currentVersion.replace(/^[\^~]/, '');
  const cleanTargetVersion = targetVersion.replace(/^[\^~]/, '');

  // 如果版本完全相同，不需要更新
  if (cleanCurrentVersion === cleanTargetVersion) {
    return false;
  }

  // 如果當前版本是以 ^ 開頭，檢查是否符合相容版本範圍
  if (currentVersion.startsWith('^')) {
    return !semver.satisfies(cleanTargetVersion, currentVersion);
  }

  // 如果當前版本是以 ~ 開頭，檢查是否符合補丁版本範圍
  if (currentVersion.startsWith('~')) {
    return !semver.satisfies(cleanTargetVersion, currentVersion);
  }

  // 其他情況，直接比較版本是否相同
  return cleanCurrentVersion !== cleanTargetVersion;
}

// 檢查專案是否應該被排除
function shouldExcludeProject(projectName, projectKeywords) {
  return projectKeywords.some(keyword => projectName.toLowerCase().includes(keyword.toLowerCase()));
}

// 檢查專案是否符合包含關鍵字條件
function shouldIncludeProject(projectName, includeKeywords) {
  // 如果沒有設定包含關鍵字，則包含所有專案
  if (!includeKeywords || includeKeywords.length === 0) {
    return true;
  }
  // 檢查專案名稱是否包含任一關鍵字
  return includeKeywords.some(keyword => projectName.toLowerCase().includes(keyword.toLowerCase()));
}

// 檢查專案是否有需要忽略的套件
function getIgnoredPackages(projectName, exceptions) {
  const projectException = exceptions.find(exp => exp.projectName === projectName);
  return projectException ? projectException.ignoredPackages : [];
}

async function getAllProjects(gitlabUrl, privateToken) {
  try {
    const response = await axios.get(`${gitlabUrl}/projects`, {
      headers: {
        "PRIVATE-TOKEN": privateToken,
      },
      params: {
        per_page: 100,
        membership: true,
      },
    });
    return response.data;
  } catch (error) {
    console.error("取得專案列表失敗:", error.message);
    throw new Error("無法取得專案列表，請確認 GitLab URL 和 Token 是否正確且有足夠權限");
  }
}

async function checkPackageJson(projectId, projectName, gitlabUrl, privateToken, defaultBranch, targetPackages, exceptions) {
  try {
    // 先檢查分支是否存在
    try {
      await axios.get(
        `${gitlabUrl}/projects/${projectId}/repository/branches/${defaultBranch}`,
        {
          headers: {
            "PRIVATE-TOKEN": privateToken,
          }
        }
      );
    } catch (branchError) {
      if (branchError.response && branchError.response.status === 404) {
        console.log(`專案 ${projectName} 不存在 ${defaultBranch} 分支，已跳過`);
        return null;
      }
      throw branchError;
    }

    const response = await axios.get(
      `${gitlabUrl}/projects/${projectId}/repository/files/package.json/raw`,
      {
        headers: {
          "PRIVATE-TOKEN": privateToken,
        },
        params: {
          ref: defaultBranch,
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
    const ignoredPackages = getIgnoredPackages(projectName, exceptions);

    for (const targetPackage of targetPackages) {
      // 如果套件在忽略清單中，則跳過
      if (ignoredPackages.includes(targetPackage.name)) {
        continue;
      }

      if (dependencies[targetPackage.name]) {
        const currentVersion = dependencies[targetPackage.name];

        if (needsUpdate(currentVersion, targetPackage.targetVersion)) {
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

async function checkPackageVersions(settings) {
  const {
    gitlab: { url: GITLAB_URL, token: PRIVATE_TOKEN, branch: DEFAULT_BRANCH },
    packages: PACKAGES,
    exceptions: { projects: EXCEPTIONS = [], projectKeywords: PROJECT_KEYWORDS = [] },
    projectIncludeKeywords: PROJECT_INCLUDE_KEYWORDS = []
  } = settings;

  const projects = await getAllProjects(GITLAB_URL, PRIVATE_TOKEN);

  // 用來存儲每個專案需要更新的套件
  const projectUpdates = {};

  for (const project of projects) {
    // 如果專案名稱包含排除關鍵字，或不包含指定的包含關鍵字，則跳過
    if (shouldExcludeProject(project.name, PROJECT_KEYWORDS) ||
        !shouldIncludeProject(project.name, PROJECT_INCLUDE_KEYWORDS)) {
      continue;
    }

    const results = await checkPackageJson(
      project.id,
      project.name,
      GITLAB_URL,
      PRIVATE_TOKEN,
      DEFAULT_BRANCH,
      PACKAGES,
      EXCEPTIONS
    );

    if (results && results.length > 0) {
      projectUpdates[project.name] = results;
    }
  }

  return projectUpdates;
}

module.exports = {
  checkPackageVersions,
  needsUpdate,
  shouldExcludeProject,
  shouldIncludeProject,
  getIgnoredPackages
};

