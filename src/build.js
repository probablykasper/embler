const path = require('path')
const fs = require('fs').promises
fs.createWriteStream = require('fs').createWriteStream
const png2icons = require('png2icons')
const plist = require('simple-plist')

const log = require('./log.js')

module.exports.parseOptions = async function(packageJson, workingDir) {
  const Joi = require('./joi.js').prepare(workingDir)
  const schema = Joi.object({
    name: Joi.string(),
    author: Joi.string(),
    version: Joi.string(),
    pakager: Joi.object()
      .required()
      .keys({
        realName: Joi.string().default((parent, helpers) => {
          const value = helpers.state.ancestors[1].name
          helpers.warn('any.recommended.default', { value })
          return value
        }),
        appId: Joi.string().default((parent, helpers) => {
          const value = 'com.example.'+helpers.state.ancestors[1].name
          helpers.warn('any.recommended.default', { value })
          return value
        }),
        copyright: Joi.string().default((parent) => {
          const year = new Date().getFullYear()
          return `Copyright © ${year} ${parent.author}`
        }),
        outputDir: Joi.path().default(path.resolve(workingDir, 'dist')),
        backgroundApp: Joi.bool().default(false),
        name: Joi.string().default(Joi.ref('/name')),
        author: Joi.string().default(Joi.ref('/author')),
        version: Joi.string().default(Joi.ref('/version')),
        mac: Joi.object()
          .required()
          .keys({
            binary: Joi.path().existingFile().required(),
            category: Joi.string().default((parent, helpers) => {
              helpers.warn('any.recommended')
            }),
            icon: Joi.path().existingFile().endsWith('png', 'icns').default((parent, helpers) => {
              helpers.warn('any.recommended')
            }),
            formats: Joi.array().unique()
              .items('app', 'dmg', 'zip', 'tar.gz')
              .default([ 'app' ]),
            dmgBackground: Joi.path().existingFile()
              .default(path.resolve(__dirname, '../assets/dmg-background.png')),
            darkModeSupport: Joi.bool().default(true),
            customInfo: Joi.object().default({}),
          })
      })
  })
    .or('name', 'pakager.name')
    .or('author', 'pakager.author')
    .or('version', 'pakager.version')

  try {
    const vResult = await schema.validateAsync(packageJson, {
      allowUnknown: true,
      abortEarly: false,
      warnings: true,
      messages: {
        'any.recommended': 'Recommended property {{#label}} is missing',
        'any.recommended.default': 'Recommended property {{#label}} is missing, using default: {{#value}}',
      },
    })
    if (vResult.warning) {
      for (const warningDetail of vResult.warning.details) {
        log.warn('Config: ' + warningDetail.message)
      }
    }
    return vResult.value.pakager
  } catch(err) {
    let errorMsg = ''
    for (const detail of err.details) {
      errorMsg += `\n  - property ${detail.message}`
    }
    log.err('Invalid config:' + errorMsg)
  }
}

async function clearOutput(type, path) {
  try {
  
    const pathStat = await fs.stat(path)
    if (type === 'dir' && pathStat.isDirectory()) {
      await fs.rmdir(path, { recursive: true })
    } else if (type === 'file' && pathStat.isFile()) {
      await fs.unlink(path)
    } else {
      log.err(`Output path exists, but is not a ${type}. Delete or move it manually (${path})`)
    }

  } catch(err) {
    if (err.code !== 'ENOENT') log.err(err)
  }
}

module.exports.buildMacApp = async function(options, paths) {
  
  // delete existing .app
  await clearOutput('dir', paths.app)

  // create .app folders
  await fs.mkdir(paths.ResourcesDir, { recursive: true })
  await fs.mkdir(paths.MacOSDir, { recursive: true })

  // copy over icon
  if (options.mac.icon) {
    const inputIcon = await fs.readFile(options.mac.icon)
    if (options.mac.icon.endsWith('.png')) {
      const output = png2icons.createICNS(inputIcon, png2icons.BICUBIC, 0)
      if (output) await fs.writeFile(paths.icon, output)
      else log.err('Failed to convert PNG app icon to ICNS')
    } else if (options.mac.icon.endsWith('.icns')) {
      await fs.writeFile(inputIcon, paths.icon)
    }
  }

  
  // copy over binary
  await fs.copyFile(options.mac.binary, `${paths.MacOSDir}/${options.realName}`)

  const data = {
    // CFBundleDevelopmentRegion
    CFBundleDisplayName: options.realName,
    CFBundleExecutable: options.realName,
    CFBundleIconFile: 'app.icns',
    CFBundleIdentifier: options.appId,
    CFBundleInfoDictionaryVersion: '6.0',
    // CFBundleName
    CFBundlePackageType: 'APPL',
    CFBundleShortVersionString: options.version,
    CFBundleVersion: options.version,
    NSHumanReadableCopyright: options.copyright,
    LSUIElement: options.backgroundApp,
    NSRequiresAquaSystemAppearance: !options.mac.darkModeSupport,
  }
  if (options.mac.category) data.LSApplicationCategoryType = options.mac.category
  for (const [key, value] of Object.entries(options.mac.customInfo)) {
    data[key] = value
  }
  plist.writeFileSync(paths.InfoPlist, data)

}

