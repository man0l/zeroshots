/**
 * Maps raw labels from on-device classifiers (Apple Vision, ML Kit) to app tag set.
 * Single source of truth for tag names; must match edge function VALID_TAGS.
 */

export const VALID_TAGS = [
  'receipt',
  'chat',
  'meme',
  'error',
  'article',
  'photo',
  'document',
  'code',
  'map',
  'ticket',
  'email',
  'social',
  'shopping',
  'finance',
  'notes',
  'game',
  'recipe',
  'calendar',
  'settings',
  'ui',
  'screenshot', // default fallback when nothing else matches
] as const

export type ValidTag = (typeof VALID_TAGS)[number]

// Keywords from Vision / ML Kit raw labels → our tag. Order matters (first match wins).
const LABEL_TO_TAG: Array<{ keywords: string[]; tag: ValidTag }> = [
  { keywords: ['receipt', 'invoice', 'bill', 'payment', 'purchase', 'confirmation'], tag: 'receipt' },
  { keywords: ['chat', 'message', 'conversation', 'text', 'messaging', 'sms', 'whatsapp'], tag: 'chat' },
  { keywords: ['email', 'mail', 'inbox', 'newsletter', 'gmail', 'outlook'], tag: 'email' },
  { keywords: ['social', 'post', 'feed', 'tweet', 'profile', 'comments', 'instagram'], tag: 'social' },
  { keywords: ['meme', 'funny', 'humor', 'comic', 'viral'], tag: 'meme' },
  { keywords: ['shopping', 'product', 'store', 'wishlist', 'item', 'price'], tag: 'shopping' },
  { keywords: ['finance', 'bank', 'balance', 'crypto', 'portfolio', 'stock'], tag: 'finance' },
  { keywords: ['notes', 'note', 'list', 'reminder', 'todo', 'checklist', 'notion'], tag: 'notes' },
  { keywords: ['recipe', 'food', 'cooking', 'ingredients', 'menu'], tag: 'recipe' },
  { keywords: ['calendar', 'schedule', 'meeting', 'agenda', 'date'], tag: 'calendar' },
  { keywords: ['game', 'gameplay', 'score', 'achievement', 'gaming'], tag: 'game' },
  { keywords: ['settings', 'wifi', 'password', 'system', 'preferences'], tag: 'settings' },
  { keywords: ['error', 'warning', 'bug', 'crash', 'alert', 'failure'], tag: 'error' },
  { keywords: ['article', 'news', 'blog', 'reading', 'web page'], tag: 'article' },
  { keywords: ['photo', 'selfie', 'camera', 'person', 'portrait', 'outdoor', 'gallery', 'album'], tag: 'photo' },
  { keywords: ['document', 'form', 'pdf', 'paper', 'documentation', 'contract', 'letter'], tag: 'document' },
  { keywords: ['code', 'programming', 'software', 'terminal', 'developer', 'script'], tag: 'code' },
  { keywords: ['map', 'location', 'direction', 'navigation', 'route', 'street'], tag: 'map' },
  { keywords: ['ticket', 'boarding', 'pass', 'event', 'travel', 'flight'], tag: 'ticket' },
  { keywords: ['ui', 'interface', 'app', 'display', 'screen', 'app design'], tag: 'ui' },
]

function filenameHints(filename: string): ValidTag[] {
  const tags: ValidTag[] = []
  const lower = filename.toLowerCase()
  for (const { keywords, tag } of LABEL_TO_TAG) {
    if (keywords.some(kw => lower.includes(kw))) tags.push(tag)
  }
  return tags
}

/**
 * Map raw classifier labels (and optional filename) to app tags.
 * Used by iOS Vision and Android ML Kit integration.
 */
export function mapOnDeviceLabelsToTags(
  rawLabels: string[],
  filename?: string
): string[] {
  const seen = new Set<string>()
  const add = (tag: string) => {
    if (VALID_TAGS.includes(tag as ValidTag) && !seen.has(tag)) {
      seen.add(tag)
      return true
    }
    return false
  }

  const normalized = rawLabels.map(l => l.toLowerCase().trim()).filter(Boolean)
  for (const raw of normalized) {
    for (const { keywords, tag } of LABEL_TO_TAG) {
      if (keywords.some(kw => raw.includes(kw) || raw === kw)) {
        add(tag)
        break
      }
    }
  }

  if (filename) {
    for (const tag of filenameHints(filename)) {
      add(tag)
    }
  }

  if (seen.size === 0) {
    return ['screenshot']
  }
  return Array.from(seen)
}
