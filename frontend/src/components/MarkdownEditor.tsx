"use client";

import { useState, useRef, useCallback } from "react";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Start writing...",
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Insert text at cursor position
  const insertText = useCallback(
    (before: string, after: string = "", placeholder: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      const textToInsert = selectedText || placeholder;

      const newValue =
        value.substring(0, start) +
        before +
        textToInsert +
        after +
        value.substring(end);

      onChange(newValue);

      // Set cursor position after React updates
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + before.length + textToInsert.length;
        textarea.setSelectionRange(
          start + before.length,
          newCursorPos
        );
      }, 0);
    },
    [value, onChange]
  );

  // Insert block element (heading, list, etc.)
  const insertBlock = useCallback(
    (prefix: string, placeholder: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const selectedText = value.substring(
        textarea.selectionStart,
        textarea.selectionEnd
      );

      // Find the start of the current line
      let lineStart = start;
      while (lineStart > 0 && value[lineStart - 1] !== "\n") {
        lineStart--;
      }

      const textToUse = selectedText || placeholder;
      const needsNewlineBefore = lineStart > 0 && value[lineStart - 1] !== "\n";
      const insertPrefix = needsNewlineBefore ? "\n" : "";

      const newValue =
        value.substring(0, lineStart) +
        insertPrefix +
        prefix +
        textToUse +
        value.substring(textarea.selectionEnd);

      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        const newPos = lineStart + insertPrefix.length + prefix.length + textToUse.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    },
    [value, onChange]
  );

  // Toolbar button component
  const ToolbarButton = ({
    onClick,
    title,
    children,
    className = "",
  }: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded hover:bg-zinc-100 transition-colors text-zinc-600 hover:text-zinc-900 ${className}`}
    >
      {children}
    </button>
  );

  // Simple markdown to HTML for preview
  const renderPreview = (md: string) => {
    let html = md
      // Headers
      .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Strikethrough
      .replace(/~~(.+?)~~/g, "<del>$1</del>")
      // Inline code
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Blockquotes
      .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
      // Unordered lists
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
      // Horizontal rule
      .replace(/^---$/gm, "<hr>")
      // Paragraphs (double newlines)
      .replace(/\n\n/g, "</p><p>")
      // Single newlines to <br>
      .replace(/\n/g, "<br>");

    return `<p>${html}</p>`;
  };

  return (
    <div className="border border-zinc-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-zinc-200 bg-zinc-50 px-2 py-1 flex flex-wrap items-center gap-1">
        {/* Headings dropdown */}
        <div className="relative group">
          <ToolbarButton onClick={() => {}} title="Headings">
            <span className="text-sm font-bold">H</span>
          </ToolbarButton>
          <div className="absolute left-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[140px]">
            <button
              type="button"
              onClick={() => insertBlock("# ", "Main Heading")}
              className="w-full px-3 py-2 text-left hover:bg-zinc-50 text-xl font-bold"
            >
              Heading 1
            </button>
            <button
              type="button"
              onClick={() => insertBlock("## ", "Section Heading")}
              className="w-full px-3 py-2 text-left hover:bg-zinc-50 text-lg font-bold"
            >
              Heading 2
            </button>
            <button
              type="button"
              onClick={() => insertBlock("### ", "Sub Heading")}
              className="w-full px-3 py-2 text-left hover:bg-zinc-50 text-base font-bold"
            >
              Heading 3
            </button>
            <button
              type="button"
              onClick={() => insertBlock("#### ", "Small Heading")}
              className="w-full px-3 py-2 text-left hover:bg-zinc-50 text-sm font-bold"
            >
              Heading 4
            </button>
          </div>
        </div>

        <div className="w-px h-6 bg-zinc-300 mx-1" />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => insertText("**", "**", "bold text")}
          title="Bold (Ctrl+B)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => insertText("*", "*", "italic text")}
          title="Italic (Ctrl+I)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0l-4 16m0 0h4" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => insertText("~~", "~~", "strikethrough")}
          title="Strikethrough"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.5 12h-15m11-6.5a4 4 0 11-.535 7.96" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-zinc-300 mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => insertBlock("- ", "List item")}
          title="Bullet List"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => insertBlock("1. ", "List item")}
          title="Numbered List"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-zinc-300 mx-1" />

        {/* Block elements */}
        <ToolbarButton
          onClick={() => insertBlock("> ", "Quote text")}
          title="Blockquote"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => insertText("`", "`", "code")}
          title="Inline Code"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => insertText("[", "](url)", "link text")}
          title="Link"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            const pos = textarea.selectionStart;
            const newValue = value.substring(0, pos) + "\n\n---\n\n" + value.substring(pos);
            onChange(newValue);
          }}
          title="Horizontal Rule"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
          </svg>
        </ToolbarButton>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Preview toggle */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            showPreview
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          {showPreview ? "Edit" : "Preview"}
        </button>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div
          className="prose prose-zinc max-w-none p-4 min-h-[400px] bg-white"
          dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[400px] p-4 text-base leading-relaxed resize-y focus:outline-none font-mono"
          onKeyDown={(e) => {
            // Ctrl+B for bold
            if (e.ctrlKey && e.key === "b") {
              e.preventDefault();
              insertText("**", "**", "bold text");
            }
            // Ctrl+I for italic
            if (e.ctrlKey && e.key === "i") {
              e.preventDefault();
              insertText("*", "*", "italic text");
            }
          }}
        />
      )}

      {/* Help text */}
      <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-500">
        <span className="font-medium">Tip:</span> Use # for headings (# H1, ## H2, ### H3, #### H4), **bold**, *italic*, - for lists
      </div>
    </div>
  );
}
