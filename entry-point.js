const logger = require('./logger.js');
const _version = require('./version-manager.js');
const _git = require('./git.js');
const modules = {
  version: _version,
  git: _git,
}

const logCall = (moduleName, fnName, args) => {
  logger.cmd(`${moduleName}.${fnName}(${args.length ? args.join(',') : ''})`);
}

const entryPoint = () => {
  const args = process.argv;
  if (args.length < 3) {
    //...no params what should we do?
    // default fn?
    return false;
  }
  // Shift off node: /usr/local/bin/node'
  args.shift();
  // Shift off this file: ...entry-point.js
  args.shift();
  const moduleName = args.shift().toLowerCase();
  const fnName = args.shift();
  logCall(moduleName, fnName, args);
  // whats left of args is all user passed params
  modules[moduleName][fnName](...args);
}

entryPoint();
