const logger = require('./logger.js');
const Conflicts = require('./git-conflicts.js');
const { execSync } = require('child_process');
const eol = require('eol');
const utils = require('./utils.js');

/**
 * Pass through to get to conflict resolver.
 *
 * @param {Bool} forcePushOrigin true = force push to origin (ignored if dryrun = true)
 * @param {Bool} finishRebase true = rebase --continue (ignored if dryrun = true)
 * @param {Bool} dryRun true = ignore first to options and exit.
 * @param {Bool} leaveRebaseOpen true = don't abort rebase. only used for dryrun = true
 */
const fixStandardConflict = (forcePushOrigin = false, finishRebase = true, dryRun = false, leaveRebaseOpen = false) => {
  return Conflicts.resolve(currentBranchName(), forcePushOrigin, finishRebase, dryRun, leaveRebaseOpen);
}

const ignoreAllAppFiles = () => {
  ['atoms', 'molecules', 'store'].forEach((type) => {
    const filePath = `components/${type}/src/App.vue`;
    ignoreFile(filePath);
  })
}

const ignoreFile = (filePath) => {
  logger.cmd(`git update-index --skip-worktree ${filePath}`);
  execSync(`git update-index --skip-worktree ${filePath}`)
}

/**
 * Retrieve name of the branch currently checked out.
 */
const currentBranchName = () => {
  const branch = utils.getCmdOutput('git rev-parse --abbrev-ref HEAD');
  // command line out put has an extra empty line break at the end. clean it up.
  return eol.split(branch)[0];
}

const switchMaster = (stashable = null) => {
  execSync('git fetch --all');
  stashable = stashIf(stashable);
  logger.cmd('git checkout master && git reset --hard origin/master');
  execSync('git checkout master && git reset --hard origin/master')
  return stashable;
}

const rebase = () => {
  logger.cmd('git fetch --all --tags');
  execSync('git fetch --all --tags');
  const stashable = stashIf();
  logger.cmd('git rebase origin/master');
  utils.runOrLogError('git rebase origin/master',
   `Rebase failed - likely there are conflicts.
   Either abort and restart "git rebase --abort" and then do "git rebase" or fix conflicts manually:
    1. "git status" to see conflicted files
    2. resolve conflicts manually
    3. "git add " files that have resolved conflicts,
    4. "git rebase --continue"`
  );
  popIf(stashable);
}

const newFeatureBranch = (ticketNumber) => {
  if (!ticketNumber) {
    logger.err(eol.after('NewFeatureBranch command requires a ticket number') + 'Please try again adding a number to the command that was just run')
    return false;
  }
  const branch = currentBranchName();
  let stashable;
  if (branch != 'master') {
    // go to master, make sure it's up to date, in order tocut a new feture branch from there.
    stashable = switchMaster();
    if (stashable) {
      logger.warn('There were changes that have been stashed. The stash will be poped when the rest of the command completes')
    }
  }
  logger.cmd(`git checkout -B feature/SPAN-${ticketNumber}`);
  execSync(`git checkout -B feature/SPAN-${ticketNumber}`);
  // only do this if we tried to stash before in switching to master.
  // If we try to pop the stash it could unintentionally pop an unrelated stash.
  if (branch != 'master') popIf(stashable);
}
const isBranchStashable = () => {
  return utils.doesCmdError('git diff-index --quiet HEAD -- ', 'stashable');
}
const resetToCurrentBranch = (currentBranch, stashable) => {
  execSync(`git checkout ${currentBranch}`);
  popIf(stashable);
}
const stashIf = (stashable = null) => {
  return execIfStashable("git stash save", stashable);
}
const popIf = (stashable = null) => {
  return execIfStashable("git stash pop", stashable);
}
const execIfStashable = (cmd, stashable = null) => {
  stashable = stashable == null ? isBranchStashable() : stashable;
  if (stashable) {
    logger.cmd(cmd);
    execSync(cmd);
  }
  return stashable;
}


module.exports = {
  currentBranchName,
  switchMaster,
  isBranchStashable,
  resetToCurrentBranch,
  newFeatureBranch,
  rebase,
  fixStandardConflict,
  ignoreAllAppFiles,
}
