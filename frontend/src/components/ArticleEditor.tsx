"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import TurndownService from "turndown";

/* ── Turndown (HTML → Markdown) ─────────────────────────────────── */
function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
  });

  // Font-size spans → keep as inline HTML so round-trip preserves them
  td.addRule("fontSizeSpan", {
    filter: (node) =>
      node.nodeName === "SPAN" &&
      !!(node as HTMLElement).style.fontSize,
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      return `<span style="font-size:${el.style.fontSize}">${_content}</span>`;
    },
  });

  // Highlighted text
  td.addRule("highlight", {
    filter: "mark",
    replacement: (content) => `==${content}==`,
  });

  // Underline → raw HTML (no markdown equiv)
  td.addRule("underline", {
    filter: "u",
    replacement: (content) => `<u>${content}</u>`,
  });

  return td;
}

/* ── Markdown → HTML (for initial load) ─────────────────────────── */
function markdownToHtml(md: string): string {
  if (!md.trim()) return "";

  let html = md;

  // Fenced code blocks (before other processing)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre><code class="language-${lang}">${escaped.trimEnd()}</code></pre>`;
  });

  // Process line by line for block elements
  const lines = html.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed === "") {
      result.push("");
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      result.push("<hr>");
      i++;
      continue;
    }

    // Headings
    const hMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      result.push(`<h${level}>${processInline(hMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().substring(2));
        i++;
      }
      result.push(
        `<blockquote><p>${processInline(quoteLines.join("<br>"))}</p></blockquote>`
      );
      continue;
    }

    // Unordered list
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ""));
        i++;
      }
      result.push(
        "<ul>" +
          items.map((item) => `<li><p>${processInline(item)}</p></li>`).join("") +
          "</ul>"
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      result.push(
        "<ol>" +
          items.map((item) => `<li><p>${processInline(item)}</p></li>`).join("") +
          "</ol>"
      );
      continue;
    }

    // Regular paragraph — collect consecutive lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith("> ") &&
      !/^[-*•]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("```") &&
      !/^(---|\*\*\*|___)$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      result.push(`<p>${processInline(paraLines.join(" "))}</p>`);
    }
  }

  return result.join("");
}

function processInline(text: string): string {
  return (
    text
      // Inline HTML spans (font-size etc.) — pass through
      .replace(
        /<span style="font-size:([^"]+)">(.*?)<\/span>/g,
        '<span style="font-size:$1">$2</span>'
      )
      // Underline HTML
      .replace(/<u>(.*?)<\/u>/g, "<u>$1</u>")
      // Highlight
      .replace(/==(.+?)==/g, "<mark>$1</mark>")
      // Inline code
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Bold + italic
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      // Bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
      .replace(/_([^_]+)_/g, "<em>$1</em>")
      // Strikethrough
      .replace(/~~(.+?)~~/g, "<s>$1</s>")
      // Images (before links)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
      // Links
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      )
  );
}

/* ── Font sizes ─────────────────────────────────────────────────── */
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36];

/* ── Props (unchanged interface) ────────────────────────────────── */
type ArticleEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSave?: () => void;
  isSaving?: boolean;
};

