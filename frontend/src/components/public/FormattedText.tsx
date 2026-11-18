"use client";

import React from "react";

interface FormattedTextProps {
  content?: string | null;
  className?: string;
  defaultParagraphClass?: string;
}

/**
 * Formats user-entered itinerary and package descriptions.
 * - Preserves spacing, newlines, and paragraphs.
 * - Supports bold text (**bold**, __bold__, <b>bold</b>, <strong>bold</strong>).
 * - Supports bullet points (* bullet, - bullet, • bullet).
 * - Converts markdown links [text](url) and plain URLs into safe clickable links.
 */
export function FormattedText({
  content,
  className = "",
  defaultParagraphClass = "leading-relaxed text-[#70757A] font-light",
}: FormattedTextProps) {
  if (!content || !content.trim()) return null;

  // Split into raw lines while preserving empty lines as paragraph dividers
  const rawLines = content.split(/\r?\n/);

  type Block =
    | { type: "paragraph"; lines: string[] }
    | { type: "list"; items: string[] };

  const blocks: Block[] = [];
  let currentPara: string[] = [];
  let currentList: string[] = [];

  const flushPara = () => {
    if (currentPara.length > 0) {
      blocks.push({ type: "paragraph", lines: [...currentPara] });
      currentPara = [];
    }
  };

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({ type: "list", items: [...currentList] });
      currentList = [];
    }
  };

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      // Empty line -> flush pending blocks as separate paragraphs
      flushPara();
      flushList();
      continue;
    }

    const listMatch = rawLine.match(/^\s*([*\-•]|\d+[.)])\s+(.*)$/);
    if (listMatch) {
      flushPara();
      currentList.push(listMatch[2]);
    } else {
      flushList();
      currentPara.push(rawLine);
    }
  }
  flushPara();
  flushList();

  return (
    <div className={`space-y-3.5 ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === "list") {
          return (
            <ul key={idx} className="space-y-1.5 pl-5 list-disc marker:text-[#C5A880]">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className={`${defaultParagraphClass} pl-1`}>
                  {renderInlineFormatting(item)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={idx} className={`${defaultParagraphClass} whitespace-pre-line`}>
            {block.lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {renderInlineFormatting(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  // Regex tokenizes markdown bold, HTML bold, markdown links, or raw URLs
  const tokenRegex = /(\*\*.*?\*\*|__.*?__|<b>.*?<\/b>|<strong>.*?<\/strong>|\[.*?\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s]+)/g;

  const parts = text.split(tokenRegex);
  return parts.map((part, i) => {
    if (!part) return null;

    // Bold Markdown: **text** or __text__
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} className="font-semibold text-[#202124]">
          {inner}
        </strong>
      );
    }

    // Bold HTML: <b>text</b>
    if (part.startsWith("<b>") && part.endsWith("</b>")) {
      const inner = part.slice(3, -4);
      return (
        <strong key={i} className="font-semibold text-[#202124]">
          {inner}
        </strong>
      );
    }

    // Bold HTML: <strong>text</strong>
    if (part.startsWith("<strong>") && part.endsWith("</strong>")) {
      const inner = part.slice(8, -9);
      return (
        <strong key={i} className="font-semibold text-[#202124]">
          {inner}
        </strong>
      );
    }

    // Markdown link: [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C5A880] hover:underline font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // Raw URL: https://...
    if (part.startsWith("http://") || part.startsWith("https://")) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C5A880] hover:underline font-medium break-all"
        >
          {part}
        </a>
      );
    }

    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
