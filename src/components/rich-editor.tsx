'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Heading from '@tiptap/extension-heading';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import CharacterCount from '@tiptap/extension-character-count';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionProps } from '@tiptap/suggestion';
import { Extension } from '@tiptap/core';
import type { Editor as TiptapEditor, Range } from '@tiptap/core';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  Undo,
  Redo,
  Highlighter,
  Underline as UnderlineIcon,
  Video,
  Sparkles,
} from 'lucide-react';
import { uploadMedia, UploadKind } from '@/lib/uploads/client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

type SlashCommandItem = {
  title: string;
  description: string;
  command: ({ editor, range }: { editor: TiptapEditor; range: Range }) => void;
};

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Create an unordered list',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Create an ordered list',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'Quote',
    description: 'Insert a blockquote',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'Code Block',
    description: 'Insert syntax highlighted block',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
];

const SlashCommand = Extension.create({
  name: 'slash-command',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: TiptapEditor; range: Range; props: SlashCommandItem }) => {
          props.command({ editor, range });
        },
        items: ({ query }: { query: string }) => {
          if (!query) return SLASH_COMMANDS;
          return SLASH_COMMANDS.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 5);
        },
        render: () => {
          let component: HTMLDivElement | null = null;
          let selectedIndex = 0;
          let items: SlashCommandItem[] = [];
          let currentProps: SuggestionProps<SlashCommandItem> | null = null;

          const handleSelect = (index: number) => {
            const item = items[index];
            if (item && currentProps) {
              currentProps.command(item);
            }
          };

          const renderItems = () => {
            if (!component) return;
            component.innerHTML = '';

            items.forEach((item, index) => {
              const option = document.createElement('button');
              option.type = 'button';
              option.className = cn(
                'w-full text-left px-3 py-2 rounded-md',
                selectedIndex === index ? 'bg-primary/10' : 'hover:bg-muted'
              );
              option.innerHTML = `<div class="text-sm font-medium">${item.title}</div><div class="text-xs text-muted-foreground">${item.description}</div>`;
              option.addEventListener('mousedown', (event) => {
                event.preventDefault();
                handleSelect(index);
              });
              component?.appendChild(option);
            });
          };

          const updatePosition = (props: SuggestionProps<SlashCommandItem>) => {
            if (component && props.clientRect) {
              const rect = props.clientRect();
              if (rect) {
                component.style.left = `${rect.left}px`;
                component.style.top = `${rect.bottom + 6}px`;
              }
            }
          };

          return {
            onStart: (props: SuggestionProps<SlashCommandItem>) => {
              currentProps = props;
              items = props.items;
              selectedIndex = 0;
              component = document.createElement('div');
              component.className =
                'rounded-md border bg-popover shadow-xl text-foreground w-64 p-1 text-sm';
              renderItems();
              document.body.appendChild(component);
              component.style.position = 'absolute';
              updatePosition(props);
            },
            onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
              currentProps = props;
              items = props.items;
              selectedIndex = 0;
              renderItems();
              updatePosition(props);
            },
            onKeyDown: (props: { event: KeyboardEvent }) => {
              if (!items.length) return false;
              if (props.event.key === 'ArrowDown') {
                selectedIndex = (selectedIndex + 1) % items.length;
                renderItems();
                return true;
              }
              if (props.event.key === 'ArrowUp') {
                selectedIndex = (selectedIndex + items.length - 1) % items.length;
                renderItems();
                return true;
              }
              if (props.event.key === 'Enter') {
                handleSelect(selectedIndex);
                return true;
              }
              return false;
            },
            onExit: () => {
              component?.remove();
              component = null;
            },
          };
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

interface RichEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  enableAutosave?: boolean;
  autosaveDelay?: number;
  onAutosave?: (content: string) => void;
  onMediaInsert?: (asset: { url: string; type: UploadKind; caption?: string; altText?: string }) => void;
}

interface MediaAsset {
  url: string;
  type: UploadKind;
  caption?: string;
  altText?: string;
}

