#!/usr/bin/env node

const process = require('process')
const path = require('path')
const fs = require('fs')
const plist = require('simple-plist')
const Joi = require('joi');

const packagrPjson = require('./package.json')

const dir = process.cwd()
const packageJsonPath = path.join(dir, 'package.json')
const packageJson = require(packageJsonPath)
const year = new Date().getFullYear()

function log(...msg) { console.log(...msg) }
log.err = function (...msg) {
  console.log('Error:', ...msg)
  console.log('')
  process.exit(1)
}

log('Packagr', packagrPjson.version)

function parseOptions() {
  if (fs.existsSync(packageJsonPath)) log(`Located package.json (${packageJsonPath})`)
  else log.err(`package.json not found (${packageJsonPath})`)

  const schema = Joi.object({
    name: Joi.string().required(),
    version: Joi.string(),
    author: Joi.string(),
    packagr: Joi.object()
      .required()
      .keys({
        name: Joi.string().default(Joi.ref('/name')),
        appName: Joi.string().default((parent, helpers) => {
          return helpers.state.ancestors[1].name
        }),
        appId: Joi.string().default((parent, helpers) => {
          return 'com.packagr.'+helpers.state.ancestors[1].name
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
            icon: Joi.string(),
            targets: Joi.array().items('app').default(['app']),
            backgroundApp: Joi.bool().default(false),
          })
      })
  })
  .or('name', 'packagr.name')
  .or('author', 'packagr.author')
  .or('version', 'packagr.version')

  const vResult = schema.validate(packageJson, { allowUnknown: true, abortEarly: false })
  if (vResult.error) {
    let errorMsg = ''
    for (const err of vResult.error.details) {
      errorMsg += `\n  - property ${err.message}`
    }
    log.err('Invalid package.json config:' + errorMsg)
  }
  return vResult.value
}

const options = parseOptions()
log(options)
