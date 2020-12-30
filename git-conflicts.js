const logger = require('./logger.js');
const { execSync } = require('child_process');
const eol = require('eol');
const fs = require("fs");

/**
 * Main entryoint to attempt conflict resolution of index.js and app.vue
 */
const resolve = (branchName, forcePushOrigin = false, finishRebase = true, dryRun = false, leaveRebaseOpen = false) => {
  // Don't exit  when the rebase fails -it's likely it will.
  execSync('git fetch --all && git rebase origin/master || true');
  conflictedFiles = getConflictedFiles();
  logger.log(`[${conflictedFiles}]`, 'Conflicted Files');
  if (!shouldDoConflictResolution(conflictedFiles)) {
    logger.err('Standard tests Failed. It is unsafe to automate this conflict resolution. Should be handled manually.');
    logger.cmd('git rebase --abort');
    execSync('git rebase --abort');
    return false;
  }
  conflictedFiles.forEach(resolveFileConflict);
  if (dryRun === 'true')  {
    if (leaveRebaseOpen === 'false') {
      logger.cmd('git rebase --abort');
      execSync('git rebase --abort');
    }
    return false;
  }
  // ToDo: Maybe test storybook somehow and abort if it won't compile.
  // Never do this on a dry run. We've already returned.
  if (finishRebase === 'true') {
    logger.cmd('git rebase --continue');
    execSync('git rebase --continue')
    // Rebase has to be completed to do this.
    if (forcePushOrigin === 'true') {
      // This may  be too dangerous for now.
     // logger.cmd(`git push -f origin ${branchName}`);
      // execSync(`git push -f origin ${branchName}`);
    }
  }
}

const shouldDoConflictResolution = (conflictedFiles, maxFilesToResolve = 4) => {
  const filesCount = conflictedFiles.length;
  // Nothing to do skip.
  if (filesCount <= 0) return false;
  logger.log('More than 0 files', 'TEST PASSED')
  // IF we can test for max don't try to resolve if more than the max are conflicted.
  if (maxFilesToResolve && (filesCount > maxFilesToResolve)) return false;
  logger.log(`Not Greater than max files (${maxFilesToResolve})`, 'TEST PASSED')
  // Any of the files are not index or app - we don't know how to resolve.
  if (conflictedFiles.some(file => !stringContainsAny(file, ['index.js', 'App.vue', 'package.json']))) return false;
  logger.log('All Files were either index or app or package', 'TEST PASSED')
  return true;
}

/**
 * Determine file type and apply appropriate method of resolution.
 *
 * @param {String} file
 */
const resolveFileConflict = (file) => {
  const parts = file.split('/');
  const fileName = parts.pop();
  logger.log(fileName, 'File Name');
  switch (fileName) {
    case 'index.js': return resolveIndexConflict(file);
    case 'App.vue': return resolveAppFileConflict(file);
    case 'package.json': return resolvePackageConflictedFile(file);
    // Something's wrong we only know how to resolve the 3types.
    default: return false;
  }
};

/**
 * Read conflicted files from diff  (assume  after rebase).
 */
const getConflictedFiles = () => {
  let conflictedFiles = execSync('git diff --name-only --diff-filter=U').toString();
  conflictedFiles = eol.split(conflictedFiles);
  // last line is an empty string.
  conflictedFiles.pop();
  return conflictedFiles;
}

/**
 * Fix Conflicted index file using both changes.
 *
 * @param {String} filePath path to index.js
 */
const resolveIndexConflict = (filePath) => {
  let file = fs.readFileSync(filePath).toString();
  let lines = eol.split(file);
  const resolvedLines = resolveBoth(lines);
  file = resolvedLines.join(eol.auto);
  logger.log(file, "Resolved File After Merging both.");
  fs.writeFileSync(filePath, file);
  execSync(`git add ${filePath}`);
}

/**
 * Resolve Conflict keeping both changes.
 *
 * Clean all merge conflict indicators ('<<<<<<<', '=======', '>>>>>>>')
 * and their associated lines. Make sure commas are not missing.
 *
 * @param {Array} lines The lines of the affected file as an array.
 *
 * @return {Array} Resolved Lines as an array.
 */
const resolveBoth = (lines) => {
  let insideBrackets = false;
  let resolvedLines = [];
  const bracketed = [];
  lines.forEach((line, index) => {
    let package = false;
    // Stop here if it's a conflict indicator line - don't modify just remove.
    if (stringContainsAny(line)) return;
    if (!insideBrackets) {
      if (lineHasBracket(line)) insideBrackets = true;
    } // This condition is only closing bracket.
    else if (lineHasBracket(line, false)) {
      insideBrackets = false;
      // Because it's the closing braket, prev, line was last in object
      // Let's kill it's comma - trailing comma may be an issue for vue cli app.
      const lastLine = resolvedLines.pop();
      // Readd last item Trimming last comma and any trailing whitespace.
      resolvedLines.push(trimTrailingComma(lastLine));
    }
    else {
      // If we made it here we know it's a bracketed line that may need a comma.
      // Do not duplicate.
      package = trimTrailingComma(line);
      if (bracketed.includes(package)) return;
      if (!line.includes(',')) line += ',';
    }
    // Save the
    if (package) bracketed.push(package);
    resolvedLines.push(line);
  });
  return resolvedLines;
}
const trimTrailingComma = (str) => str.replace(/,\s*$/, "");


/**
 * Resolve Package w/master and add. Shouldn't have changes to package
 *
 * @param {String} filePath
 */
const resolvePackageConflictedFile = (filePath) => resolveAndAdd(filePath);

/**
 * Resolve app file conflict using this branch and add the changed file  back.
 *
 * @param {String} filePath path  to App.vue
 */
const resolveAppFileConflict = (filePath) => resolveAndAdd(filePath, false);

const resolveAndAdd = (filePath, useMaster = true) => {
  resolveConflictedFile(filePath, useMaster);
  execSync(`git add ${filePath}`);
}
/**
 * Resolve conflict based on which version to use (master or current branch).
 *
 * @param {String} _file full path to file that has conflicts
 * @param {Bool} useMaster true = use changes  from  master instead of this branch.
 */
const resolveConflictedFile = (_file, useMaster = true) => {
  // This is  very confusing, but ours refers to the other branch your rebasing
  // or merging against. Theirs is in fact current branch.
  // This fn  assumes we're rebase against master and resolving the conflict
  // based on whether or not to use  master. Default is true which results
  // in 'ours' which, counterintuitively is master.
  const whose = useMaster ? 'ours' : 'theirs';
  execSync(`git checkout --${whose} ${_file}`);
}

/**
 * Determine if string passed has a bracket of the  requested type.
 *
 * @param {String} line any text string
 * @param {Bool} bracketOpen whether or not to find open bracket. false = closed bracket
 *
 * @return {Bool} whether or not sting contains requested bracket type.
 */
const lineHasBracket = (line, bracketOpen = true) => {
  const bracket = bracketOpen  ? '{' : '}';
  return line.includes(bracket);
}

/**
 * Test whether a string contains any of the given substrings.
 *
 * @param {String} str the string to test
 * @param {Array} tests array of substrings the str might include. defaults to git conflict markers.
 *
 * @return {Bool} whether or not string contains any of test substrings.
 */
const stringContainsAny = (str, tests = ['<<<<<<<', '=======', '>>>>>>>']) => {
  const matches = tests.filter(item => str.includes(item));
  return matches.length > 0;
}

module.exports = {
  resolve,
  resolveConflictedFile
}
