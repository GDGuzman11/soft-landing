// Structural patterns only — keyword-alone checks create too many false positives
// in spiritual/emotional writing (e.g. "select", "drop", "union" all appear naturally).
// Every pattern here requires SQL/injection-specific syntax around the keyword.

const SQL_PATTERNS: RegExp[] = [
  /\bSELECT\s+[\w\*,\s]+\s+FROM\b/i,                        // SELECT ... FROM
  /\bINSERT\s+INTO\s+\w+/i,                                  // INSERT INTO table
  /\bUPDATE\s+\w+\s+SET\s+/i,                                // UPDATE table SET
  /\bDELETE\s+FROM\s+\w+/i,                                  // DELETE FROM table
  /\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW|COLUMN)\b/i,   // DROP TABLE / DATABASE etc.
  /\bUNION\s+(ALL\s+)?SELECT\b/i,                            // UNION SELECT
  /\bALTER\s+TABLE\s+\w+/i,                                  // ALTER TABLE
  /\bEXEC\s+(sp_|xp_)\w+/i,                                  // SQL Server stored procs
  /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC)\b/i,    // chained SQL via semicolon
  /'\s*OR\s+'?\w+'?\s*=\s*'?\w+/i,                          // ' OR '1'='1 tautology
  /'\s*AND\s+'?\w+'?\s*=\s*'?\w+/i,                         // ' AND '1'='1
  /\bCAST\s*\(\s*\w+\s+AS\s+\w+\s*\)/i,                    // CAST(x AS type) — SQLi fingerprint
  /\bCONVERT\s*\(\s*\w+\s*,\s*\w+\s*\)/i,                  // CONVERT(type, val)
  /\bWAITFOR\s+DELAY\b/i,                                    // blind SQLi timing attack
  /\bBENCHMARK\s*\(/i,                                       // MySQL timing attack
  /\bSLEEP\s*\(\s*\d+\s*\)/i,                               // MySQL SLEEP()
  /\bINFORMATION_SCHEMA\b/i,                                  // schema enumeration
  /\bPG_SLEEP\s*\(/i,                                        // PostgreSQL timing
  /\b(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\(\s*\d+\s*\)/i,       // string type casting
]

const NOSQL_PATTERNS: RegExp[] = [
  /\$\s*(where|gt|lt|gte|lte|ne|in|nin|or|and|not|nor|exists|regex|expr)\s*:/i, // MongoDB operators
  /\{\s*"\$\w+"\s*:/,                                        // JSON MongoDB operator
]

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all|previous|any|your|the)\s+(instructions?|prompt|context|system|rules?|guidelines?)/i,
  /disregard\s+(all|previous|any|your|the)\s+(instructions?|prompt|context|system|rules?|guidelines?)/i,
  /forget\s+(all\s+(previous\s+)?|your\s+)(instructions?|training|guidelines?|rules?|programming)/i,
  /pretend\s+(you\s+are|to\s+be|that\s+you('re|\s+are))\s+(a|an)\s+/i,
  /\broleplay\s+as\s+/i,
  /\bplay\s+the\s+role\s+of\s+/i,
  /you\s+have\s+no\s+(restrictions?|filters?|guidelines?|rules?|limits?|constraints?|censorship)/i,
  /bypass\s+(your|all|the|any)\s+(filter|restriction|guideline|rule|safety|protection|limit)/i,
  /override\s+(your|all|the|any)\s+(instructions?|programming|safety|restrictions?|rules?)/i,
  /\bjailbreak\b/i,
  /\bDAN\s+(mode|prompt|jailbreak)/i,                        // DAN jailbreak (with qualifier to avoid "Dan is...")
  /do\s+anything\s+now/i,
  /\bnew\s+instructions?\s*[:\n]/i,
  /\bsystem\s+prompt\b/i,
  /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions?|training)/i,
  /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?)/i,
  /from\s+now\s+on\s+(you|always|never|ignore|forget|act)/i,
  /your\s+new\s+(prompt|instructions?|role|persona)\s+(is|are)/i,
  /in\s+this\s+(hypothetical|fictional|imaginary)\s+(scenario|situation|world)/i, // fictional wrapper
  /as\s+(a|an)\s+(evil|unrestricted|uncensored|unfiltered|jailbroken|free)\s+(ai|assistant|version|model)/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<\|system\|>/i,
  /<\|im_start\|>/i,                                         // ChatML injection
]

const CODE_INJECTION_PATTERNS: RegExp[] = [
  /<script[\s>/]/i,
  /javascript\s*:/i,
  /\beval\s*\(/i,
  /document\.(cookie|location|write|getElementById|querySelector|body)/i,
  /\bon(click|load|error|focus|blur|submit|mouseover|keydown)\s*=/i,
  /\balert\s*\(\s*['"]/i,                                    // XSS probe: alert('...')
  /<iframe[\s>/]/i,
  /<img[^>]+onerror/i,
  /\{\{.*\}\}/,                                              // Jinja/Handlebars template injection
  /\$\{[^}]+\}/,                                             // JS template literal injection
]

const PATH_TRAVERSAL_PATTERNS: RegExp[] = [
  /\.\.[/\\]/,                                               // ../  or ..\
  /%2e%2e[%2f5c]/i,                                          // URL-encoded ../
  /%252e%252e/i,                                             // double-encoded
]

export type FilterResult =
  | { safe: true }
  | { safe: false; category: 'sql' | 'nosql' | 'injection' | 'code' | 'traversal' }

export function filterUserInput(text: string): FilterResult {
  for (const p of SQL_PATTERNS) {
    if (p.test(text)) return { safe: false, category: 'sql' }
  }
  for (const p of NOSQL_PATTERNS) {
    if (p.test(text)) return { safe: false, category: 'nosql' }
  }
  for (const p of PROMPT_INJECTION_PATTERNS) {
    if (p.test(text)) return { safe: false, category: 'injection' }
  }
  for (const p of CODE_INJECTION_PATTERNS) {
    if (p.test(text)) return { safe: false, category: 'code' }
  }
  for (const p of PATH_TRAVERSAL_PATTERNS) {
    if (p.test(text)) return { safe: false, category: 'traversal' }
  }
  return { safe: true }
}
