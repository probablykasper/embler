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

function log(...msg) { console.log(...msg) }
log.err = function (...msg) {
  console.log('Error:', ...msg)
  console.log('')
  process.exit(1)
}

log('Packagr', packagrPjson.version)

if (fs.existsSync(packageJsonPath)) log(`Located package.json (${packageJsonPath})`)
else log.err(`package.json not found (${packageJsonPath})`)

const schema = Joi.object({
  version: Joi.string(),
  author: Joi.string(),
  packagr: Joi.object()
    .required()
    .keys({
      appName: Joi.string(),
      appId: Joi.string(),
      version: Joi.string().default(Joi.ref('.version')),
      author: Joi.string().default(Joi.ref('...author')),
      copyright: Joi.string(),
      mac: Joi.object()
        .required()
        .keys({
          category: Joi.string(),
          targets: Joi.array().items('app').default(['app']),
          backgroundApp: Joi.bool().default(false),
        })
    })
})
.or('author', 'packagr.author')

const vResult = schema.validate(packageJson, { allowUnknown: true, abortEarly: false })
if (vResult.error) {
  let errorMsg = ''
  for (const err of vResult.error.details) {
    errorMsg += `\n  - property ${err.message}`
  }
  log.err('Invalid package.json config:' + errorMsg)
  
}
