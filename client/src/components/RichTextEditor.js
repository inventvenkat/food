import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import './RichTextEditor.css'; // We'll create this for basic styling

const RichTextEditor = ({ value, onChange, placeholder }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure StarterKit options here if needed
        // For example, to disable some tools:
        // heading: { levels: [1, 2, 3] },
        // history: true, // Enable history (undo/redo)
        // document: true, // Keep this
        // paragraph: true, // Keep this
        // text: true, // Keep this
        // bold: {},
        // italic: {},
        // strike: {},
        // bulletList: {},
        // orderedList: {},
        // listItem: {},
        // blockquote: {},
        // horizontalRule: {},
        // hardBreak: {},
        // codeBlock: {},
        // code: {},
        // gapcursor: {}, // for tables or other complex nodes
        // dropcursor: {}, // for drag and drop
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none p-2 border border-gray-300 rounded-md min-h-[150px]',
      },
    },
  });

  if (!editor) {
    return null;
  }

  // Basic toolbar (can be expanded significantly)
  const Toolbar = () => (
    <div className="tiptap-toolbar border border-gray-300 rounded-t-md p-1 space-x-1 bg-gray-50">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''}>B</button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''}>I</button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''}>S</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}>H1</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}>H2</button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'is-active' : ''}>UL</button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'is-active' : ''}>OL</button>
      <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>Undo</button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>Redo</button>
    </div>
  );

  return (
    <div className="tiptap-editor-wrapper">
      <Toolbar />
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
};

export default RichTextEditor;
