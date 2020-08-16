module.exports = function(...msg) {
  console.log(...msg)
}

module.exports.err = function (...msg) {
  console.log('Error:', ...msg)
  console.log('')
  process.exit(1)
}
