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

  // const distDir = options.outputDir
  // const appPath = path.join(distDir, `${options.realName}.app`)
  // const ContentsDir = path.join(distDir, `${options.realName}.app/Contents`)
  // const ResourcesDir = path.join(distDir, `${options.realName}.app/Contents/Resources`)
  // const MacOSDir = path.join(distDir, `${options.realName}.app/Contents/MacOS`)
  // const iconPath = path.resolve(ResourcesDir, 'app.icns')
  
  // delete existing .app
  try {
    const appPathStat = await fs.stat(paths.appPath)
    if (appPathStat.isDirectory()) {
      await fs.rmdir(paths.appPath, { recursive: true })
    } else {
      log.err(`Mac app path is a non-folder. Delete or move it manually (${paths.appPath})`)
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
      if (output) await fs.writeFile(paths.iconPath, output)
      else log.err('Failed to convert PNG app icon to ICNS')
    } else if (options.mac.icon.endsWith('.icns')) {
      await fs.writeFile(inputIcon, paths.iconPath)
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

module.exports.buildMac = async function(options) {

  const paths = {}
  paths.distDir = options.outputDir
  paths.appPath = path.join(paths.distDir, `${options.realName}.app`)
  paths.ContentsDir = path.join(paths.appPath, 'Contents')
  paths.ResourcesDir = path.join(paths.appPath, 'Contents/Resources')
  paths.MacOSDir = path.join(paths.appPath, 'Contents/MacOS')
  paths.iconPath = path.join(paths.ResourcesDir, 'app.icns')
  
  await module.exports.buildMacApp(options, paths)
}

module.exports.build = async function(options) {
  if (options.mac) module.exports.buildMac(options)
}
