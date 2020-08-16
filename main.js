const fs = require('fs')
const path = require('path')
const process = require('process')

const version = require('./package.json').version
const log = require('./src/log.js')
const { parseOptions, macBuild } = require('./src/build.js')

function build(options) {
  log('Pakager', version)

  workingDir = process.cwd()

  if (typeof options === 'string') {
    const packageJsonPath = path.resolve(options)
    if (!fs.existsSync(packageJsonPath)) {
      log.err(`package.json not found (${packageJsonPath})`)
    }
    const packageJson = require(packageJsonPath)
    options = packageJson

    // make sure paths in package.json are resolved relative to the package.json
    workingDir = path.dirname(packageJsonPath)
  }

  const parsedOptions = parseOptions(options, workingDir)
  macBuild(parsedOptions)
}

module.exports = { build }
