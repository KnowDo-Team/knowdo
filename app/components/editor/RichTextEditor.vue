<script setup lang="ts">
import { computed } from 'vue'
import type { EditorToolbarItem, EditorSuggestionMenuItem, EditorCustomHandlers } from '@nuxt/ui'
import { ImageUpload } from './ImageUploadExtension'
import { TextStyle, FontSize, Color, BackgroundColor, FontFamily } from '@tiptap/extension-text-style'
import { TextAlign } from '@tiptap/extension-text-align'

const { t } = useI18n()

const props = defineProps<{
  modelValue?: string | object
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | object]
}>()

/** Stable instances — inline `:extensions="[...]"` recreates on every render and breaks TipTap reconfigure (keyed plugin errors). */
const textAlignExtension = TextAlign.configure({ types: ['heading', 'paragraph'] })
const editorExtensions = [
  ImageUpload,
  TextStyle,
  textAlignExtension,
  FontSize,
  Color,
  BackgroundColor,
  FontFamily
]

const value = computed<string | object>({
  get: () => props.modelValue ?? { type: 'doc', content: [] },
  set: val => emit('update:modelValue', val)
})

const customHandlers: EditorCustomHandlers = {
  imageUpload: {
    canExecute: (editor: any) => editor.can().insertContent({ type: 'imageUpload' }),
    execute: (editor: any) => editor.chain().focus().insertContent({ type: 'imageUpload' }).run(),
    isActive: (editor: any) => editor.isActive('imageUpload'),
    isDisabled: undefined
  },
  textAlign: {
    canExecute: (editor: any) => editor.can().setTextAlign('left'),
    execute: (editor: any, attrs: any) => editor.chain().focus().setTextAlign(attrs.align).run(),
    isActive: (editor: any, attrs: any) => editor.isActive({ textAlign: attrs.align }),
    isDisabled: undefined
  },
  fontSize: {
    canExecute: (editor: any) => editor.can().setMark('textStyle'),
    execute: (editor: any, attrs: any) => editor.chain().focus().setFontSize(attrs.fontSize).run(),
    isActive: (editor: any, attrs: any) => editor.isActive('textStyle', { fontSize: attrs.fontSize }),
    isDisabled: undefined
  },
  color: {
    canExecute: (editor: any) => editor.can().setColor('#000000'),
    execute: (editor: any, attrs: any) => editor.chain().focus().setColor(attrs.color).run(),
    isActive: (editor: any, attrs: any) => editor.isActive('textStyle', { color: attrs.color }),
    isDisabled: undefined
  },
  backgroundColor: {
    canExecute: (editor: any) => editor.can().setBackgroundColor('#000000'),
    execute: (editor: any, attrs: any) => editor.chain().focus().setBackgroundColor(attrs.backgroundColor).run(),
    isActive: (editor: any, attrs: any) => editor.isActive('textStyle', { backgroundColor: attrs.backgroundColor }),
    isDisabled: undefined
  },
  fontFamily: {
    canExecute: (editor: any) => editor.can().setFontFamily('Arial'),
    execute: (editor: any, attrs: any) => editor.chain().focus().setFontFamily(attrs.fontFamily).run(),
    isActive: (editor: any, attrs: any) => editor.isActive('textStyle', { fontFamily: attrs.fontFamily }),
    isDisabled: undefined
  }
}

const appendToBody = () => document.body

