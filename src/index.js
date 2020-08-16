const process = require('process')
const path = require('path')
const fs = require('fs')
const plist = require('simple-plist')

const Joi = require('./joi.js')
const pakagerPjson = require('../package.json')
const log = require('./log.js')

const dir = process.cwd()
const year = new Date().getFullYear()

log('Pakager', pakagerPjson.version)

function parseOptions() {
  const packageJsonPath = path.join(dir, 'package.json')
  const packageJson = require(packageJsonPath)
  if (!fs.existsSync(packageJsonPath)) {
    log.err(`package.json not found (${packageJsonPath})`)
  }

  const schema = Joi.object({
    name: Joi.string().required(),
    version: Joi.string(),
    author: Joi.string(),
    pakager: Joi.object()
      .required()
      .keys({
        name: Joi.string().default(Joi.ref('/name')),
        appName: Joi.string().default((parent, helpers) => {
          return helpers.state.ancestors[1].name
        }),
        appId: Joi.string().default((parent, helpers) => {
          return 'com.pakager.'+helpers.state.ancestors[1].name
        }),
        version: Joi.string().default(Joi.ref('/version')),
        author: Joi.string().default(Joi.ref('/author')),
        copyright: Joi.string().default((parent, helpers) => {
          return `Copyright © ${year} ${parent.author}`
        }),
        outputDir: Joi.string().default('dist'),
        backgroundApp: Joi.bool().default(false),
        mac: Joi.object()
          .required()
          .keys({
            category: Joi.string().required(),
            icon: Joi.path().existingFile(),
            targets: Joi.array().items('app').default(['app']),
            backgroundApp: Joi.bool().default(false),
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

const options = parseOptions()
log(options)
