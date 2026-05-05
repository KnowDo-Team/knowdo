<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

type ArticleResponse = {
  article: {
    id: string
    slug: string
    title: string
    content: string | object
    visibility: string
    status: string
    updatedAt: string
  }
}

const { data, error, status } = await useFetch<ArticleResponse>(
  () => `/api/public/articles/${encodeURIComponent(slug.value)}`,
  { watch: [slug] }
)

watchEffect(() => {
  if (data.value?.article) {
    useHead({ title: data.value.article.title })
  }
})
</script>

<template>
  <UContainer class="py-10">
    <div
      v-if="status === 'pending'"
      class="text-muted"
    >
      Loading…
    </div>
    <UAlert
      v-else-if="error"
      color="error"
      title="Not found"
      description="This page does not exist or is not public."
    />
    <article
      v-else-if="data?.article"
      class="prose dark:prose-invert max-w-none"
    >
      <h1 class="text-3xl font-bold mb-6">
        {{ data.article.title }}
      </h1>
      <EditorRichTextViewer :content="data.article.content" />
    </article>
  </UContainer>
</template>
