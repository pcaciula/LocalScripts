const chalk = require('chalk');

const err = (msg, heading = 'ERROR') => log(msg, heading, 'bad');
const warn = (msg, heading = 'WARNING') => log(msg, heading, 'warn');
const cmd = (msg, heading ='COMMAND RUNNING') => log(msg, heading, 'cmd', '');
const log = (msg, heading = null, _type = 'good', append = '...') => {
  if (heading && _type) {
    let fn;
    switch (_type) {
      case 'bad':
        fn = chalk.red.bold;
        break;
      case 'warn':
        fn = chalk.keyword('orange').bold;
        break;
      case 'cmd':
        fn = chalk.magenta
        break;
      case 'good': //intentional fallthrough
      default:
        fn = chalk.green;
        break;
    }
    msg = `${fn('[' + heading + ']')} ${msg}${append}`;
  }
  console.log(msg);
}

module.exports = {
  log,
  err,
  warn,
  cmd,
}
