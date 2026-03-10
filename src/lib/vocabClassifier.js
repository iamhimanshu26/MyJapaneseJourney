/**
 * Classify vocabulary items: single kanji, verb, or regular vocab
 */
const KANJI_RANGE = /[\u4e00-\u9faf\u3400-\u4dbf]/

/** True if word is a single kanji character */
export function isSingleKanji(word) {
  if (!word || typeof word !== 'string') return false
  const trimmed = word.trim()
  if (trimmed.length !== 1) return false
  return KANJI_RANGE.test(trimmed)
}

/** Verb detection: partOfSpeech or meaning "to X" */
export function isVerb(item) {
  const pos = (item?.partOfSpeech || '').toLowerCase()
  if (pos.includes('verb')) return true
  const meaning = (item?.meaning || '').trim().toLowerCase()
  if (meaning.startsWith('to ') && meaning.length > 4) return true
  return false
}
