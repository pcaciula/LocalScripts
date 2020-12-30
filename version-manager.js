const semverEx = require('semver-extra');
const { execSync } = require('child_process');
const eol = require('eol');
const logger = require('./logger.js');
const fs = require("fs");
const _git = require('./git.js');

const readJSONFileToObject = (filePath) => JSON.parse(fs.readFileSync(filePath).toString())

/**
 * Update given value(s) per key in package.json
 *
 * @param {object | string} key object of package json props (dot-separted for sub object).
 * @param {string | null} val ignore if key is object
 */
 const writeToPackageFile = (filePath, key, val) => {
  const config = (typeof key !== 'object' && val) ? {[key]:val} : key;
  let json = readJSONFileToObject(filePath);
  for (prop in config) {
    const props = prop.split('.');
    if (config.hasOwnProperty(prop)) {
      if (props.length == 1) {
        json[props[0]] = config[props[0]];
      } else {
        json[props[0]][props[1]] = config[prop];
      }
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
}

const writeVersionToPackage = (filePath, newVersion) => {
  writeToPackageFile(filePath, 'version', newVersion);
}
const updateMoleculesAtomsVersion = (filePath, version) => {

};
const updatePackageDependency = (filePath, componentType, newVersion) => {
  writeToPackageFile(filePath,);
}
const getPackageNameFromType =  (type) => {
  return `nbcs-${type.replace('lib/', '')}`;
}
const getLatestTagByType = (type) => {
  const packageIdentifier = `${getPackageNameFromType(type)}@`;
  logger.cmd(`git tag -l ${packageIdentifier}*`)
  let tags = execSync(`git tag -l ${packageIdentifier}*`).toString();
  tags = eol.split(tags);
  logger.log(tags, `All tags for ${type}`);
  // Last item is empty line;
  tags.pop();
  tags = tags.map((tag) => tag.replace(packageIdentifier, ''));
  return semverEx.max(tags, '*');
}
const getPathToPackageFile = (type) => {
  // this is relative to root (where package.json is). That means that
  // this cannot be called from it's own directory (path would be ../components).
  // If this functionality is necessary will have to build to take into
  // accoutn cwd.
  const base = 'components/'
  return `${base}${type}/package.json`
};

const updatePackageFileToLatest = (type, latest) => {
  const _path = getPathToPackageFile(type);
  writeVersionToPackage(_path, latest);
}
const actOnAllPackages = (action) => {
  const packages = ['atoms', 'molecules', 'store', 'lib/helpers'];
  packages.forEach((packageType) => action(packageType));
}
 const updateFromTags = () => {
  const versionsByPackage = {};
  actOnAllPackages((packageType) => {
    const tag = getLatestTagByType(packageType);
    logger.log(tag, `Latest tag for ${packageType}`);
    updatePackageFileToLatest(packageType, tag);
    versionsByPackage[packageType] = version;
  });
}
const getVersionFromPackage = (type) => {
  const _path = getPathToPackageFile(type);
  const package = readJSONFileToObject(_path);
  return package.version;
};

const retrieveVersionsByPackage = (currentBranch = null) => {
  const versionsByPackage = {};
  actOnAllPackages((packageType) => {
    const version = getVersionFromPackage(packageType);
    logger.log(version, `${packageType} Version ${currentBranch ? 'from ' + currentBranch : ''}`);
    versionsByPackage[packageType] = version;
  });
  return versionsByPackage;
}

const updateFromMaster = () => {
  // Save current branch so we can return to it.
  const currentBranch = _git.currentBranchName();
  if (currentBranch == 'master') {
    // Doesn't make sense to try to do this on master.
    return false;
  }

  const stashable = _git.isBranchStashable();
  _git.switchMaster(stashable);
  // Mappijng of packageType:versionNum - i.e. atoms:0.1.0-alpha.6)
  const versionsByPackage = retrieveVersionsByPackage(currentBranch);
  logger.log(versionsByPackage, 'Master Versions By Package');
  // Go back the feature branch, popping stashes if necessary.
  _git.resetToCurrentBranch(currentBranch, stashable);
  for (packageType in versionsByPackage) {
    updatePackageFileToLatest(packageType, versionsByPackage[packageType]);
  }
}

module.exports = {
  updateFromMaster,
  updateFromTags,
}
