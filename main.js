const path = require('path')
const process = require('process')

const version = require('./package.json').version
const log = require('./src/log.js')
const buildJS = require('./src/build.js')

function getOptionsFromFile(packageJsonPath) {
  try {
    const packageJson = require(packageJsonPath)
    return packageJson
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      log.err(`config file not found (${packageJsonPath})`)
    } else {
      throw err
    }
  }
}

async function start(options) {
  log.info('Embler ' + version)

  let workingDir = process.cwd()

  if (typeof options === 'string') {
    log.info(`Loading config file (${options})`)
    const packageJsonFullPath = path.resolve(options)
    options = getOptionsFromFile(packageJsonFullPath)

    // make sure paths in package.json are resolved relative to the package.json
    workingDir = path.dirname(packageJsonFullPath)
  } else {
    log.info('Loading config')
  }

  const parsedOptions = await buildJS.parseOptions(options, workingDir)
  await buildJS.build(parsedOptions)
  log.success('Done')
}

async function build(options) {
  try {
    await start(options)
  } catch(err) {
    log.err(err)
  }
}

module.exports = { build }
