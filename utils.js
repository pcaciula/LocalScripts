const logger = require('./logger.js');
const {execSync} = require('child_process');

/**
 * Run a command and trap and return if it errors.
 *
 * @param {string} cmd shell command string
 * @param {string} trapText optional defaults to fail shouldn't matter what it is.
 *
 * @return {boolean} whether or not cmd fails.
 */
const doesCmdError = (cmd, trapText = 'fail') => getCmdOutput(cmd, true, trapText).includes(trapText);

/**
 * Execute a cmd, trap error and log if there's an error.
 *
 * @param {string} cmd shell command string
 * @param {string} errMsg error message to be shown in the event cmd fails.
 */
const runOrLogError = (cmd, errMsg = 'The prev command failed') => {
  if (doesCmdError(cmd)) {
    logger.err(errMsg);
    return false;
  }
  return true;
}

/**
 * Return cmd output, trapping err if requested.
 *
 * @param {string} cmd shell command string
 * @param {boolean} trap whether or not to trap error defaults false
 * @param {string} trapText optional defaults to fail shouldn't matter what it is.
 *
 * @return output of shell cmd.
 */
const getCmdOutput = (cmd, trap = false, trapText = 'fail') => {
  if (trap) {
    cmd = trapCmdError(cmd, trapText);
  }
  return execSync(cmd).toString();
}

/**
 * Wrap cmd in '|| echo '. to trap and ignore.
 *
 * @param {string} cmd shell command string
 * @param {string} trapText optional defaults to fail shouldn't matter what it is.
 *
 * @return newly wrapped cmd.
 */
const trapCmdError = (cmd, trapText = 'fail') => `${cmd} || echo '${trapText}'`

module.exports = {
  doesCmdError,
  runOrLogError,
  getCmdOutput,
}
