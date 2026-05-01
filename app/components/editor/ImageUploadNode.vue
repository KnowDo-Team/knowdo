<script setup lang="ts">
import type { NodeViewProps } from '@tiptap/vue-3'
import { NodeViewWrapper } from '@tiptap/vue-3'
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_LABEL_MB,
  uploadFetchErrorMessage
} from '~~/shared/attachmentUpload'

const props = defineProps<NodeViewProps>()
const modal = useAppModal()

const file = ref<File | null>(null)
const loading = ref(false)

watch(file, async (newFile) => {
  if (!newFile) return

  if (newFile.size > MAX_ATTACHMENT_BYTES) {
    modal.error({
      title: 'Error',
      description: `File too large (max ${MAX_ATTACHMENT_LABEL_MB}MB)`,
      confirmLabel: 'OK'
    })
    file.value = null
    return
  }

  loading.value = true

  try {
    const formData = new FormData()
    formData.append('file', newFile)

    const response = await $fetch<{
      success: boolean
      data?: {
        id: number
        filename: string
        url: string
        size: number
        type: string
      }
    }>('/api/upload', {
      method: 'POST',
      body: formData
    })

    if (response.success && response.data) {
      const pos = props.getPos()
      if (typeof pos !== 'number') {
        loading.value = false
        return
      }

      const ev = new CustomEvent('editor-upload-success', {
        detail: response.data,
        bubbles: true
      })
      document.dispatchEvent(ev)

      props.editor
        .chain()
        .focus()
        .deleteRange({ from: pos, to: pos + 1 })
        .insertContent({
          type: 'image',
          attrs: { src: response.data.url, alt: response.data.filename }
        })
        .run()
    } else {
      modal.error({ title: 'Error', description: 'Upload failed', confirmLabel: 'OK' })
    }
  } catch (error: unknown) {
    modal.error({
      title: 'Error',
      description: uploadFetchErrorMessage(error, 'Upload failed'),
      confirmLabel: 'OK'
    })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <NodeViewWrapper>
    <UFileUpload
      v-model="file"
      accept="image/*"
      label="Insert image"
      description="Click or drag an image"
      :preview="false"
      class="min-h-48 my-4"
    >
      <template #leading>
        <UAvatar
          :icon="loading ? 'i-lucide-loader-circle' : 'i-lucide-image'"
          size="xl"
          :ui="{ icon: [loading && 'animate-spin'] }"
        />
      </template>
    </UFileUpload>
  </NodeViewWrapper>
</template>
