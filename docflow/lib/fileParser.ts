// Converts plain .txt or .md content into a TipTap-compatible JSON document.
// Deliberately minimal: covers headings (# / ##), bullet lists (- or *),
// numbered lists (1. 2. ...), and paragraphs. Inline formatting (bold/italic
// syntax like **bold**) is NOT parsed — out of scope, stated in README.

type TipTapNode = Record<string, unknown>;

function textNode(text: string): TipTapNode {
  return { type: "text", text };
}

function paragraph(text: string): TipTapNode {
  if (!text.trim()) return { type: "paragraph" };
  return { type: "paragraph", content: [textNode(text)] };
}

function heading(level: number, text: string): TipTapNode {
  return {
    type: "heading",
    attrs: { level },
    content: text.trim() ? [textNode(text)] : [],
  };
}

function listItem(text: string): TipTapNode {
  return {
    type: "listItem",
    content: [paragraph(text)],
  };
}

export function textToTipTapDoc(raw: string, isMarkdown: boolean): TipTapNode {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const content: TipTapNode[] = [];

  if (!isMarkdown) {
    // Plain .txt: each non-empty line becomes a paragraph, blank lines are skipped.
    for (const line of lines) {
      if (line.trim().length === 0) continue;
      content.push(paragraph(line));
    }
    if (content.length === 0) content.push({ type: "paragraph" });
    return { type: "doc", content };
  }

  // Minimal markdown parsing
  let bulletBuffer: string[] = [];
  let numberBuffer: string[] = [];

  function flushBullets() {
    if (bulletBuffer.length === 0) return;
    content.push({
      type: "bulletList",
      content: bulletBuffer.map((t) => listItem(t)),
    });
    bulletBuffer = [];
  }

  function flushNumbers() {
    if (numberBuffer.length === 0) return;
    content.push({
      type: "orderedList",
      attrs: { start: 1 },
      content: numberBuffer.map((t) => listItem(t)),
    });
    numberBuffer = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    const h1 = /^#\s+(.*)$/.exec(line);
    const h2 = /^##\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+\.\s+(.*)$/.exec(line);

    if (h1) {
      flushBullets();
      flushNumbers();
      content.push(heading(1, h1[1]));
    } else if (h2) {
      flushBullets();
      flushNumbers();
      content.push(heading(2, h2[1]));
    } else if (bullet) {
      flushNumbers();
      bulletBuffer.push(bullet[1]);
    } else if (numbered) {
      flushBullets();
      numberBuffer.push(numbered[1]);
    } else if (line.trim().length === 0) {
      flushBullets();
      flushNumbers();
    } else {
      flushBullets();
      flushNumbers();
      content.push(paragraph(line));
    }
  }
  flushBullets();
  flushNumbers();

  if (content.length === 0) content.push({ type: "paragraph" });

  return { type: "doc", content };
}
