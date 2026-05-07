const NOISE_KEYWORDS = [
  "Echtzeitueberweisung",
  "Echtzeitüberweisung",
  "Ueberweisung",
  "Überweisung",
  "Lastschrift",
];

// Bank descriptions sometimes glue these prefixes directly to the next word
// (e.g. "LastschriftVISA Schnitzery GmbH"), so the trailing boundary accepts
// an uppercase letter as a CamelCase break in addition to non-letter / EOS.
// We can't use the /i flag because it would also case-fold [A-Z] in the
// lookahead, defeating the CamelCase rule — instead we expand the keyword
// list into Title-/lower-/upper-case variants explicitly.
const NOISE_VARIANTS = NOISE_KEYWORDS.flatMap((k) => [
  k,
  k.toLowerCase(),
  k.toUpperCase(),
]);

const NOISE_RE = new RegExp(
  `(?<![A-Za-zÄÖÜäöüß])(?:${NOISE_VARIANTS.join("|")})(?=[A-ZÄÖÜ]|[^A-Za-zÄÖÜäöüß]|$)`,
  "g",
);

export function cleanImportDescription(s: string): string {
  if (!s) return s;
  return s
    .replace(NOISE_RE, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .trim();
}
