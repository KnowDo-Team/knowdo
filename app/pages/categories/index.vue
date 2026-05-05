<script setup lang="ts">
const { t } = useI18n()

type CategoryOverviewData = {
  term: null
  terms: {
    id: string
    slug: string
    name: string
    parentId: string | null
  }[]
  children: {
    id: string
    slug: string
    name: string
  }[]
  articles: {
    id: string
    slug: string
    title: string
  }[]
}

const { data, status, error } = await useFetch<CategoryOverviewData>('/api/public/categories')

useHead(() => ({ title: t('layout.categories') }))
</script>

<template>
  <CategoryOverviewSection
    :data="data"
    :status="status"
    :has-error="!!error"
  />
</template>
