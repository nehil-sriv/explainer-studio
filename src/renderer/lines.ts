/**
 * Line-reveal application — hides stepped lines past the revealed count
 * (legacy renderCanvas sets visibility per .tline/.cline node; here the
 * same effect is applied to the markup string so preview/popout/export
 * share one code path with no DOM).
 */
export function applyLineReveal(html: string, revealed: number): string {
  if (revealed < 0) revealed = 0;
  let seen = 0;
  return html.replace(
    /<(div|li)([^>]*class="(tline|cline)\b[^"]*")([^>]*)>/g,
    (tag, el, cls, rest) => {
      const i = seen++;
      if (i < revealed) return tag;
      if (/style="/.test(tag)) {
        return tag.replace(/style="/, 'style="visibility:hidden;');
      }
      return `<${el}${cls} style="visibility:hidden"${rest}>`;
    },
  );
}
