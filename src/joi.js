const Joi = require('joi')
const path = require('path')
const fs = require('fs')

module.exports = Joi.extend((joi) => {
  return {
    type: 'path',
    base: joi.string(),
    messages: {
      'path.existingFile': '{{#label}} path must be an existing file',
      'path.existingDir': '{{#label}} path must be an existing directory',
    },
    validate(value, helpers) {
      return { value: path.resolve(value) }
    },
    rules: {
      existingFile: {
        method() { return this.$_addRule('existingFile') },
        validate(value, helpers, args, options) {
          if (!fs.existsSync(value)) return helpers.error('path.existingFile')
          if (!fs.lstatSync(value).isFile()) return helpers.error('path.existingFile')
          return value
        },
      },
      existingDir: {
        method() { return this.$_addRule('existingDir') },
        validate(value, helpers, args, options) {
          if (!fs.existsSync(value)) return helpers.error('path.existingDir')
          if (!fs.lstatSync(value).isDirectory()) return helpers.error('path.existingDir')
          return value
        },
      },
    },
  }
})
