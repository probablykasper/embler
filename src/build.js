const path = require('path')
const fs = require('fs')
const png2icons = require('png2icons')
const plist = require('simple-plist')

const Joi = require('./joi.js')
const log = require('./log.js')

const year = new Date().getFullYear()

module.exports.parseOptions = function(packageJson) {
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
          return `Copyright © ${year} ${parent.author}`
        }),
        outputDir: Joi.string().default('dist'),
        backgroundApp: Joi.bool().default(false),
        mac: Joi.object()
          .required()
          .keys({
            binary: Joi.path().existingFile().required(),
            category: Joi.string(),
            icon: Joi.path().existingFile().endsWith('png', 'icns'),
            // icon: Joi.path().existingFile().pattern(/\.(zip|png)$/).message('{{#}}'),
            formats: Joi.array().items('app').default(['app']),
            backgroundApp: Joi.bool().default(false),
            darkModeSupport: Joi.bool().default(true),
            customInfo: Joi.object().default({}),
          })
      })
  })
  .or('name', 'pakager.name')
  .or('author', 'pakager.author')
  .or('version', 'pakager.version')

  const vResult = schema.validate(packageJson, { allowUnknown: true, abortEarly: false })
  if (vResult.error) {
    let errorMsg = ''
    for (const err of vResult.error.details) {
      // log(err)
      errorMsg += `\n  - property ${err.message}`
    }
    log.err('Invalid package.json config:' + errorMsg)
  }
  return vResult.value.pakager
}

module.exports.macBuild = function(options) {

  const distDir = options.outputDir
  const appPath = path.join(distDir, `${options.realName}.app`)
  const contentsPath = path.join(distDir, `${options.realName}.app/Contents`)
  const resourcesPath = path.join(distDir, `${options.realName}.app/Contents/Resources`)
  
  // delete existing .app
  if (fs.existsSync(appPath) && fs.statSync(appPath).isDirectory()) {
    fs.rmdirSync(appPath, { recursive: true })
  } else if (fs.existsSync(appPath)) {
    log.err(`Mac app path is a non-folder. Delete or move it manually (${appPath})`)
  }

  // create .app folders
  fs.mkdirSync(resourcesPath, { recursive: true })

  // copy over icon
  if (options.mac.icon) {
    const inputIcon = fs.readFileSync(options.mac.icon)
    const iconDestPath = path.resolve(resourcesPath, 'app.icns')
    if (options.mac.icon.endsWith('.png')) {
      const output = png2icons.createICNS(inputIcon, png2icons.BICUBIC, 0)
      if (output) fs.writeFileSync(iconDestPath, output)
      else log.err('Failed to convert PNG app icon to ICNS')
    } else if (options.mac.icon.endsWith('.icns')) {
      fs.writeFileSync(inputIcon, output)
    }
  }

  
  // copy over binary
  // await exec([ '.', '--target', 'macos', '--output', `${contentsPath}/MacOS/${options.appName}` ])

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
    NSHumanReadableCopyright: `Copyright © ${year} ${options.author}`,
    LSUIElement: options.backgroundApp,
    NSRequiresAquaSystemAppearance: !darkModeSupport,
  }
  if (options.category) data.LSApplicationCategoryType = options.category
  for (const [key, value] of Object.entries(options.mac.customInfo)) {
    console.log(key, value)
    data[key] = value
  }
  plist.writeFileSync(`${contentsPath}/Info.plist`, data)

}
