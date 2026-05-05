'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Quote, Code } from 'lucide-react';
import { useEffect } from 'react';

interface TipTapEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  editable?: boolean;
}

export default function TipTapEditor({ initialContent, onChange, editable = true }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      // Use the markdown extension to output standard markdown.
      // tiptap-markdown registers `markdown` on editor.storage at runtime
      // but doesn't extend the StorageMap type — cast to access it.
      const md = (editor.storage as unknown as {
        markdown: { getMarkdown: () => string };
      }).markdown;
      onChange(md.getMarkdown());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none min-h-[150px] p-4 focus:outline-none',
      },
    },
  });

  // Keep content synced if initialContent changes significantly from outside,
  // but we usually don't want to overwrite local edits unless necessary.
  // We'll skip deep syncing here to avoid cursor jumps during active typing,
  // relying on the parent to unmount/remount or manage state if a hard reset is needed.

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col border border-white/10 rounded-xl overflow-hidden bg-[var(--color-background)] focus-within:border-[var(--color-accent)]/50 transition-colors">
      {editable && (
        <div className="flex items-center gap-1 p-2 border-b border-white/5 bg-white/5 overflow-x-auto">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            icon={<Bold size={14} />}
            title="Kalın"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            icon={<Italic size={14} />}
            title="İtalik"
          />
          <div className="w-px h-4 bg-white/10 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            icon={<Heading2 size={14} />}
            title="Başlık 2"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            icon={<Heading3 size={14} />}
            title="Başlık 3"
          />
          <div className="w-px h-4 bg-white/10 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon={<List size={14} />}
            title="Sırasız Liste"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon={<ListOrdered size={14} />}
            title="Sıralı Liste"
          />
          <div className="w-px h-4 bg-white/10 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            icon={<Quote size={14} />}
            title="Alıntı"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            icon={<Code size={14} />}
            title="Kod Bloğu"
          />
        </div>
      )}
      <div className="flex-1 bg-[var(--color-background)] cursor-text" onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  isActive,
  icon,
  title,
}: {
  onClick: () => void;
  isActive: boolean;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded text-[var(--color-text-secondary)] hover:text-white transition-colors ${
        isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5'
      }`}
    >
      {icon}
    </button>
  );
}
