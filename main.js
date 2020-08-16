const fs = require('fs')
const path = require('path')

const version = require('./package.json').version
const log = require('./src/log.js')
const { parseOptions, macBuild } = require('./src/build.js')

function build (options) {
  log('Pakager', version)

  if (typeof options === 'string') {
    const packageJsonPath = path.resolve(options)
    if (!fs.existsSync(packageJsonPath)) {
      log.err(`package.json not found (${packageJsonPath})`)
    }
    const packageJson = require(packageJsonPath)
    options = packageJson
  }

  const parsedOptions = parseOptions(options)
  macBuild(parsedOptions)
}

module.exports = { build }