const toolbarItems = computed<EditorToolbarItem[][]>(() => [
  [
    { kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: t('editor.undo') } },
    { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: t('editor.redo') } }
  ],
  [
    {
      icon: 'i-lucide-heading',
      content: { align: 'start' },
      items: [
        { kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: t('editor.heading1') },
        { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: t('editor.heading2') },
        { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: t('editor.heading3') }
      ]
    },
    {
      icon: 'i-lucide-list',
      content: { align: 'start' },
      items: [
        { kind: 'bulletList', icon: 'i-lucide-list', label: t('editor.bulletList') },
        { kind: 'orderedList', icon: 'i-lucide-list-ordered', label: t('editor.orderedList') }
      ]
    },
    { kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: t('editor.blockquote') } },
    { kind: 'codeBlock', icon: 'i-lucide-square-code', tooltip: { text: t('editor.codeBlock') } }
  ],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: t('editor.bold') } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: t('editor.italic') } },
    { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: t('editor.underline') } },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: t('editor.strikethrough') } },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: t('editor.code') } }
  ],
  [
    {
      icon: 'i-lucide-baseline',
      content: { align: 'start' },
      items: [
        { label: '12px', kind: 'fontSize', fontSize: '12px', icon: 'i-lucide-type' },
        { label: '14px', kind: 'fontSize', fontSize: '14px', icon: 'i-lucide-type' },
        { label: '16px', kind: 'fontSize', fontSize: '16px', icon: 'i-lucide-type' },
        { label: '18px', kind: 'fontSize', fontSize: '18px', icon: 'i-lucide-type' },
        { label: '20px', kind: 'fontSize', fontSize: '20px', icon: 'i-lucide-type' },
        { label: '24px', kind: 'fontSize', fontSize: '24px', icon: 'i-lucide-type' },
        { label: '30px', kind: 'fontSize', fontSize: '30px', icon: 'i-lucide-type' },
        { label: '36px', kind: 'fontSize', fontSize: '36px', icon: 'i-lucide-type' },
        { label: t('editor.resetFormatting'), onClick: (editor: any) => editor.chain().focus().unsetFontSize().run(), icon: 'i-lucide-rotate-ccw' }
      ]
    },
    {
      icon: 'i-lucide-case-sensitive',
      content: { align: 'start' },
      items: [
        { label: t('editor.fontSans'), kind: 'fontFamily', fontFamily: 'Inter, ui-sans-serif, system-ui', icon: 'i-lucide-type' },
        { label: t('editor.fontSerif'), kind: 'fontFamily', fontFamily: 'Georgia, ui-serif, serif', icon: 'i-lucide-type' },
        { label: t('editor.fontMono'), kind: 'fontFamily', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', icon: 'i-lucide-terminal' },
        { label: t('editor.resetFormatting'), onClick: (editor: any) => editor.chain().focus().unsetFontFamily().run(), icon: 'i-lucide-rotate-ccw' }
      ]
    },
    {
      icon: 'i-lucide-palette',
      content: { align: 'start' },
      items: [
        { label: t('editor.resetFormatting'), onClick: (editor: any) => editor.chain().focus().unsetColor().run(), icon: 'i-lucide-rotate-ccw' },
        { label: t('editor.colorRed'), kind: 'color', color: '#ef4444', chip: { color: 'red' } },
        { label: t('editor.colorOrange'), kind: 'color', color: '#f97316', chip: { color: 'orange' } },
        { label: t('editor.colorYellow'), kind: 'color', color: '#eab308', chip: { color: 'yellow' } },
        { label: t('editor.colorGreen'), kind: 'color', color: '#22c55e', chip: { color: 'green' } },
        { label: t('editor.colorBlue'), kind: 'color', color: '#3b82f6', chip: { color: 'blue' } },
        { label: t('editor.colorPurple'), kind: 'color', color: '#a855f7', chip: { color: 'purple' } },
        { label: t('editor.colorGray'), kind: 'color', color: '#64748b', chip: { color: 'neutral' } }
      ]
    },
    {
      icon: 'i-lucide-highlighter',
      content: { align: 'start' },
      items: [
        { label: t('editor.resetFormatting'), onClick: (editor: any) => editor.chain().focus().unsetBackgroundColor().run(), icon: 'i-lucide-rotate-ccw' },
        { label: t('editor.colorYellow'), kind: 'backgroundColor', backgroundColor: '#fef08a', chip: { color: 'yellow' } },
        { label: t('editor.colorGreen'), kind: 'backgroundColor', backgroundColor: '#bbf7d0', chip: { color: 'green' } },
        { label: t('editor.colorBlue'), kind: 'backgroundColor', backgroundColor: '#bfdbfe', chip: { color: 'blue' } },
        { label: t('editor.colorPink'), kind: 'backgroundColor', backgroundColor: '#fbcfe8', chip: { color: 'pink' } }
      ]
    }
  ],
  [
    {
      icon: 'i-lucide-align-left',
      tooltip: { text: t('editor.align') },
      content: { align: 'start' },
      items: [
        { kind: 'textAlign', align: 'left', icon: 'i-lucide-align-left', label: t('editor.alignLeft') },
        { kind: 'textAlign', align: 'center', icon: 'i-lucide-align-center', label: t('editor.alignCenter') },
        { kind: 'textAlign', align: 'right', icon: 'i-lucide-align-right', label: t('editor.alignRight') },
        { kind: 'textAlign', align: 'justify', icon: 'i-lucide-align-justify', label: t('editor.alignJustify') }
      ]
    }
  ],
  [
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: t('editor.link') } },
    { kind: 'imageUpload', icon: 'i-lucide-image', tooltip: { text: t('editor.insertImage') } }
  ],
  [
    { kind: 'horizontalRule', icon: 'i-lucide-minus', tooltip: { text: t('editor.horizontalRule') } }
  ]
])

