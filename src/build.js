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
        copyright: Joi.string().default((parent, helpers) => {
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
            formats: Joi.array().items('app').default(['app']),
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
      log(detail)
      errorMsg += `\n  - property ${detail.message}`
    }
    log.err('Invalid package.json config:' + errorMsg)
  }
}

module.exports.macBuild = async function(options) {

  const distDir = options.outputDir
  const appPath = path.join(distDir, `${options.realName}.app`)
  const ContentsPath = path.join(distDir, `${options.realName}.app/Contents`)
  const ResourcesPath = path.join(distDir, `${options.realName}.app/Contents/Resources`)
  const MacOSPath = path.join(distDir, `${options.realName}.app/Contents/MacOS`)
  
  // delete existing .app
  try {
    const appPathStat = await fs.stat(appPath)
    if (appPathStat.isDirectory()) {
      await fs.rmdir(appPath, { recursive: true })
    } else {
      log.err(`Mac app path is a non-folder. Delete or move it manually (${appPath})`)
    }
  } catch(err) {
    if (err.code !== 'ENOENT') log.err(err)
  }

  // create .app folders
  await fs.mkdir(ResourcesPath, { recursive: true })
  await fs.mkdir(MacOSPath, { recursive: true })

  // copy over icon
  if (options.mac.icon) {
    const inputIcon = await fs.readFile(options.mac.icon)
    const iconDestPath = path.resolve(ResourcesPath, 'app.icns')
    if (options.mac.icon.endsWith('.png')) {
      const output = png2icons.createICNS(inputIcon, png2icons.BICUBIC, 0)
      if (output) await fs.writeFile(iconDestPath, output)
      else log.err('Failed to convert PNG app icon to ICNS')
    } else if (options.mac.icon.endsWith('.icns')) {
      await fs.writeFile(inputIcon, output)
    }
  }

  
  // copy over binary
  await fs.copyFile(options.mac.binary, `${MacOSPath}/${options.realName}`)

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
  plist.writeFileSync(`${ContentsPath}/Info.plist`, data)

}
