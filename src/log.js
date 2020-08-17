const chalk = require('chalk')
const process = require('process')

// ⸤⸣ ⬤ ❯ • ‣ ❱
const symbol = '⬤'

const log = function(...msg) {
  console.log(...msg)
}

log.info = function(...msg) {
  console.log(chalk.blue(symbol), ...msg)
}

log.warn = function(...msg) {
  console.log(chalk.yellow(symbol), ...msg)
}

log.success = function(...msg) {
  console.log(chalk.green(symbol), ...msg)
}

log.err = function(...msg) {
  console.log(chalk.red(symbol), ...msg)
  console.log('')
  process.exit(1)
}

module.exports = log