module.exports.buildMacAppDmg = async function(options, paths) {

  const appdmg = require('appdmg')
  await new Promise((resolve, reject) => {
    const ee = appdmg({
      target: paths.dmg,
      basepath: __dirname,
      specification: {
        title: options.realName,
        icon: paths.icon,
        'icon-size': 160,
        window: { size: { width: 660, height: 400 } },
        background: options.mac.dmgBackground,
        contents: [
          { x: 180, y: 170, type: 'file', path: paths.app },
          { x: 480, y: 170, type: 'link', path: '/Applications' },
          { x: 180, y: 480, type: 'position', path: '.background' },
          { x: 180, y: 480, type: 'position', path: '.VolumeIcon.icns' },
          { x: 180, y: 480, type: 'position', path: '.DS_Store' },
          { x: 180, y: 480, type: 'position', path: '.Trashes' },
        ],
        // background: ''
      },
    })
    ee.on('finish', resolve)
    ee.on('error', reject)
  })
}

async function archiver(srcPath, destPath, format, options) {
  const archiver = require('archiver')
  const output = fs.createWriteStream(destPath)
  await new Promise((resolve) => {
    const archive = archiver(format, options)
    output.on('close', resolve)
    output.on('finish', resolve)
    output.on('warning', (err) => {
      log.info('FINW')
      if (err.code === 'ENOENT') log.warn(err)
      else log.err(err)
    })
    output.on('error', (err) => {
      log.info('FINe')
      log.err(err)
    })
    archive.pipe(output)
    const root = '/'+path.basename(srcPath)
    archive.directory(srcPath, root).finalize()
  })
}

module.exports.buildMacAppZip = async function(paths) {
  await archiver(paths.app, paths.zip, 'zip', {
    zlib: { level: 9 },
  })
}

module.exports.buildMacAppTar_gz = async function(paths) {
  await archiver(paths.app, paths.tar_gz, 'zip', {
    gzip: true,
    gzipOptions: { level: 9 },
  })
}

module.exports.buildMac = async function(options, distDir) {
  const formats = options.mac.formats

  const paths = {}
  paths.distDir = distDir

  paths.app = paths.distDir+`/${options.realName}.app`
  paths.appOutput = options.outputDir+`/${options.realName}.app`
  paths.dmg = paths.distDir+`/${options.realName}.dmg`
  paths.dmgOutput = options.outputDir+`/${options.realName}.dmg`
  paths.zip = paths.distDir+`/${options.realName}.zip`
  paths.zipOutput = options.outputDir+`/${options.realName}.zip`
  paths.tar_gz = paths.distDir+`/${options.realName}.tar.gz`
  paths.tar_gzOutput = options.outputDir+`/${options.realName}.tar.gz`

  paths.ContentsDir = paths.app+'/Contents'
  paths.InfoPlist = paths.app+'/Contents/Info.plist'
  paths.ResourcesDir = paths.app+'/Contents/Resources'
  paths.MacOSDir = paths.app+'/Contents/MacOS'
  paths.icon = paths.ResourcesDir+'/app.icns'

  log.info('Building macOS app')
  await module.exports.buildMacApp(options, paths)

  if (formats.includes('app/dmg') || formats.includes('dmg')) {
    log.info('Building macOS dmg')
    await module.exports.buildMacAppDmg(options, paths)
    await clearOutput('file', paths.dmgOutput)
    await fs.rename(paths.dmg, paths.dmgOutput)
  }

  if (formats.includes('zip')) {
    log.info('Building macOS zip')
    await module.exports.buildMacAppZip(paths)
    await clearOutput('file', paths.zipOutput)
    await fs.rename(paths.zip, paths.zipOutput)
  }

  if (formats.includes('tar.gz')) {
    log.info('Building macOS tar.gz')
    await module.exports.buildMacAppTar_gz(paths)
    await clearOutput('file', paths.tar_gzOutput)
    await fs.rename(paths.tar_gz, paths.tar_gzOutput)
  }

  if (formats.includes('app')) {
    await clearOutput('dir', paths.appOutput)
    await fs.rename(paths.app, paths.appOutput)
  }

}

module.exports.build = async function(options) {  
  const tempDir = path.join(options.outputDir, '.pakager-temp')
  await clearOutput('dir', tempDir)
  
  let startedCleaning
  async function cleanTempDir(dontExit) {
    if (startedCleaning) return
    startedCleaning = true
    await clearOutput('dir', tempDir)
    if (dontExit === 'nodontexit') process.exit()
  }
  process.on('exit', cleanTempDir)
  process.on('SIGINT', cleanTempDir)
  process.on('SIGTERM', cleanTempDir)
  process.on('SIGHUP', cleanTempDir)
  process.on('SIGBREAK', cleanTempDir)
  
  await fs.mkdir(tempDir, { recursive: true })
  if (options.mac) await module.exports.buildMac(options, tempDir)
  await cleanTempDir('nodontexit')
}
