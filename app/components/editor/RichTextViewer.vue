<script setup lang="ts">
import { computed } from 'vue'
import DOMPurify from 'isomorphic-dompurify'
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string'
import { StarterKit } from '@tiptap/starter-kit'
import { TextStyle, FontSize, Color, BackgroundColor, FontFamily } from '@tiptap/extension-text-style'
import { TextAlign } from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'

const props = defineProps<{
  content: string | object
}>()

const renderedHTML = computed(() => {
  if (!props.content) return ''
  try {
    const json = typeof props.content === 'string' ? JSON.parse(props.content) : props.content
    const html = renderToHTMLString({
      content: json,
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Image,
        TextStyle,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        FontSize.configure({ types: ['textStyle'] }),
        Color.configure({ types: ['textStyle'] }),
        BackgroundColor.configure({ types: ['textStyle'] }),
        FontFamily.configure({ types: ['textStyle'] })
      ]
    })
    return DOMPurify.sanitize(html)
  } catch (e) {
    console.error('RichTextViewer render failed', e)
    return ''
  }
})
</script>

<template>
  <div
    class="w-full max-w-none prose dark:prose-invert selection:bg-primary/20 outline-none text-(--ui-text)
    [&_p]:leading-[1.75] *:mt-0 *:mb-4 *:last:mb-0
    [&_img]:rounded-md [&_img]:block [&_img]:max-w-full
    [&_a]:text-(--ui-primary) [&_a]:transition-colors"
    v-html="renderedHTML"
  />
</template>
