const JoiBase = require('joi')
const path = require('path')
const fs = require('fs')

module.exports.prepare = () => {
  return JoiBase.extend((Joi) => {
    return {
      type: 'string',
      base: Joi.string(),
      messages: {
        'string.endsWith': '{{#label}} must end with any of {{#endings}}',
      },
      rules: {
        endsWith: {
          method(...endings) {
            return this.$_addRule({ name: 'endsWith', args: { endings } })
          },
          args: [
            { name: 'endings', assert: Joi.array() },
          ],
          validate(value, helpers, args, options) {
            for (ending of args.endings) {
              if (value.endsWith(ending)) return value
            }
            return helpers.error('string.endsWith', { endings: args.endings })
          },
        },
      },
    }
  }).extend((Joi) => {
    return {
      type: 'path',
      base: Joi.string(),
      messages: {
        'path.existingFile': '{{#label}} path must be an existing file',
        'path.existingDir': '{{#label}} path must be an existing directory',
      },
      validate(value, helpers) {
        return { value: path.resolve(workingDir, value) }
      },
      rules: {
        existingFile: {
          method() { return this.$_addRule('existingFile') },
          validate(value, helpers, args, options) {
            if (!fs.existsSync(value)) return helpers.error('path.existingFile')
            if (!fs.statSync(value).isFile()) return helpers.error('path.existingFile')
            return value
          },
        },
        existingDir: {
          method() { return this.$_addRule('existingDir') },
          validate(value, helpers, args, options) {
            if (!fs.existsSync(value)) return helpers.error('path.existingDir')
            if (!fs.statSync(value).isDirectory()) return helpers.error('path.existingDir')
            return value
          },
        },
      },
    }
  })
}