export function RichEditor({
  content,
  onChange,
  placeholder = 'Write your theory or opinion here...',
  editable = true,
  className,
  enableAutosave = false,
  autosaveDelay = 2000,
  onAutosave,
  onMediaInsert,
}: RichEditorProps) {
  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const autosaveTimeout = useRef<NodeJS.Timeout | null>(null);

  const lowlight = useMemo(() => createLowlight(), []);

  const handleEditorUpdate = useCallback(
    (editorInstance: TiptapEditor) => {
      const html = editorInstance.getHTML();
      onChange(html);

      if (enableAutosave && onAutosave) {
        if (autosaveTimeout.current) {
          clearTimeout(autosaveTimeout.current);
        }

        autosaveTimeout.current = setTimeout(() => {
          onAutosave(html);
        }, autosaveDelay);
      }
    },
    [autosaveDelay, enableAutosave, onAutosave, onChange]
  );

  useEffect(() => {
    return () => {
      if (autosaveTimeout.current) {
        clearTimeout(autosaveTimeout.current);
      }
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false, // Disable default codeBlock since we're using CodeBlockLowlight
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: 'rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Highlight,
      Underline,
      Youtube.configure({
        controls: true,
        allowFullscreen: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      CharacterCount.configure({
        limit: 10000,
      }),
      SlashCommand,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => handleEditorUpdate(editor),
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[320px] px-4 py-3',
      },
    },
  });

  const setLink = useCallback(async () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    
    const { value: url } = await Swal.fire({
      title: 'Add Link',
      input: 'url',
      inputLabel: 'URL',
      inputValue: previousUrl || '',
      inputPlaceholder: 'https://example.com',
      showCancelButton: true,
      confirmButtonText: 'Add Link',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'Please enter a URL';
        }
        try {
          new URL(value);
        } catch {
          return 'Please enter a valid URL';
        }
      },
    });

    if (!url) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleMediaUpload = useCallback(
    (kind: UploadKind) => {
      if (!editor) return;

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = kind === 'image' ? 'image/*' : 'video/*';
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        setUploading(kind);
        try {
          const result = await uploadMedia(file, kind);
          
          // Get caption
          const captionResult = await Swal.fire({
            title: 'Add Caption',
            input: 'text',
            inputLabel: 'Caption (optional)',
            inputPlaceholder: 'Enter a caption for this media',
            showCancelButton: true,
            confirmButtonText: kind === 'image' ? 'Next' : 'Done',
            cancelButtonText: 'Skip',
            allowOutsideClick: false,
          });
          const caption = captionResult.value || undefined;

          // Get alt text for images
          let altText: string | undefined;
          if (kind === 'image') {
            const altResult = await Swal.fire({
              title: 'Add Alt Text',
              input: 'text',
              inputLabel: 'Alt text for accessibility (optional)',
              inputPlaceholder: 'Describe the image for screen readers',
              showCancelButton: true,
              confirmButtonText: 'Done',
              cancelButtonText: 'Skip',
              allowOutsideClick: false,
            });
            altText = altResult.value || undefined;
          }

          if (kind === 'image') {
            editor
              .chain()
              .focus()
              .setImage({
                src: result.url,
                alt: altText,
                title: caption,
              })
              .run();
          } else {
            editor
              .chain()
              .focus()
              .insertContent(
                `<figure class="my-4"><video controls class="w-full rounded-xl"><source src="${result.url}" type="${result.mimeType}" /></video>${
                  caption ? `<figcaption class="text-center text-sm text-muted-foreground">${caption}</figcaption>` : ''
                }</figure>`
              )
              .run();
          }

          const asset: MediaAsset = { url: result.url, type: kind, caption, altText };
          setMediaAssets((prev) => [asset, ...prev].slice(0, 5));
          onMediaInsert?.(asset);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to upload media';
          console.error('Media upload error:', error);
          await Swal.fire({
            icon: 'error',
            title: 'Upload Failed',
            text: message,
            confirmButtonText: 'OK',
          });
        } finally {
          setUploading(null);
        }
      };
      input.click();
    },
    [editor, onMediaInsert]
  );

  const reinsertMedia = useCallback(
    (asset: MediaAsset) => {
      if (!editor) return;
      if (asset.type === 'image') {
        editor
          .chain()
          .focus()
          .setImage({
            src: asset.url,
            alt: asset.altText,
            title: asset.caption,
          })
          .run();
      } else {
        editor
          .chain()
          .focus()
          .insertContent(
            `<figure class="my-4"><video controls class="w-full rounded-xl"><source src="${asset.url}" /></video>${
              asset.caption
                ? `<figcaption class="text-center text-sm text-muted-foreground">${asset.caption}</figcaption>`
                : ''
            }</figure>`
          )
          .run();
      }
    },
    [editor]
  );

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {editable && (
        <>
          <div className="border-b bg-muted/40 p-2 flex flex-wrap gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'bg-muted' : ''}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'bg-muted' : ''}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={editor.isActive('underline') ? 'bg-muted' : ''}
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={editor.isActive('highlight') ? 'bg-muted' : ''}
            >
              <Highlighter className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={editor.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={editor.isActive('heading', { level: 3 }) ? 'bg-muted' : ''}
            >
              <Heading3 className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'bg-muted' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'bg-muted' : ''}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={editor.isActive('blockquote') ? 'bg-muted' : ''}
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={editor.isActive('codeBlock') ? 'bg-muted' : ''}
            >
              <Code className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={setLink}
              className={editor.isActive('link') ? 'bg-muted' : ''}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleMediaUpload('image')}
              disabled={uploading === 'image'}
            >
              {uploading === 'image' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleMediaUpload('video')}
              disabled={uploading === 'video'}
            >
              {uploading === 'video' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Video className="h-4 w-4" />
              )}
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
          <div className="border-b bg-background/60 px-3 py-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              Tip: Type <code className="rounded bg-muted px-1">/</code> to open the command palette.
            </span>
          </div>
        </>
      )}

      <EditorContent editor={editor} />

      <div className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <span>{editor.storage.characterCount.characters()} / 10000 characters</span>
        <span>{editor.storage.characterCount.words()} words</span>
      </div>

      {mediaAssets.length > 0 && (
        <div className="border-t bg-background px-3 py-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Media tray
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {mediaAssets.map((asset, index) => (
              <button
                key={`${asset.url}-${index}`}
                type="button"
                onClick={() => reinsertMedia(asset)}
                className="border rounded-md px-3 py-2 text-left text-xs hover:border-primary transition-colors"
              >
                <div className="font-medium capitalize">{asset.type}</div>
                {asset.caption && <div className="text-muted-foreground line-clamp-1">{asset.caption}</div>}
                <div className="text-[10px] text-muted-foreground">Re-insert</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

