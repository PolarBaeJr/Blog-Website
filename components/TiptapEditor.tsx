'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [htmlMode, setHtmlMode] = useState(false);
  const [rawHtml, setRawHtml] = useState(content);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Image.configure({ HTMLAttributes: { class: 'max-w-full rounded-lg' } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline hover:text-blue-800' },
      }),
      Placeholder.configure({ placeholder: 'Start writing your post...' }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setRawHtml(html);
      onChange(html);
    },
    editorProps: {
      attributes: { class: 'prose prose-lg max-w-none min-h-[400px] px-4 py-3 focus:outline-none' },
    },
  });

  // Detect HTML paste in rich-text mode: if the clipboard only has plain text
  // but it looks like HTML markup (e.g. copied from a code editor), parse and
  // insert it as rich content instead of dumping raw angle-brackets.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onPaste = (event: ClipboardEvent) => {
      const htmlMime = event.clipboardData?.getData('text/html') ?? '';
      const plain = event.clipboardData?.getData('text/plain') ?? '';
      if (!htmlMime && /<[a-zA-Z][^>]*>/i.test(plain)) {
        event.preventDefault();
        editor.commands.insertContent(plain);
      }
    };
    dom.addEventListener('paste', onPaste);
    return () => dom.removeEventListener('paste', onPaste);
  }, [editor]);

  // Toggle between rich text and raw HTML mode
  const toggleHtmlMode = useCallback(() => {
    if (!editor) return;
    if (!htmlMode) {
      // Entering HTML mode — sync current editor content to textarea
      setRawHtml(editor.getHTML());
      setHtmlMode(true);
    } else {
      // Leaving HTML mode — push textarea content back into editor
      editor.commands.setContent(rawHtml, { emitUpdate: false });
      onChange(rawHtml);
      setHtmlMode(false);
    }
  }, [htmlMode, editor, rawHtml, onChange]);

  const handleRawHtmlChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawHtml(e.target.value);
    onChange(e.target.value);
  }, [onChange]);

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setUploadError(null);
    e.target.value = '';
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) { const data = await res.json(); setUploadError(data.error || 'Failed to upload image'); return; }
      const { url } = await res.json();
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      setUploadError('Failed to upload image. Please try again.');
    }
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="min-h-[400px] rounded-lg border border-gray-300 bg-gray-50 flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-300 bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-2">
        {!htmlMode && (
          <>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
              <span className="font-bold">B</span>
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
              <span className="italic">I</span>
            </ToolbarButton>
            <ToolbarDivider />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Heading 1">H1</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">H2</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Heading 3">H3</ToolbarButton>
            <ToolbarDivider />
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">• List</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Ordered List">1. List</ToolbarButton>
            <ToolbarDivider />
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote">&ldquo; Quote</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="Code Block">{'</>'}</ToolbarButton>
            <ToolbarDivider />
            <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Link">Link</ToolbarButton>
            <ToolbarButton onClick={handleImageUpload} isActive={false} title="Insert Image">Image</ToolbarButton>
            <ToolbarDivider />
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} isActive={false} disabled={!editor.can().undo()} title="Undo">Undo</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} isActive={false} disabled={!editor.can().redo()} title="Redo">Redo</ToolbarButton>
            <ToolbarDivider />
          </>
        )}
        <ToolbarButton onClick={toggleHtmlMode} isActive={htmlMode} title={htmlMode ? 'Switch to rich text' : 'Edit raw HTML'}>
          {htmlMode ? '← Rich Text' : '</> HTML'}
        </ToolbarButton>
      </div>

      {uploadError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700">
          {uploadError}
        </div>
      )}

      {/* HTML mode: raw editable textarea */}
      {htmlMode ? (
        <textarea
          value={rawHtml}
          onChange={handleRawHtmlChange}
          className="w-full min-h-[400px] px-4 py-3 font-mono text-sm bg-gray-950 text-green-400 focus:outline-none resize-y"
          placeholder={'<h1>Your heading</h1>\n<p>Your paragraph...</p>'}
          spellCheck={false}
        />
      ) : (
        <EditorContent editor={editor} />
      )}

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileChange} className="hidden" />
    </div>
  );
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: {
  onClick: () => void;
  isActive: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`rounded px-2 py-1 text-sm transition-colors ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'} ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}>
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 w-px self-stretch bg-gray-300" />;
}
