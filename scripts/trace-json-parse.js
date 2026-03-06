// Preload this script with NODE_OPTIONS="--require ./scripts/trace-json-parse.js"
// It wraps JSON.parse to log the input and stack when parsing fails.
const origParse = JSON.parse
JSON.parse = function (text, reviver) {
  try {
    return origParse.call(this, text, reviver)
  } catch (err) {
    try {
      const snippet = String(text).slice(0, 1000)
      console.error('\n=== JSON.parse failure detected ===')
      console.error('Input length:', text && text.length)
      console.error('Snippet (first 1000 chars):')
      console.error(snippet)
      console.error('Stack at parse call:')
      console.error(new Error().stack)
      console.error('===================================\n')
    } catch (e) {
      // ignore logging errors
    }
    throw err
  }
}
