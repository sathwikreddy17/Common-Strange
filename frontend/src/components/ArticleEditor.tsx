"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type ArticleEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSave?: () => void;
  isSaving?: boolean;
};

export default function ArticleEditor({
  value,
  onChange,
  placeholder = "Start writing your article...",
  onSave,
  isSaving = false,
}: ArticleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"split" | "edit" | "preview">("split");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Calculate stats
  useEffect(() => {
    const words = value.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
    setCharCount(value.length);
    setReadingTime(Math.ceil(words / 200)); // ~200 words per minute
  }, [value]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "s") {
          e.preventDefault();
          onSave?.();
        }
        if (e.key === "\\") {
          e.preventDefault();
          setIsFullscreen((f) => !f);
        }
      }
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave, isFullscreen]);

  // Insert formatting at cursor
  const insertFormatting = useCallback(
    (before: string, after: string = "", defaultText: string = "") => {
      const selection = window.getSelection();
      const editor = editorRef.current;
      if (!editor) return;

      // Get current cursor position in textarea
      const textarea = editor.querySelector("textarea");
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || defaultText;

      const newValue =
        value.substring(0, start) +
        before +
        selectedText +
        after +
        value.substring(end);

      onChange(newValue);

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        const newPos = start + before.length + selectedText.length;
        textarea.setSelectionRange(start + before.length, newPos);
      }, 0);
    },
    [value, onChange]
  );

  // Insert block element at start of line
  const insertBlock = useCallback(
    (prefix: string, defaultText: string = "") => {
      const editor = editorRef.current;
      if (!editor) return;

      const textarea = editor.querySelector("textarea");
      if (!textarea) return;

      const start = textarea.selectionStart;
      const selectedText = value.substring(start, textarea.selectionEnd) || defaultText;

      // Find start of current line
      let lineStart = start;
      while (lineStart > 0 && value[lineStart - 1] !== "\n") {
        lineStart--;
      }

      const newValue =
        value.substring(0, lineStart) +
        prefix +
        selectedText +
        value.substring(textarea.selectionEnd);

      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        const newPos = lineStart + prefix.length + selectedText.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    },
    [value, onChange]
  );

  // Render markdown preview - robust parser that handles lists correctly
  const renderPreview = (md: string) => {
    if (!md.trim()) {
      return '<p class="text-zinc-400 italic">Your article preview will appear here as you write...</p>';
    }

    // Normalize line endings
    md = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Process inline formatting (applied to text content)
    const processInline = (text: string): string => {
      return text
        // Code first (preserve content)
        .replace(/`([^`]+)`/g, '<code class="bg-zinc-100 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
        // Bold and italic combined
        .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
        // Bold
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        // Italic
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
        .replace(/_([^_]+)_/g, "<em>$1</em>")
        // Strikethrough
        .replace(/~~(.+?)~~/g, "<del>$1</del>")
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline hover:text-blue-800">$1</a>')
        // Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-4" />');
    };

    const lines = md.split('\n');
    const result: string[] = [];
    let i = 0;
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = '';
    
    // Track main sections vs sub-sections for bold numbered headings
    const seenMainSections = new Set<number>();
    let lastMainSectionNum = 0;
    let inSubsectionContext = false;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Handle code blocks
      if (trimmed.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLang = trimmed.slice(3);
          codeBlockContent = [];
        } else {
          inCodeBlock = false;
          result.push(`<pre class="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto my-4"><code class="language-${codeBlockLang}">${codeBlockContent.join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
        }
        i++;
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        i++;
        continue;
      }

      // Empty line - paragraph break
      if (trimmed === '') {
        result.push('');
        i++;
        continue;
      }

      // Horizontal rule
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        result.push('<hr class="my-8 border-zinc-200" />');
        i++;
        continue;
      }

      // Bold numbered headings like **1. Title** - detect main vs sub-sections
      const boldNumMatch = trimmed.match(/^\*\*(\d+)\.\s*\**([^*]+?)\*+\s*$/) || 
                           trimmed.match(/^\*\*(\d+)\.\s*([^*]+)$/);
      if (boldNumMatch) {
        const num = parseInt(boldNumMatch[1], 10);
        const title = boldNumMatch[2].trim().replace(/\*+$/, '').trim();
        
        let isSubsection = false;
        
        // Determine if this is a main section or sub-section
        if (num === 1 && lastMainSectionNum > 0) {
          // Number reset to 1 after we've had other sections - this is a sub-section
          isSubsection = true;
          inSubsectionContext = true;
        } else if (inSubsectionContext && num <= 10) {
          // We're in a sub-section context
          if (num === lastMainSectionNum + 1 && !seenMainSections.has(num)) {
            // Likely returning to main sections
            isSubsection = false;
            inSubsectionContext = false;
          } else {
            isSubsection = true;
          }
        } else if (seenMainSections.has(num)) {
          // We've seen this number before as a main section
          isSubsection = true;
        }
        
        if (isSubsection) {
          result.push(`<h4 class="text-lg font-semibold mt-5 mb-2 text-zinc-700">${num}. ${processInline(title)}</h4>`);
        } else {
          result.push(`<h2 class="text-2xl font-bold mt-10 mb-4 text-zinc-900">${num}. ${processInline(title)}</h2>`);
          seenMainSections.add(num);
          lastMainSectionNum = num;
        }
        i++;
        continue;
      }

      // Headers
      const h4Match = trimmed.match(/^####\s+(.+)$/);
      if (h4Match) {
        result.push(`<h4 class="text-lg font-semibold mt-6 mb-2 text-zinc-700">${processInline(h4Match[1])}</h4>`);
        i++;
        continue;
      }

      const h3Match = trimmed.match(/^###\s+(.+)$/);
      if (h3Match) {
        result.push(`<h3 class="text-xl font-semibold mt-8 mb-3 text-zinc-800">${processInline(h3Match[1])}</h3>`);
        i++;
        continue;
      }

      const h2Match = trimmed.match(/^##\s+(.+)$/);
      if (h2Match) {
        result.push(`<h2 class="text-2xl font-bold mt-10 mb-4 text-zinc-900">${processInline(h2Match[1])}</h2>`);
        i++;
        continue;
      }

      const h1Match = trimmed.match(/^#\s+(.+)$/);
      if (h1Match) {
        result.push(`<h1 class="text-3xl font-bold mt-12 mb-6 text-zinc-900">${processInline(h1Match[1])}</h1>`);
        i++;
        continue;
      }

      // Blockquote
      const quoteMatch = trimmed.match(/^>\s*(.*)$/);
      if (quoteMatch) {
        const quoteLines: string[] = [];
        while (i < lines.length) {
          const qLine = lines[i].trim();
          const qMatch = qLine.match(/^>\s*(.*)$/);
          if (qMatch) {
            quoteLines.push(qMatch[1]);
            i++;
          } else {
            break;
          }
        }
        result.push(`<blockquote class="border-l-4 border-zinc-300 pl-4 italic text-zinc-600 my-4">${processInline(quoteLines.join('<br>'))}</blockquote>`);
        continue;
      }

      // Ordered list - collect ALL consecutive numbered items preserving their numbers
      const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (olMatch) {
        const listItems: { num: number; content: string }[] = [];
        let startNum = parseInt(olMatch[1], 10);
        
        while (i < lines.length) {
          const listLine = lines[i].trim();
          const itemMatch = listLine.match(/^(\d+)\.\s+(.+)$/);
          if (itemMatch) {
            listItems.push({ 
              num: parseInt(itemMatch[1], 10), 
              content: processInline(itemMatch[2]) 
            });
            i++;
          } else if (listLine === '') {
            // Check if next non-empty line is also a numbered list item
            let nextNonEmpty = i + 1;
            while (nextNonEmpty < lines.length && lines[nextNonEmpty].trim() === '') {
              nextNonEmpty++;
            }
            if (nextNonEmpty < lines.length && lines[nextNonEmpty].trim().match(/^(\d+)\.\s+/)) {
              i++; // Skip the empty line, continue the list
            } else {
              break; // End of list
            }
          } else {
            break;
          }
        }
        
        // Render the ordered list with proper start number
        result.push(`<ol class="my-4 pl-6 space-y-2" style="list-style-type: decimal;" start="${startNum}">`);
        listItems.forEach((item) => {
          result.push(`  <li class="text-zinc-700 leading-relaxed" value="${item.num}">${item.content}</li>`);
        });
        result.push('</ol>');
        continue;
      }

      // Unordered list - match `-`, `•`, or single `*` followed by space (not `**`)
      // Use negative lookahead to avoid matching bold text that starts with **
      const ulMatch = trimmed.match(/^([-•]|\*(?!\*))\s+(.+)$/);
      if (ulMatch) {
        const listItems: string[] = [];
        
        while (i < lines.length) {
          const listLine = lines[i].trim();
          const itemMatch = listLine.match(/^([-•]|\*(?!\*))\s+(.+)$/);
          if (itemMatch) {
            listItems.push(processInline(itemMatch[2]));
            i++;
          } else if (listLine === '') {
            // Check if next non-empty line is also a bullet list item
            let nextNonEmpty = i + 1;
            while (nextNonEmpty < lines.length && lines[nextNonEmpty].trim() === '') {
              nextNonEmpty++;
            }
            if (nextNonEmpty < lines.length && lines[nextNonEmpty].trim().match(/^([-•]|\*(?!\*))\s+/)) {
              i++; // Skip the empty line, continue the list
            } else {
              break; // End of list
            }
          } else {
            break;
          }
        }
        
        result.push('<ul class="my-4 pl-6 space-y-2">');
        listItems.forEach((item) => {
          result.push(`  <li class="text-zinc-700 leading-relaxed list-disc">${item}</li>`);
        });
        result.push('</ul>');
        continue;
      }

      // Regular paragraph - collect consecutive non-block lines
      const paraLines: string[] = [];
      while (i < lines.length) {
        const pLine = lines[i];
        const pTrimmed = pLine.trim();
        
        // Stop at block-level elements or empty lines
        // Note: Use negative lookahead for * to distinguish bullet lists from bold text
        if (
          pTrimmed === '' ||
          pTrimmed.startsWith('#') ||
          pTrimmed.startsWith('>') ||
          pTrimmed.startsWith('```') ||
          pTrimmed.match(/^[-•]\s+/) ||
          pTrimmed.match(/^\*(?!\*)\s+/) ||  // Single * followed by space = bullet, not ** (bold)
          pTrimmed.match(/^\d+\.\s+/) ||
          pTrimmed === '---' ||
          pTrimmed === '___'
        ) {
          break;
        }
        
        paraLines.push(pTrimmed);
        i++;
      }
      
      if (paraLines.length > 0) {
        // Join with <br> for single line breaks within paragraph
        const paraContent = processInline(paraLines.join('<br>'));
        result.push(`<p class="mb-4 leading-relaxed text-zinc-700">${paraContent}</p>`);
      }
    }

    // Clean up empty lines in result and join
    return result.filter(line => line !== '').join('\n');
  };

  const ToolbarButton = ({
    onClick,
    title,
    children,
    active = false,
  }: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    active?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-md transition-all ${
        active
          ? "bg-zinc-200 text-zinc-900"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
      }`}
    >
      {children}
    </button>
  );

  const ToolbarDivider = () => <div className="w-px h-6 bg-zinc-200 mx-1" />;

  const editorContent = (
    <div
      ref={editorRef}
      className={`flex flex-col bg-white ${
        isFullscreen ? "fixed inset-0 z-50" : "rounded-xl border border-zinc-200 shadow-sm"
      }`}
      style={{ height: isFullscreen ? "100vh" : "calc(100vh - 200px)", minHeight: "600px" }}
    >
      {/* Top toolbar */}
      <div className="flex-none border-b border-zinc-200 bg-zinc-50 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Headings dropdown */}
            <div className="relative group">
              <ToolbarButton onClick={() => {}} title="Headings">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10M7 16h6" />
                </svg>
              </ToolbarButton>
              <div className="absolute left-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 py-1 min-w-[180px]">
                <button
                  type="button"
                  onClick={() => insertBlock("# ", "Main Heading")}
                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-3"
                >
                  <span className="text-2xl font-bold text-zinc-400">H1</span>
                  <span className="text-sm text-zinc-600">Main Heading</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertBlock("## ", "Section Heading")}
                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-3"
                >
                  <span className="text-xl font-bold text-zinc-400">H2</span>
                  <span className="text-sm text-zinc-600">Section Heading</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertBlock("### ", "Sub Section")}
                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-3"
                >
                  <span className="text-lg font-bold text-zinc-400">H3</span>
                  <span className="text-sm text-zinc-600">Sub Section</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertBlock("#### ", "Minor Heading")}
                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-3"
                >
                  <span className="text-base font-bold text-zinc-400">H4</span>
                  <span className="text-sm text-zinc-600">Minor Heading</span>
                </button>
              </div>
            </div>

            <ToolbarDivider />

            {/* Text formatting */}
            <ToolbarButton
              onClick={() => insertFormatting("**", "**", "bold")}
              title="Bold (Ctrl+B)"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 11h4.5a2.5 2.5 0 100-5H8v5zm10 4.5a4.5 4.5 0 01-4.5 4.5H6V4h6.5a4.5 4.5 0 013.256 7.606A4.498 4.498 0 0118 15.5zM8 13v5h5.5a2.5 2.5 0 100-5H8z"/>
              </svg>
            </ToolbarButton>

            <ToolbarButton
              onClick={() => insertFormatting("*", "*", "italic")}
              title="Italic (Ctrl+I)"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15 20H7v-2h2.927l2.116-12H9V4h8v2h-2.927l-2.116 12H15v2z"/>
              </svg>
            </ToolbarButton>

            <ToolbarButton
              onClick={() => insertFormatting("~~", "~~", "strikethrough")}
              title="Strikethrough"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.154 14c.23.516.346 1.09.346 1.72 0 1.342-.524 2.392-1.571 3.147C14.88 19.622 13.433 20 11.586 20c-1.64 0-3.263-.381-4.87-1.144V16.6c1.52.877 3.075 1.316 4.666 1.316 2.551 0 3.83-.732 3.839-2.197a2.21 2.21 0 00-.648-1.603l-.12-.117H3v-2h18v2h-3.846zm-4.078-3H7.629a4.086 4.086 0 01-.481-.522C6.716 9.92 6.5 9.246 6.5 8.452c0-1.236.466-2.287 1.397-3.153C8.83 4.433 10.271 4 12.222 4c1.471 0 2.879.328 4.222.984v2.152c-1.2-.687-2.515-1.03-3.946-1.03-2.48 0-3.719.782-3.719 2.346 0 .42.218.786.654 1.099.436.313.974.562 1.613.75.62.18 1.297.414 2.03.699z"/>
              </svg>
            </ToolbarButton>

            <ToolbarDivider />

            {/* Lists */}
            <ToolbarButton
              onClick={() => insertBlock("- ", "List item")}
              title="Bullet List"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 4h13v2H8V4zM4.5 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6.9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM8 11h13v2H8v-2zm0 7h13v2H8v-2z"/>
              </svg>
            </ToolbarButton>

            <ToolbarButton
              onClick={() => insertBlock("1. ", "List item")}
              title="Numbered List"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 4h13v2H8V4zM5 3v3h1v1H3V6h1V4H3V3h2zm-2 8v-1h3v1H5v1h1v1H3v-1h1v-1H3zm2 5v-1H3v-1h3v4H3v-1h2v-1zm3-3h13v2H8v-2zm0 7h13v2H8v-2z"/>
              </svg>
            </ToolbarButton>

            <ToolbarDivider />

            {/* Block elements */}
            <ToolbarButton
              onClick={() => insertBlock("> ", "Quote")}
              title="Blockquote"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z"/>
              </svg>
            </ToolbarButton>

            <ToolbarButton
              onClick={() => insertFormatting("`", "`", "code")}
              title="Inline Code"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12l-5.657 5.657-1.414-1.414L21.172 12l-4.243-4.243 1.414-1.414L24 12zM2.828 12l4.243 4.243-1.414 1.414L0 12l5.657-5.657L7.07 7.757 2.828 12zm6.96 9H7.66l6.552-18h2.128L9.788 21z"/>
              </svg>
            </ToolbarButton>

            <ToolbarButton
              onClick={() => insertFormatting("[", "](https://)", "link text")}
              title="Insert Link"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.364 15.536L16.95 14.12l1.414-1.414a5 5 0 10-7.071-7.071L9.879 7.05 8.464 5.636 9.88 4.222a7 7 0 019.9 9.9l-1.415 1.414zm-2.828 2.828l-1.415 1.414a7 7 0 01-9.9-9.9l1.415-1.414L7.05 9.88l-1.414 1.414a5 5 0 107.071 7.071l1.414-1.414 1.415 1.414zm-.708-10.607l1.415 1.415-7.071 7.07-1.415-1.414 7.071-7.07z"/>
              </svg>
            </ToolbarButton>

            <ToolbarButton
              onClick={() => {
                const textarea = editorRef.current?.querySelector("textarea");
                if (!textarea) return;
                const pos = textarea.selectionStart;
                const newValue = value.substring(0, pos) + "\n\n---\n\n" + value.substring(pos);
                onChange(newValue);
              }}
              title="Horizontal Divider"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 11h2v2H2v-2zm4 0h12v2H6v-2zm14 0h2v2h-2v-2z"/>
              </svg>
            </ToolbarButton>
          </div>

          {/* Right side - View toggle and actions */}
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex bg-zinc-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("edit")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === "edit"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === "split"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === "preview"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Preview
              </button>
            </div>

            <ToolbarDivider />

            {/* Fullscreen toggle */}
            <ToolbarButton
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen (Ctrl+\\)"}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </ToolbarButton>

            {/* Save button */}
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="ml-2 px-4 py-1.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor pane */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div
            className={`flex flex-col ${
              viewMode === "split" ? "w-1/2 border-r border-zinc-200" : "w-full"
            }`}
          >
            <div className="flex-none px-4 py-2 bg-zinc-50 border-b border-zinc-100">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Markdown Editor
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-full p-6 text-base leading-relaxed resize-none focus:outline-none font-mono text-zinc-800 bg-white"
                style={{ 
                  tabSize: 2,
                  lineHeight: "1.8",
                }}
                onKeyDown={(e) => {
                  // Ctrl+B for bold
                  if ((e.ctrlKey || e.metaKey) && e.key === "b") {
                    e.preventDefault();
                    insertFormatting("**", "**", "bold");
                  }
                  // Ctrl+I for italic
                  if ((e.ctrlKey || e.metaKey) && e.key === "i") {
                    e.preventDefault();
                    insertFormatting("*", "*", "italic");
                  }
                  // Ctrl+K for link
                  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                    e.preventDefault();
                    insertFormatting("[", "](https://)", "link text");
                  }
                  // Tab for indent
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const textarea = e.target as HTMLTextAreaElement;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const newValue = value.substring(0, start) + "  " + value.substring(end);
                    onChange(newValue);
                    setTimeout(() => {
                      textarea.selectionStart = textarea.selectionEnd = start + 2;
                    }, 0);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Preview pane */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div
            className={`flex flex-col bg-white ${
              viewMode === "split" ? "w-1/2" : "w-full"
            }`}
          >
            <div className="flex-none px-4 py-2 bg-zinc-50 border-b border-zinc-100">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Live Preview
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              <div
                className="prose prose-zinc max-w-none p-6"
                dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="flex-none border-t border-zinc-200 bg-zinc-50 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
            <span>~{readingTime} min read</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400">
              <kbd className="px-1.5 py-0.5 bg-zinc-200 rounded text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-zinc-200 rounded text-xs">S</kbd> Save
            </span>
            <span className="text-zinc-400">
              <kbd className="px-1.5 py-0.5 bg-zinc-200 rounded text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-zinc-200 rounded text-xs">\</kbd> Fullscreen
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return editorContent;
}
