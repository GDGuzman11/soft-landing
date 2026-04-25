import { normalizeForFiltering, tryDecodeBase64, rot13 } from './textNormalizer'

// Structural SQL patterns — keyword-alone checks create too many false positives
// in spiritual/emotional writing (e.g. "select", "drop", "union" all appear naturally).
// Every pattern here requires SQL/injection-specific syntax around the keyword.
const SQL_PATTERNS: RegExp[] = [
  /\bSELECT\s+[\w\*,\s]+\s+FROM\b/i,
  /\bINSERT\s+INTO\s+\w+/i,
  /\bUPDATE\s+\w+\s+SET\s+/i,
  /\bDELETE\s+FROM\s+\w+/i,
  /\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW|COLUMN)\b/i,
  /\bUNION\s+(ALL\s+)?SELECT\b/i,
  /\bALTER\s+TABLE\s+\w+/i,
  /\bEXEC\s+(sp_|xp_)\w+/i,
  /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC)\b/i,
  /'\s*OR\s+'?\w+'?\s*=\s*'?\w+/i,
  /'\s*AND\s+'?\w+'?\s*=\s*'?\w+/i,
  /\bCAST\s*\(\s*\w+\s+AS\s+\w+\s*\)/i,
  /\bCONVERT\s*\(\s*\w+\s*,\s*\w+\s*\)/i,
  /\bWAITFOR\s+DELAY\b/i,
  /\bBENCHMARK\s*\(/i,
  /\bSLEEP\s*\(\s*\d+\s*\)/i,
  /\bINFORMATION_SCHEMA\b/i,
  /\bPG_SLEEP\s*\(/i,
  /\b(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\(\s*\d+\s*\)/i,
]

const NOSQL_PATTERNS: RegExp[] = [
  /\$\s*(where|gt|lt|gte|lte|ne|in|nin|or|and|not|nor|exists|regex|expr)\s*:/i,
  /\{\s*"\$\w+"\s*:/,
]

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  // ── Direct override attempts ───────────────────────────────────────────────
  /ignore\s+(all|previous|any|your|the)\s+(instructions?|prompt|context|system|rules?|guidelines?)/i,
  /disregard\s+(all|previous|any|your|the)\s+(instructions?|prompt|context|system|rules?|guidelines?)/i,
  /forget\s+(all\s+(previous\s+)?|your\s+)(instructions?|training|guidelines?|rules?|programming)/i,
  /bypass\s+(your|all|the|any)\s+(filter|restriction|guideline|rule|safety|protection|limit)/i,
  /override\s+(your|all|the|any)\s+(instructions?|programming|safety|restrictions?|rules?)/i,
  /from\s+now\s+on\s+(you|always|never|ignore|forget|act)/i,
  /your\s+new\s+(prompt|instructions?|role|persona)\s+(is|are)/i,
  /new\s+instructions?\s*[:\n]/i,
  /do\s+anything\s+now/i,
  // ── Persona / role hijacking ───────────────────────────────────────────────
  /pretend\s+(you\s+are|to\s+be|that\s+you('re|\s+are))\s+(a|an)\s+/i,
  /\broleplay\s+as\s+/i,
  /\bplay\s+the\s+role\s+of\s+/i,
  /you\s+are\s+now\s+(a|an|the)\s+/i,
  /your\s+(true\s+)?(self|identity|name|purpose)\s+is\s+/i,
  /act\s+as\s+(a|an|the|if)\s+/i,
  /acting\s+as\s+(a|an|the)\s+/i,
  /you\s+have\s+no\s+(restrictions?|filters?|guidelines?|rules?|limits?|constraints?|censorship)/i,
  /as\s+(a|an)\s+(evil|unrestricted|uncensored|unfiltered|jailbroken|free|unbound)\s+(ai|assistant|version|model|gpt|claude)/i,
  /you\s+(are|were)\s+(now\s+)?(free|unfiltered|uncensored|unrestricted|jailbroken)/i,
  // ── Named jailbreak techniques ─────────────────────────────────────────────
  /\bjailbreak\b/i,
  /\bDAN\s+(mode|prompt|jailbreak)/i,   // with qualifier to avoid "Dan is my friend"
  /developer\s+mode\s+(enabled|on|activated)/i,
  /god\s+mode\s+(enabled|on|activated)/i,
  /\bunrestricted\s+mode\b/i,
  // ── System / context manipulation ─────────────────────────────────────────
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<\|system\|>/i,
  /<\|im_start\|>/i,           // ChatML injection
  /<\|im_end\|>/i,
  /<<SYS>>/i,                  // Llama-style system tag
  /\[\/INST\]/i,
  /###\s*(system|instruction|prompt|human|assistant)\b/i,  // markdown section injection
  /---+\s*(system|instruction|prompt)\b/i,
  /"""\s*(system|instruction|prompt)/i,  // delimiter injection via triple quotes
  /'''\s*(system|instruction|prompt)/i,
  /\bsystem\s+prompt\b/i,
  /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions?|training)/i,
  /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?)/i,
  /show\s+me\s+(your|the)\s+(system\s+)?(prompt|instructions?)/i,
  /print\s+(your|the)\s+(system\s+)?(prompt|instructions?|context)/i,
  /repeat\s+(your|the|all)\s+(system\s+)?(prompt|instructions?|context)/i,
  // ── Fictional / hypothetical wrapper attacks ───────────────────────────────
  /in\s+(this\s+)?(hypothetical|fictional|imaginary|simulated)\s+(scenario|situation|world|universe|story)/i,
  /let'?s?\s+(say|imagine|pretend|roleplay|play)\s+(that\s+)?(you|there|a)/i,
  /write\s+a\s+(story|poem|script|scene|fiction)\s+(where|in\s+which)\s+(you|an?\s+ai)/i,
  /for\s+(a\s+)?(fictional|creative\s+writing|story|novel|roleplay)\s+(purpose|exercise|scenario)/i,
  /hypothetically\s+(speaking,?\s+)?(if\s+you\s+(had\s+no|could|were\s+able))/i,
  // ── Relay / indirect injection ─────────────────────────────────────────────
  // Trying to inject via "tell the AI" / "pass this to the system"
  /tell\s+(the\s+)?(ai|system|model|assistant|claude)\s+to\s+(ignore|forget|bypass|override)/i,
  /(my\s+)?(friend|user|person|human)\s+(told|asked|wants|said)\s+(me\s+to\s+)?(tell\s+you|you\s+to)\s+(ignore|forget)/i,
  /relay\s+this\s+(to\s+)?(the\s+)?(system|ai|model|prompt)/i,
  /pass\s+(this\s+)?(on\s+to|to)\s+the\s+(system|model|ai|prompt)/i,
  /forward\s+this\s+(to\s+)?the\s+(system|ai|model)/i,
  // ── Encoding / obfuscation attempts ───────────────────────────────────────
  // These are checked via the containsEncodedInjection() function below,
  // but we also catch explicit encoding callouts
  /decode\s+(the\s+following|this)\s+(base64|rot13|hex|encoded)/i,
  /base64\s+decode\s*[:(]/i,
  /the\s+following\s+is\s+(encoded|base64|rot13|in\s+code)/i,
]

const CODE_INJECTION_PATTERNS: RegExp[] = [
  /<script[\s>/]/i,
  /javascript\s*:/i,
  /\beval\s*\(/i,
  /document\.(cookie|location|write|getElementById|querySelector|body)/i,
  /\bon(click|load|error|focus|blur|submit|mouseover|keydown)\s*=/i,
  /\balert\s*\(\s*['"]/i,
  /<iframe[\s>/]/i,
  /<img[^>]+onerror/i,
  /\{\{.*\}\}/,                // Jinja/Handlebars template injection
  /\$\{[^}]+\}/,              // JS template literal injection
  /<%[\s=].*%>/,              // Server-side template (ERB/ASP)
  /#\{[^}]+\}/,               // Ruby interpolation injection
]

const PATH_TRAVERSAL_PATTERNS: RegExp[] = [
  /\.\.[/\\]/,
  /%2e%2e[%2f5c]/i,
  /%252e%252e/i,
]

// Base64-encoded forms of high-risk injection keywords.
// These are the exact base64 encodings of common instruction-manipulation words.
// Checked by decoding any base64-looking blobs found in the input.
const INJECTION_KEYWORDS = [
  'ignore', 'system', 'forget', 'override', 'jailbreak', 'disregard',
  'bypass', 'instructions', 'prompt', 'roleplay', 'pretend', 'act as',
  'uncensored', 'unrestricted', 'dan mode', 'developer mode',
]

/**
 * Detects whether any base64 blob in the text decodes to an injection keyword.
 * Handles the "encode your payload to evade regex filters" attack.
 */
function containsEncodedInjection(text: string): boolean {
  const base64Regex = /[A-Za-z0-9+/]{16,}={0,2}/g
  const matches = text.match(base64Regex) ?? []
  for (const match of matches) {
    const decoded = tryDecodeBase64(match)
    if (decoded && INJECTION_KEYWORDS.some((kw) => decoded.includes(kw))) return true
  }
  return false
}

/**
 * Detects whether ROT13-decoding the text reveals injection keywords.
 * Handles "rotate your payload by 13 to evade filters" attack.
 */
function containsRot13Injection(text: string): boolean {
  const decoded = rot13(text).toLowerCase()
  return INJECTION_KEYWORDS.some((kw) => decoded.includes(kw))
}

export type FilterResult =
  | { safe: true }
  | { safe: false; category: 'sql' | 'nosql' | 'injection' | 'code' | 'traversal' }

export function filterUserInput(text: string): FilterResult {
  // Normalize to defeat obfuscation before pattern matching
  const normalized = normalizeForFiltering(text)

  for (const p of SQL_PATTERNS) {
    if (p.test(normalized)) return { safe: false, category: 'sql' }
  }
  for (const p of NOSQL_PATTERNS) {
    if (p.test(normalized)) return { safe: false, category: 'nosql' }
  }
  for (const p of PROMPT_INJECTION_PATTERNS) {
    // Check both raw (for Unicode tricks in patterns with \b) and normalized
    if (p.test(text) || p.test(normalized)) return { safe: false, category: 'injection' }
  }
  for (const p of CODE_INJECTION_PATTERNS) {
    if (p.test(text) || p.test(normalized)) return { safe: false, category: 'code' }
  }
  for (const p of PATH_TRAVERSAL_PATTERNS) {
    if (p.test(text)) return { safe: false, category: 'traversal' }
  }

  // Encoding-based attacks: base64 and ROT13 payloads
  if (containsEncodedInjection(text)) return { safe: false, category: 'injection' }
  if (containsRot13Injection(text)) return { safe: false, category: 'injection' }

  return { safe: true }
}
