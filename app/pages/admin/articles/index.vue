<script setup lang="ts">
definePageMeta({
  layout: 'admin'
})

const { t } = useI18n()
const modal = useAppModal()
const toast = useToast()
const { data, status, refresh } = await useFetch('/api/admin/articles', { lazy: true })
const deletingArticleId = ref<string | null>(null)

type ArticleRow = {
  id: string
  title: string
  slug: string
  status: string
  visibility: string
}

const tableRows = computed(() => (data.value?.articles ?? []) as ArticleRow[])

const columns = computed(() => [
  { id: 'article', accessorKey: 'title', header: t('admin.articles_col_article') },
  { id: 'state', accessorKey: 'status', header: t('admin.articles_col_state') },
  { id: 'actions', accessorKey: 'id', header: '\u00a0' }
])

function badgeStatus(key: string) {
  return t(`admin.badge_status_${key}`)
}

function badgeVisibility(key: string) {
  return t(`admin.badge_visibility_${key}`)
}

function getErrorMessage(error: unknown, fallback = '') {
  if (error && typeof error === 'object') {
    const maybeData = 'data' in error ? (error as { data?: { statusMessage?: string } }).data : undefined
    const maybeMessage = 'message' in error ? (error as { message?: string }).message : ''
    return maybeData?.statusMessage || maybeMessage || fallback
  }
  return fallback
}

async function deleteArticle(article: ArticleRow) {
  const confirmed = await modal.confirm({
    tone: 'error',
    title: t('admin.delete_article_title'),
    description: t('admin.delete_article_confirm', { title: article.title }),
    confirmLabel: t('common.delete'),
    cancelLabel: t('common.cancel')
  })
  if (!confirmed) return

  deletingArticleId.value = article.id
  try {
    await $fetch(`/api/admin/articles/${encodeURIComponent(article.id)}`, { method: 'DELETE' })
    await refresh()

    toast.add({
      title: t('common.deleted'),
      color: 'success'
    })
  } catch (e: unknown) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(e),
      color: 'error'
    })
  } finally {
    deletingArticleId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">
          {{ t('admin.articles_title') }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('admin.articles_desc') }}
        </p>
      </div>
      <UButton
        to="/admin/articles/new"
        icon="i-lucide-plus"
      >
        {{ t('admin.articles_new') }}
      </UButton>
    </div>

    <UTable
      :data="tableRows"
      :columns="columns"
      :loading="status === 'pending'"
      :get-row-id="(row: ArticleRow) => row.id"
      class="rounded-xl border border-default bg-default overflow-hidden"
    >
      <template #loading>
        <div class="flex flex-col items-center justify-center gap-3 py-16">
          <UIcon
            name="i-lucide-loader-circle"
            class="size-8 animate-spin text-muted"
          />
          <span class="text-sm text-muted">
            {{ t('common.loading') }}
          </span>
        </div>
      </template>

      <template #article-cell="{ row }">
        <div
          v-if="row"
          class="py-1"
        >
          <NuxtLink
            :to="`/admin/articles/${row.original.id}`"
            class="font-medium hover:text-primary"
          >
            {{ row.original.title }}
          </NuxtLink>
          <div class="text-xs text-muted mt-0.5">
            {{ row.original.slug }}
          </div>
        </div>
      </template>

      <template #state-cell="{ row }">
        <div
          v-if="row"
          class="flex flex-wrap items-center gap-2 py-1"
        >
          <UBadge variant="subtle">
            {{ badgeStatus(row.original.status) }}
          </UBadge>
          <UBadge
            color="neutral"
            variant="subtle"
          >
            {{ badgeVisibility(row.original.visibility) }}
          </UBadge>
        </div>
      </template>

      <template #actions-cell="{ row }">
        <div
          v-if="row"
          class="flex justify-end gap-1 py-1"
        >
          <UButton
            :to="`/admin/articles/${row.original.id}`"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-pencil"
          />
          <UButton
            size="xs"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            :aria-label="t('common.delete')"
            :loading="deletingArticleId === row.original.id"
            :disabled="!!deletingArticleId && deletingArticleId !== row.original.id"
            @click="deleteArticle(row.original)"
          />
        </div>
      </template>

      <template #empty>
        <div class="text-center py-24">
          <div
            class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-elevated ring-1 ring-default"
          >
            <UIcon
              name="i-lucide-file-text"
              class="w-10 h-10 text-muted"
            />
          </div>
          <p class="text-muted font-medium">
            {{ t('admin.articles_empty') }}
          </p>
        </div>
      </template>
    </UTable>
  </div>
</template>
