<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

const q = computed(() => String(route.query.q ?? '').trim())

const { data, status, error } = await useFetch<{
  query: string
  directSlug: string | null
  results: { slug: string; title: string; updatedAt: string }[]
}>(
  () => `/api/public/articles/search?q=${encodeURIComponent(q.value)}`,
  { watch: [q] }
)

const router = useRouter()

watch(
  () => data.value?.directSlug,
  (slug) => {
    if (!import.meta.client || !slug || !q.value) return
    router.replace(localePath(`/${encodeURIComponent(slug)}`))
  },
  { immediate: true }
)

watchEffect(() => {
  if (q.value) {
    useHead({ title: () => `${t('wiki.search_title')}: ${q.value}` })
  } else {
    useHead({ title: () => t('wiki.search_title') })
  }
})
</script>

<template>
  <UContainer class="py-10 space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-(--ui-text-highlighted)">
        {{ t('wiki.search_title') }}
      </h1>
      <p v-if="q" class="text-muted text-sm mt-1">
        {{ t('wiki.search_for', { q }) }}
      </p>
      <p v-else class="text-muted text-sm mt-1">
        {{ t('wiki.search_missing_query') }}
      </p>
    </div>

    <div v-if="status === 'pending'" class="text-muted">{{ t('common.loading') }}</div>
    <UAlert v-else-if="error" color="error" :title="t('wiki.search_failed')" />

    <template v-else-if="data && !data.directSlug && q">
      <UEmpty v-if="!data.results.length" class="py-8" :description="t('wiki.search_empty')" />
      <ul
        v-else
        class="rounded-lg border border-(--ui-border) divide-y divide-(--ui-border) overflow-hidden"
      >
        <li
          v-for="r in data.results"
          :key="r.slug"
          class="px-4 py-3 transition hover:bg-(--ui-bg-elevated)/60"
        >
          <NuxtLink :to="localePath(`/${encodeURIComponent(r.slug)}`)" class="font-medium text-primary hover:underline">
            {{ r.title }}
          </NuxtLink>
          <div class="text-xs text-muted mt-0.5 font-mono">{{ r.slug }}</div>
        </li>
      </ul>
    </template>
  </UContainer>
</template>
