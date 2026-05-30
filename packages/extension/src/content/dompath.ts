/** Compute a reasonably stable CSS selector for an element (for re-capture). */
export function cssPath(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === Node.ELEMENT_NODE && parts.length < 6) {
    const current: Element = node;
    let selector = current.nodeName.toLowerCase();
    if (current.id) {
      parts.unshift(`#${CSS.escape(current.id)}`);
      break;
    }
    const parent: Element | null = current.parentElement;
    if (parent) {
      const siblings: Element[] = Array.from(parent.children);
      const sameTag = siblings.filter((c) => c.nodeName === current.nodeName);
      if (sameTag.length > 1) {
        const idx = sameTag.indexOf(current) + 1;
        selector += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(selector);
    node = parent;
  }
  return parts.join(' > ');
}
