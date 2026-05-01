<script setup lang="ts">
definePageMeta({
  layout: 'admin'
})

const { t } = useI18n()
const toast = useToast()
const submitting = ref(false)

const slug = ref('')
const title = ref('')
const visibility = ref<'public' | 'private'>('public')
const status = ref<'draft' | 'published'>('draft')
const termIds = ref<string[]>([])
const content = ref<Record<string, unknown>>({ type: 'doc', content: [] })

const { data: termsData } = await useFetch<{ terms: Array<{ id: string, name: string, slug: string, parentId: string | null }> }>(
  '/api/admin/terms',
  { lazy: true }
)
const terms = computed(() => termsData.value?.terms ?? [])

const visibilityItems = computed(() => [
  { label: t('admin.visibility_public'), value: 'public' as const },
  { label: t('admin.visibility_private'), value: 'private' as const }
])

const statusItems = computed(() => [
  { label: t('admin.status_draft'), value: 'draft' as const },
  { label: t('admin.status_published'), value: 'published' as const }
])

const slugHint = computed(() => t('admin.slug_hint', { slug: slug.value.trim() || '-' }))

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const maybeData = 'data' in error ? (error as { data?: { statusMessage?: string } }).data : undefined
    const maybeMessage = 'message' in error ? (error as { message?: string }).message : ''
    return maybeData?.statusMessage || maybeMessage || fallback
  }

  return fallback
}

async function save() {
  submitting.value = true

  try {
    const res = await $fetch<{ success: boolean, id: string }>('/api/admin/articles', {
      method: 'POST',
      body: {
        slug: slug.value.trim(),
        title: title.value.trim(),
        content: content.value,
        visibility: visibility.value,
        status: status.value,
        termIds: termIds.value
      }
    })

    toast.add({
      title: t('common.saved'),
      color: 'success'
    })

    await navigateTo(`/admin/articles/${res.id}`)
  } catch (e: unknown) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(e, t('admin.save_failed')),
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-6xl space-y-6">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold">
        {{ t('admin.new_article_title') }}
      </h1>
      <div class="flex gap-2">
        <UButton
          to="/admin/articles"
          color="neutral"
          variant="ghost"
        >
          {{ t('common.back') }}
        </UButton>
        <UButton
          :loading="submitting"
          icon="i-lucide-save"
          @click="save"
        >
          {{ t('common.save') }}
        </UButton>
      </div>
    </div>

    <UCard>
      <div class="space-y-4">
        <UFormField
          :label="t('admin.field_slug_url')"
          required
          :hint="slugHint"
        >
          <UInput
            v-model="slug"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('admin.field_title')"
          required
        >
          <UInput
            v-model="title"
            class="w-full"
          />
        </UFormField>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField :label="t('admin.field_visibility')">
            <USelect
              v-model="visibility"
              :items="visibilityItems"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('admin.field_status')">
            <USelect
              v-model="status"
              :items="statusItems"
              class="w-full"
            />
          </UFormField>
        </div>
        <UFormField :label="t('admin.field_categories')">
          <AdminArticleCategoryTreePicker
            v-model="termIds"
            :terms="terms"
          />
        </UFormField>

        <UFormField
          :label="t('admin.field_content')"
          name="content"
          class="w-full"
        >
          <EditorRichTextEditor
            v-model="content"
            class="w-full"
          />
        </UFormField>
      </div>
    </UCard>
  </div>
</template>