/* ── Toolbar sub-components (declared outside render) ──────────── */
function ToolbarBtn({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // prevent editor blur
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-all text-sm ${
        active
          ? "bg-zinc-800 text-white"
          : disabled
          ? "text-zinc-300 cursor-not-allowed"
          : "text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-zinc-200 mx-0.5" />;
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function ArticleEditor({
  value,
  onChange,
  placeholder = "Start writing your article...",
  onSave,
  isSaving = false,
}: ArticleEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const turndown = useMemo(() => createTurndown(), []);

  // Convert initial markdown → HTML once (only use initial value)
  const [initialValue] = useState(value);
  const initialWords = initialValue.trim().split(/\s+/).filter(Boolean).length;
  const [wordCount, setWordCount] = useState(initialWords);
  const [charCount, setCharCount] = useState(initialValue.length);
  const [readingTime, setReadingTime] = useState(Math.ceil(initialWords / 200));

  const initialHtml = useMemo(() => markdownToHtml(initialValue), [initialValue]);

  // Debounce ref for onChange
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: { HTMLAttributes: { class: "code-block" } },
      }),
      Placeholder.configure({ placeholder }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-600 underline cursor-pointer" },
      }),
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      Typography,
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class:
          "prose prose-zinc max-w-none focus:outline-none min-h-[400px] px-6 py-4",
      },
      handleKeyDown: (_view, event) => {
        // Ctrl/Cmd+S → save
        if ((event.ctrlKey || event.metaKey) && event.key === "s") {
          event.preventDefault();
          onSave?.();
          return true;
        }
        // Ctrl+\ → fullscreen
        if ((event.ctrlKey || event.metaKey) && event.key === "\\") {
          event.preventDefault();
          setIsFullscreen((f) => !f);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Update stats
      const text = ed.getText();
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      setCharCount(text.length);
      setReadingTime(Math.ceil(words / 200));

      // Debounce markdown conversion for performance
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const html = ed.getHTML();
        const md = turndown.turndown(html);
        onChange(md);
      }, 300);
    },
  });

  // Escape to exit fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isFullscreen]);

  // ── Toolbar actions ──
  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  const setFontSizeAction = useCallback(
    (size: string) => {
      if (!editor) return;
      if (size === "") {
        editor.chain().focus().unsetFontSize().run();
      } else {
        editor.chain().focus().setFontSize(`${size}px`).run();
      }
    },
    [editor]
  );

  const getCurrentFontSize = useCallback((): string => {
    if (!editor) return "";
    const attrs = editor.getAttributes("textStyle");
    if (attrs.fontSize) {
      return attrs.fontSize.replace("px", "");
    }
    return "";
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className={`flex flex-col bg-white ${
        isFullscreen
          ? "fixed inset-0 z-50"
          : "rounded-xl border border-zinc-200 shadow-sm"
      }`}
      style={{
        height: isFullscreen ? "100vh" : "calc(100vh - 200px)",
        minHeight: "500px",
      }}
    >
      {/* ─── Toolbar ─── */}
      <div className="flex-none border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 overflow-x-auto">
        <div className="flex items-center gap-0.5 min-w-0">
          {/* Undo / Redo */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
            </svg>
          </ToolbarBtn>

          <ToolbarDivider />

          {/* Headings */}
          <HeadingDropdown editor={editor} />

          <ToolbarDivider />

          {/* Font size */}
          <div className="relative">
            <select
              value={getCurrentFontSize()}
              onChange={(e) => setFontSizeAction(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              title="Font Size — select text first to resize"
              className="appearance-none bg-white border border-zinc-200 rounded-md pl-2 pr-5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-zinc-300 cursor-pointer tabular-nums h-7"
            >
              <option value="">Default</option>
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <svg className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <ToolbarDivider />

          {/* Bold, Italic, Underline, Strike */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold (Ctrl+B)"
          >
            <span className="font-bold text-sm">B</span>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic (Ctrl+I)"
          >
            <span className="italic text-sm">I</span>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Underline (Ctrl+U)"
          >
            <span className="underline text-sm">U</span>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Strikethrough"
          >
            <span className="line-through text-sm">S</span>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive("highlight")}
            title="Highlight"
          >
            <span className="text-sm bg-yellow-200 px-0.5 rounded">H</span>
          </ToolbarBtn>

          <ToolbarDivider />

          {/* Lists */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 4h13v2H8V4zM4.5 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6.9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM8 11h13v2H8v-2zm0 7h13v2H8v-2z" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Numbered List"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 4h13v2H8V4zM5 3v3h1v1H3V6h1V4H3V3h2zm-2 8v-1h3v1H5v1h1v1H3v-1h1v-1H3zm2 5v-1H3v-1h3v4H3v-1h2v-1zm3-3h13v2H8v-2zm0 7h13v2H8v-2z" />
            </svg>
          </ToolbarBtn>

          <ToolbarDivider />

          {/* Blockquote, Code, Link, Divider */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title="Blockquote"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive("codeBlock")}
            title="Code Block"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            title="Inline Code"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12l-5.657 5.657-1.414-1.414L21.172 12l-4.243-4.243 1.414-1.414L24 12zM2.828 12l4.243 4.243-1.414 1.414L0 12l5.657-5.657L7.07 7.757 2.828 12zm6.96 9H7.66l6.552-18h2.128L9.788 21z" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn onClick={setLink} active={editor.isActive("link")} title="Link (Ctrl+K)">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.364 15.536L16.95 14.12l1.414-1.414a5 5 0 10-7.071-7.071L9.879 7.05 8.464 5.636 9.88 4.222a7 7 0 019.9 9.9l-1.415 1.414zm-2.828 2.828l-1.415 1.414a7 7 0 01-9.9-9.9l1.415-1.414L7.05 9.88l-1.414 1.414a5 5 0 107.071 7.071l1.414-1.414 1.415 1.414zm-.708-10.607l1.415 1.415-7.071 7.07-1.415-1.414 7.071-7.07z" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Divider"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 11h2v2H2v-2zm4 0h12v2H6v-2zm14 0h2v2h-2v-2z" />
            </svg>
          </ToolbarBtn>

          <ToolbarDivider />

          {/* Text alignment */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
            title="Align Left"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M3 12h12M3 18h18" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
            title="Align Center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M6 12h12M3 18h18" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
            title="Align Right"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M9 12h12M3 18h18" />
            </svg>
          </ToolbarBtn>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Fullscreen */}
          <ToolbarBtn
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={
              isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen (Ctrl+\\)"
            }
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </ToolbarBtn>

          {/* Save */}
          {onSave && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSave();
              }}
              disabled={isSaving}
              className="ml-2 px-3 py-1 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ─── Bubble Menu (appears on text selection) ─── */}
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-0.5 bg-zinc-900 text-white rounded-lg shadow-xl px-1 py-0.5"
      >
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          B
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <em>I</em>
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <span className="underline">U</span>
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strike"
        >
          <span className="line-through">S</span>
        </BubbleBtn>
        <BubbleBtn onClick={setLink} active={editor.isActive("link")} title="Link">
          🔗
        </BubbleBtn>
        <BubbleBtn
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive("highlight")}
          title="Highlight"
        >
          <span className="bg-yellow-300 text-black px-0.5 rounded text-xs">H</span>
        </BubbleBtn>
      </BubbleMenu>

      {/* ─── Editor content ─── */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>

      {/* ─── Status bar ─── */}
      <div className="flex-none border-t border-zinc-200 bg-zinc-50 px-4 py-1.5">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
            <span>~{readingTime} min read</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-zinc-400">
              <kbd className="px-1 py-0.5 bg-zinc-200 rounded text-[10px]">
                Ctrl+Z
              </kbd>{" "}
              Undo
            </span>
            <span className="text-zinc-400">
              <kbd className="px-1 py-0.5 bg-zinc-200 rounded text-[10px]">
                Ctrl+S
              </kbd>{" "}
              Save
            </span>
            <span className="text-zinc-400">
              <kbd className="px-1 py-0.5 bg-zinc-200 rounded text-[10px]">
                Ctrl+B
              </kbd>{" "}
              Bold
            </span>
            <span className="text-zinc-400">
              <kbd className="px-1 py-0.5 bg-zinc-200 rounded text-[10px]">
                Ctrl+\
              </kbd>{" "}
              Fullscreen
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */
function HeadingDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const headings = [
    { level: 1 as const, label: "Heading 1", className: "text-xl font-bold" },
    { level: 2 as const, label: "Heading 2", className: "text-lg font-bold" },
    {
      level: 3 as const,
      label: "Heading 3",
      className: "text-base font-semibold",
    },
    {
      level: 4 as const,
      label: "Heading 4",
      className: "text-sm font-semibold",
    },
  ];

  const current = headings.find((h) =>
    editor.isActive("heading", { level: h.level })
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-zinc-600 hover:bg-zinc-200 transition-all h-7"
      >
        {current ? current.label : "Paragraph"}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl z-30 py-1 min-w-[160px]">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().setParagraph().run();
              setOpen(false);
            }}
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-zinc-50 ${
              !current ? "bg-zinc-100 font-medium" : ""
            }`}
          >
            Paragraph
          </button>
          {headings.map((h) => (
            <button
              key={h.level}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: h.level })
                  .run();
                setOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-left hover:bg-zinc-50 ${
                h.className
              } ${
                editor.isActive("heading", { level: h.level })
                  ? "bg-zinc-100"
                  : ""
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BubbleBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`px-1.5 py-1 rounded text-xs font-medium transition-all ${
        active ? "bg-white text-zinc-900" : "text-zinc-300 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
