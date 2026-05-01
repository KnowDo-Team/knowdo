<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()

const segments = computed(() => {
  const p = route.params.path
  if (Array.isArray(p)) return p.map(String).filter(Boolean)
  if (typeof p === 'string' && p.length) return p.split('/').filter(Boolean)
  return []
})

const apiUrl = computed(() => {
  const s = segments.value.join('/')
  return `/api/public/categories/${s.split('/').map(encodeURIComponent).join('/')}`
})

type CategoryPageData = {
  term: { id: string; slug: string; name: string } | null
  children: { id: string; slug: string; name: string }[]
  articles: { id: string; slug: string; title: string }[]
}

const { data, status, error } = await useFetch<CategoryPageData>(apiUrl, { watch: [apiUrl] })

watchEffect(() => {
  if (data.value?.term?.name) {
    useHead({ title: data.value.term.name })
  }
})

function childLink(slug: string) {
  const base = '/categories/' + segments.value.map(encodeURIComponent).join('/')
  return `${base}/${encodeURIComponent(slug)}`
}
</script>

<template>
  <UContainer class="py-10 space-y-8">
    <div v-if="status === 'pending'" class="text-muted">{{ t('common.loading') }}</div>
    <UAlert v-else-if="error" color="error" :title="t('wiki.category_not_found')" />

    <template v-else-if="data?.term">
      <div>
        <nav class="text-sm text-muted mb-2">
          <NuxtLink to="/categories" class="hover:text-primary">{{ t('layout.categories') }}</NuxtLink>
          <span v-for="(seg, i) in segments" :key="i" class="inline-flex items-center gap-1">
            <span class="mx-1">/</span>
            <NuxtLink
              class="hover:text-primary"
              :to="'/categories/' + segments.slice(0, i + 1).map(encodeURIComponent).join('/')"
            >
              {{ seg }}
            </NuxtLink>
          </span>
        </nav>
        <h1 class="text-3xl font-bold">{{ data.term.name }}</h1>
        <p class="text-muted text-sm mt-1">{{ data.term.slug }}</p>
      </div>

      <div v-if="data.children?.length" class="space-y-2">
        <h2 class="text-lg font-semibold">{{ t('wiki.subcategories_heading') }}</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <NuxtLink
            v-for="c in data.children"
            :key="c.id"
            :to="childLink(c.slug)"
            class="block rounded-lg border border-(--ui-border) p-4 hover:bg-(--ui-bg-elevated) transition"
          >
            <div class="font-medium">{{ c.name }}</div>
            <div class="text-xs text-muted mt-1">{{ c.slug }}</div>
          </NuxtLink>
        </div>
      </div>

      <div class="space-y-3">
        <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
          {{ t('wiki.articles_heading') }}
        </h2>
        <ul
          v-if="data.articles?.length"
          class="rounded-lg border border-(--ui-border) divide-y divide-(--ui-border) overflow-hidden bg-(--ui-bg)/50"
        >
          <li v-for="a in data.articles" :key="a.id" class="px-4 py-3 transition hover:bg-(--ui-bg-elevated)/60">
            <NuxtLink
              :to="`/${encodeURIComponent(a.slug)}`"
              class="font-medium text-primary hover:underline"
            >
              {{ a.title }}
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="text-muted text-sm">
          {{ t('wiki.no_articles_in_category') }}
        </p>
      </div>
    </template>
  </UContainer>
</template>