const suggestionItems = computed<EditorSuggestionMenuItem[][]>(() => [
  [
    { type: 'label', label: t('editor.style') },
    { kind: 'paragraph', label: t('editor.paragraph'), icon: 'i-lucide-type' },
    { kind: 'heading', level: 1, label: t('editor.heading1'), icon: 'i-lucide-heading-1' },
    { kind: 'heading', level: 2, label: t('editor.heading2'), icon: 'i-lucide-heading-2' },
    { kind: 'heading', level: 3, label: t('editor.heading3'), icon: 'i-lucide-heading-3' },
    { kind: 'bulletList', label: t('editor.bulletList'), icon: 'i-lucide-list' },
    { kind: 'orderedList', label: t('editor.orderedList'), icon: 'i-lucide-list-ordered' },
    { kind: 'blockquote', label: t('editor.blockquote'), icon: 'i-lucide-text-quote' },
    { kind: 'codeBlock', label: t('editor.codeBlock'), icon: 'i-lucide-square-code' }
  ],
  [
    { type: 'label', label: t('editor.insert') },
    { kind: 'imageUpload', label: t('editor.insertImage'), icon: 'i-lucide-image' },
    { kind: 'horizontalRule', label: t('editor.horizontalRule'), icon: 'i-lucide-separator-horizontal' }
  ]
])
</script>

<template>
  <ClientOnly>
    <div
      class="border border-(--ui-border) rounded-lg overflow-hidden bg-white dark:bg-neutral-900 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-shadow w-full flex flex-col min-h-[280px]"
    >
      <UEditor
        v-slot="{ editor }"
        v-model="value"
        content-type="json"
        :placeholder="placeholder || t('editor.placeholder')"
        :handlers="customHandlers"
        :extensions="editorExtensions"
        :ui="{ base: 'px-4 sm:px-8 pt-4 pb-8 max-w-none min-h-[200px] flex-1' }"
        class="flex-1 w-full min-h-[200px]"
      >
        <UEditorToolbar
          :editor="editor"
          :items="toolbarItems"
          class="border-b border-(--ui-border) px-4 sm:px-8 py-2 bg-neutral-50 dark:bg-neutral-950 overflow-x-auto whitespace-nowrap scrollbar-hide rounded-t-lg shrink-0"
        />

        <UEditorSuggestionMenu
          :editor="editor"
          :items="suggestionItems"
          :append-to="appendToBody"
        />
      </UEditor>
    </div>

    <template #fallback>
      <div
        class="min-h-[280px] rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated)/40 flex flex-col items-center justify-center gap-3 text-sm text-(--ui-text-muted)"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-8 animate-spin"
        />
        {{ t('common.loading') }}
      </div>
    </template>
  </ClientOnly>
</template>

<style>
/* Nuxt UI Editor: .prose via ui.base */
</style>
