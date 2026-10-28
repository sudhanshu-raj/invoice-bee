import React, { useState } from "react";

type Block =
  | { type: "heading"; level: number; content: string }
  | { type: "code"; language: string; content: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; content: string[] }
  | { type: "hr" }
  | { type: "paragraph"; content: string };

const renderInline = (text: string): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\[[^\]]+\]\([^\s)]+\)|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${match.index}-${token}`;
    if (token.startsWith("`") && token.endsWith("`")) {
      elements.push(
        <code
          key={key}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-800 border border-slate-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[") && token.includes("](")) {
      const closingBracket = token.indexOf("]");
      const linkText = token.slice(1, closingBracket);
      const linkHref = token.slice(closingBracket + 2, -1);
      elements.push(
        <a
          key={key}
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
        >
          {linkText}
        </a>
      );
    } else if (token.startsWith("***") && token.endsWith("***")) {
      elements.push(
        <strong key={key} className="font-semibold italic text-slate-900">
          {token.slice(3, -3)}
        </strong>
      );
    } else if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      elements.push(
        <strong key={key} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      elements.push(
        <em key={key} className="italic text-slate-800">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      elements.push(token);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }
  return elements;
};

const parseMarkdown = (raw: string): Block[] => {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.trim().startsWith("```")) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        i++;
      }
      blocks.push({
        type: "code",
        language,
        content: codeLines.join("\n"),
      });
      continue;
    }

    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({
        type: "quote",
        content: quoteLines,
      });
      continue;
    }

    if (line.trim().startsWith("|") && line.trim().endsWith("|") && line.includes("|")) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        lines[i].trim().endsWith("|") &&
        lines[i].includes("|")
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) =>
          rowStr
            .slice(1, -1)
            .split("|")
            .map((cell) => cell.trim());

        const isDivider = (rowStr: string) =>
          parseRow(rowStr).every((cell) => /^:?-+:?$/.test(cell));

        if (isDivider(tableLines[1])) {
          const headers = parseRow(tableLines[0]);
          const rows = tableLines.slice(2).map(parseRow);
          blocks.push({ type: "table", headers, rows });
          continue;
        }
      }
      for (const tLine of tableLines) {
        blocks.push({ type: "paragraph", content: tLine });
      }
      continue;
    }

    const isUlItem = (str: string) => /^[-*+]\s+(.*)$/.test(str.trim());
    const isOlItem = (str: string) => /^\d+\.\s+(.*)$/.test(str.trim());

    if (isUlItem(line)) {
      const items: string[] = [];
      while (i < lines.length && isUlItem(lines[i])) {
        const match = lines[i].trim().match(/^[-*+]\s+(.*)$/);
        if (match) {
          items.push(match[1]);
        }
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (isOlItem(line)) {
      const items: string[] = [];
      while (i < lines.length && isOlItem(lines[i])) {
        const match = lines[i].trim().match(/^\d+\.\s+(.*)$/);
        if (match) {
          items.push(match[1]);
        }
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith(">") &&
      !(lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) &&
      !isUlItem(lines[i]) &&
      !isOlItem(lines[i]) &&
      !/^(\*{3,}|-{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({
      type: "paragraph",
      content: paraLines.join(" "),
    });
  }

  return blocks;
};

const CodeBlock: React.FC<{ language: string; content: string }> = ({ language, content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] font-mono text-slate-400">
        <span>{language || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded px-2 py-0.5 text-[10px] text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed font-mono">
        <code>{content}</code>
      </pre>
    </div>
  );
};

const TableBlock: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => {
  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-slate-200 shadow-2xs">
      <table className="min-w-full divide-y divide-slate-200 text-xs">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-3.5 py-2.5 text-left font-semibold text-slate-700"
              >
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, ri) => (
            <tr key={ri} className="transition-colors hover:bg-slate-50/60">
              {headers.map((_, ci) => (
                <td key={ci} className="px-3.5 py-2 text-slate-600 align-top">
                  {renderInline(row[ci] || "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const HeadingBlock: React.FC<{ level: number; content: string }> = ({ level, content }) => {
  if (level === 1) {
    return (
      <h1 className="mt-4 mb-2 text-base font-bold text-slate-900 first:mt-0">
        {renderInline(content)}
      </h1>
    );
  }
  if (level === 2) {
    return (
      <h2 className="mt-3.5 mb-1.5 text-sm font-bold text-slate-900 first:mt-0">
        {renderInline(content)}
      </h2>
    );
  }
  if (level === 3) {
    return (
      <h3 className="mt-3 mb-1 text-xs font-bold uppercase tracking-wider text-slate-800 first:mt-0">
        {renderInline(content)}
      </h3>
    );
  }
  return (
    <h4 className="mt-2.5 mb-1 text-xs font-semibold text-slate-800 first:mt-0">
      {renderInline(content)}
    </h4>
  );
};

const UlBlock: React.FC<{ items: string[] }> = ({ items }) => {
  return (
    <ul className="my-2 space-y-1.5 pl-5 text-slate-700 list-disc">
      {items.map((item, idx) => (
        <li key={idx} className="leading-relaxed">
          {renderInline(item)}
        </li>
      ))}
    </ul>
  );
};

const OlBlock: React.FC<{ items: string[] }> = ({ items }) => {
  return (
    <ol className="my-2 space-y-1.5 pl-5 text-slate-700 list-decimal">
      {items.map((item, idx) => (
        <li key={idx} className="leading-relaxed">
          {renderInline(item)}
        </li>
      ))}
    </ol>
  );
};

const QuoteBlock: React.FC<{ content: string[] }> = ({ content }) => {
  return (
    <blockquote className="my-2.5 border-l-4 border-emerald-500 bg-slate-50/80 px-3.5 py-2 text-slate-600 rounded-r">
      {content.map((line, idx) => (
        <p key={idx} className="leading-relaxed">
          {renderInline(line)}
        </p>
      ))}
    </blockquote>
  );
};

const ParagraphBlock: React.FC<{ content: string }> = ({ content }) => {
  return (
    <p className="my-1.5 leading-relaxed text-slate-700 first:mt-0 last:mb-0">
      {renderInline(content)}
    </p>
  );
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  const blocks = parseMarkdown(content);

  return (
    <div className={`space-y-1 text-xs sm:text-sm ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return <CodeBlock key={index} language={block.language} content={block.content} />;
        }
        if (block.type === "table") {
          return <TableBlock key={index} headers={block.headers} rows={block.rows} />;
        }
        if (block.type === "heading") {
          return <HeadingBlock key={index} level={block.level} content={block.content} />;
        }
        if (block.type === "ul") {
          return <UlBlock key={index} items={block.items} />;
        }
        if (block.type === "ol") {
          return <OlBlock key={index} items={block.items} />;
        }
        if (block.type === "quote") {
          return <QuoteBlock key={index} content={block.content} />;
        }
        if (block.type === "hr") {
          return <hr key={index} className="my-3 border-slate-200" />;
        }
        return <ParagraphBlock key={index} content={block.content} />;
      })}
    </div>
  );
};

export default MarkdownRenderer;
