const path = require('path')
const fs = require('fs').promises
const png2icons = require('png2icons')
const plist = require('simple-plist')

const log = require('./log.js')

module.exports.parseOptions = async function(packageJson, workingDir) {
  const Joi = require('./joi.js').prepare(workingDir)
  const schema = Joi.object({
    name: Joi.string(),
    version: Joi.string(),
    author: Joi.string(),
    pakager: Joi.object()
      .required()
      .keys({
        name: Joi.string().default(Joi.ref('/name')),
        version: Joi.string().default(Joi.ref('/version')),
        author: Joi.string().default(Joi.ref('/author')),
        realName: Joi.string().default((parent, helpers) => {
          return helpers.state.ancestors[1].name
        }),
        appId: Joi.string().default((parent, helpers) => {
          return 'com.pakager.'+helpers.state.ancestors[1].name
        }),
        copyright: Joi.string().default((parent) => {
          const year = new Date().getFullYear()
          return `Copyright © ${year} ${parent.author}`
        }),
        outputDir: Joi.path().default(path.resolve(workingDir, 'dist')),
        backgroundApp: Joi.bool().default(false),
        mac: Joi.object()
          .required()
          .keys({
            binary: Joi.path().existingFile().required(),
            category: Joi.string(),
            icon: Joi.path().existingFile().endsWith('png', 'icns'),
            formats: Joi.array()
              .unique()
              .items('app', 'dmg', 'app/dmg')
              .default([ 'app' ]),
            darkModeSupport: Joi.bool().default(true),
            customInfo: Joi.object().default({}),
          })
      })
  })
    .or('name', 'pakager.name')
    .or('author', 'pakager.author')
    .or('version', 'pakager.version')

  try {
    const vResult = await schema.validateAsync(packageJson, { allowUnknown: true, abortEarly: false })
    return vResult.pakager
  } catch(err) {
    let errorMsg = ''
    for (const detail of err.details) {
      errorMsg += `\n  - property ${detail.message}`
    }
    log.err('Invalid package.json config:' + errorMsg)
  }
}

module.exports.buildMacApp = async function(options, paths) {
  
  // delete existing .app
  try {
    const appPathStat = await fs.stat(paths.app)
    if (appPathStat.isDirectory()) {
      await fs.rmdir(paths.app, { recursive: true })
    } else {
      log.err(`Output path exists, but is not a folder. Delete or move it manually (${paths.app})`)
    }
  } catch(err) {
    if (err.code !== 'ENOENT') log.err(err)
  }

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
  plist.writeFileSync(`${paths.ContentsDir}/Info.plist`, data)

}

module.exports.buildMacAppDmg = async function(options, paths) {

  // delete existing .dmg
  try {
    const dmgPathStat = await fs.stat(paths.dmg)
    if (dmgPathStat.isFile()) {
      await fs.unlink(paths.dmg)
    } else {
      log.err(`Output path exists, but is not a file. Delete or move it manually (${paths.dmg})`)
    }
  } catch(err) {
    if (err.code !== 'ENOENT') log.err(err)
  }

  const appdmg = require('appdmg')
  await new Promise((resolve, reject) => {
    const ee = appdmg({
      target: paths.dmg,
      basepath: __dirname,
      specification: {
        title: options.realName,
        icon: paths.icon,
        contents: [
          { x: 192, y: 344, type: 'file', path: paths.app },
          { x: 448, y: 344, type: 'link', path: '/Applications' },
          { x: 100, y: 100, type: 'position', path: '.background' },
          { x: 100, y: 100, type: 'position', path: '.DS_Store' },
          { x: 100, y: 100, type: 'position', path: '.Trashes' },
          { x: 100, y: 100, type: 'position', path: '.VolumeIcon.icns' },
        ],
        // background: ''
      },
    })
    ee.on('finish', resolve)
    ee.on('error', reject)
  })
}

module.exports.buildMac = async function(options) {
  const formats = options.mac.formats

  const paths = {}
  paths.distDir = options.outputDir
  paths.app = path.join(paths.distDir, `${options.realName}.app`)
  paths.dmg = path.join(paths.distDir, `${options.realName}.dmg`)
  paths.ContentsDir = path.join(paths.app, 'Contents')
  paths.ResourcesDir = path.join(paths.app, 'Contents/Resources')
  paths.MacOSDir = path.join(paths.app, 'Contents/MacOS')
  paths.icon = path.join(paths.ResourcesDir, 'app.icns')
  
  log.info('Building macOS app')
  await module.exports.buildMacApp(options, paths)

  if (formats.includes('app/dmg') || formats.includes('dmg')) {
    log.info('Building macOS app/dmg')
    await module.exports.buildMacAppDmg(options, paths)
  }
}

module.exports.build = async function(options) {
  if (options.mac) await module.exports.buildMac(options)
}
