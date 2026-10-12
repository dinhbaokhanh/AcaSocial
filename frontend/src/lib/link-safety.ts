export function externalLinks(text: string, origin: string): string[] {
  const normalized = text
    .replace(/&amp;/gi, "&")
    .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_, hex, dec) =>
      String.fromCodePoint(
        Math.min(0x10ffff, parseInt(hex ?? dec, hex ? 16 : 10)),
      ),
    )
    .replace(/\\([\\()])/g, "$1");
  const candidates =
    normalized.match(/(?:https?:\/\/|www\.|(?<![:/])\/\/)[^\s<>"\[\]]+/gi) ??
    [];
  return [
    ...new Set(
      candidates.flatMap((candidate) => {
        try {
          const value = candidate.replace(/[),.;!?]+$/, "");
          const url = new URL(
            value.startsWith("www.") ? `https://${value}` : value,
            origin,
          );
          return ["http:", "https:"].includes(url.protocol) &&
            url.origin !== origin
            ? [url.href]
            : [];
        } catch {
          return [];
        }
      }),
    ),
  ];
}
