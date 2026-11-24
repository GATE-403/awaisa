import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'

// Finds text a person reads that skips Lingui: words straight in JSX, and words in the attributes
// people read (aria-label, title, placeholder, alt) given as a plain string. Such text stays English
// on /ru and /ky. `lingui extract` cannot see it, so this check is the only thing that notices.

const READ_ATTRIBUTES = new Set(['aria-label', 'title', 'placeholder', 'alt', 'aria-description'])

// Elements whose text is not a message: code, keyboard keys, brand marks drawn as text.
const RAW_ELEMENTS = new Set(['code', 'kbd', 'pre', 'style', 'script', 'Trans', 'Plural', 'Select'])

// Words that read the same in every language: brands, channels, the site's own name and address.
const NAMES = new Set([
  'awaisa',
  'kg',
  'u',
  'whatsapp',
  'telegram',
  'instagram',
  'tiktok',
  'google',
  'sms',
  'ekassa',
])

// A slug or a code shown as an example of what to type («barber-pro», «OSEN20»): data, not words.
const isExample = (text: string) => /^[a-z0-9-]+$/.test(text) || /^[A-Z0-9]+$/.test(text)

/**
 * Words: two letters in a row of any script, after HTML entities («&nbsp;») are gone. A lone «×»,
 * «·», digits, a currency sign, a brand or an example of what to type are not.
 */
const hasWords = (raw: string) => {
  const text = raw.replace(/&[a-z]+;/gi, ' ').trim()
  const words = text.match(/\p{L}{2,}/gu)
  if (!words || isExample(text)) return false
  return words.some((word) => !NAMES.has(word.toLowerCase()))
}

type Finding = { file: string; line: number; text: string }

const insideMessage = (node: ts.Node, sf: ts.SourceFile): boolean => {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isJsxElement(parent) && RAW_ELEMENTS.has(parent.openingElement.tagName.getText(sf))) {
      return true
    }
  }
  return false
}

const findInFile = (file: string, root: string): Finding[] => {
  const source = readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found: Finding[] = []
  const add = (node: ts.Node, text: string) =>
    found.push({
      file: relative(root, file),
      line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      text: text.trim().slice(0, 80),
    })

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && hasWords(node.text) && !insideMessage(node, sf)) add(node, node.text)
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      ts.isStringLiteral(node.expression) &&
      ts.isJsxElement(node.parent) &&
      hasWords(node.expression.text) &&
      !insideMessage(node, sf)
    ) {
      add(node, node.expression.text)
    }
    // An English-only plural helper («3 visits») would come back: on a page it is Lingui's `plural`.
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ['pluralize', 'pluralWord'].includes(node.expression.text)
    ) {
      add(node, `${node.expression.text}(…) is English only, use plural`)
    }
    if (ts.isJsxAttribute(node) && READ_ATTRIBUTES.has(node.name.getText(sf))) {
      const value = node.initializer
      const literal =
        value && ts.isStringLiteral(value)
          ? value
          : value &&
              ts.isJsxExpression(value) &&
              value.expression &&
              ts.isStringLiteral(value.expression)
            ? value.expression
            : undefined
      if (literal && hasWords(literal.text)) add(node, `${node.name.getText(sf)}="${literal.text}"`)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

const listFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'tests' ? [] : listFiles(path)
    return entry.name.endsWith('.tsx') ? [path] : []
  })

/** Every unmarked text in the `.tsx` files under `root`, except the files `skip` names. */
const findUnmarkedText = (root: string, skip: (file: string) => boolean): Finding[] =>
  listFiles(root)
    .filter((file) => !skip(relative(root, file)))
    .flatMap((file) => findInFile(file, root))

export type { Finding }
export { findUnmarkedText }
