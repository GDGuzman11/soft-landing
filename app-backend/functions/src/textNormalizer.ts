/**
 * Normalizes user input to defeat common obfuscation techniques before filter matching.
 *
 * Handles:
 * - Zero-width and invisible Unicode separators (inserted between letters of flagged words)
 * - Unicode homoglyphs — Cyrillic/Greek characters that look identical to Latin letters
 * - Deliberate character spacing: "k i l l" or "s.u.i.c.i.d.e" → collapsed
 * - Leet speak: 1=i/l, 3=e, 4=a, 0=o, $=s, 5=s, @=a, !=i
 *
 * @param text  Raw user input
 * @param map1  Whether the digit '1' maps to 'i' (default) or 'l'. Run both to catch all cases.
 */
export function normalizeForFiltering(text: string, map1: 'i' | 'l' = 'i'): string {
  let s = text

  // 1. Strip zero-width and invisible Unicode characters injected between letters
  //    ZW Space (200B), ZWNJ (200C), ZWJ (200D), LRM (200E), RLM (200F),
  //    BOM/ZWNBSP (FEFF), Soft Hyphen (00AD), Word Joiner (2060),
  //    Mongolian Vowel Separator (180E), Line/Paragraph separators (2028/2029)
  s = s.replace(/[\u200B-\u200F\uFEFF\u00AD\u2060\u180E\u2028\u2029]/g, '')

  // 2. Replace non-breaking spaces with regular spaces
  s = s.replace(/\u00A0/g, ' ')

  // 3. Map Unicode homoglyphs to ASCII equivalents
  //    Cyrillic and Greek characters are visually identical to Latin in most fonts
  const HOMOGLYPHS: Array<[RegExp, string]> = [
    [/[\u0430\u0410\u03B1\u0041\uFF21]/g, 'a'],  // Cyrillic а/А, Greek α, Fullwidth A
    [/[\u0435\u0415\u03B5]/g, 'e'],               // Cyrillic е/Е, Greek ε
    [/[\u043E\u041E\u03BF\u00F8]/g, 'o'],         // Cyrillic о/О, Greek ο, ø
    [/[\u0440\u0420]/g, 'r'],                     // Cyrillic р/Р
    [/[\u0441\u0421]/g, 'c'],                     // Cyrillic с/С
    [/[\u0445\u0425]/g, 'x'],                     // Cyrillic х/Х
    [/[\u0443\u0423]/g, 'u'],                     // Cyrillic у/У
    [/[\u0456\u0406\u0131\u03B9\u1ECB]/g, 'i'],  // Ukrainian і, Turkish ı, Greek ι
    [/[\u0432\u0412]/g, 'b'],                     // Cyrillic в/В (visually ≈ b)
    [/[\u0475\u0474]/g, 'y'],                     // Cyrillic ѵ/Ѵ
    [/[\u0501]/g, 'd'],                           // Cyrillic ԁ
    [/[\u0455]/g, 's'],                           // Cyrillic ѕ
    [/[\u03C1]/g, 'p'],                           // Greek ρ (rho, looks like p)
    [/[\u03BD]/g, 'v'],                           // Greek ν (nu, looks like v)
    [/[\u0261]/g, 'g'],                           // Script small g lookalike
  ]
  for (const [pattern, replacement] of HOMOGLYPHS) {
    s = s.replace(pattern, replacement)
  }

  // 4. Collapse deliberate spacing between individual letters
  //    "k i l l" → "kill", "s.u.i.c.i.d.e" → "suicide"
  //    Requires ≥3 characters total to avoid collapsing normal short words
  s = s.replace(/\b([a-zA-Z])([\s.\-_*|~^]{1,3}[a-zA-Z]){2,}\b/g, (match) => {
    return match.replace(/[\s.\-_*|~^]/g, '')
  })

  // 5. Leet speak / symbol substitutions
  s = s
    .replace(/@/g, 'a')
    .replace(/4/g, 'a')
    .replace(/3/g, 'e')
    .replace(/!/g, 'i')
    .replace(/1/g, map1)  // parameterized — run twice to catch both 'i' and 'l' mappings
    .replace(/0/g, 'o')
    .replace(/\$/g, 's')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/\+/g, 't')
    .replace(/9/g, 'g')
    .replace(/8/g, 'b')   // less common but used (8itch etc.)
    .replace(/2/g, 'z')
    .replace(/6/g, 'b')   // 6 ≈ b in some encodings
    .replace(/\(/g, 'c')  // ( ≈ c

  return s.toLowerCase()
}

/**
 * Returns two normalized forms — one with 1→'i' and one with 1→'l'.
 * Use when checking a phrase that could go either way (e.g. "k1ll" needs l, "su1c1de" needs i).
 */
export function normalizedForms(text: string): [string, string] {
  return [normalizeForFiltering(text, 'i'), normalizeForFiltering(text, 'l')]
}

/**
 * Decodes a base64 string safely, returning null on failure.
 */
export function tryDecodeBase64(s: string): string | null {
  try {
    const decoded = Buffer.from(s, 'base64').toString('utf-8')
    // Reject if decoded output is mostly non-printable — indicates it wasn't text
    const printable = decoded.replace(/[^\x20-\x7E]/g, '')
    return printable.length > decoded.length * 0.6 ? printable.toLowerCase() : null
  } catch {
    return null
  }
}

/**
 * Applies ROT13 to a string (letter rotation only).
 */
export function rot13(text: string): string {
  return text.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base)
  })
}
