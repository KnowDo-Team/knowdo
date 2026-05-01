<script setup lang="ts">
const { t } = useI18n()
const { data, status, error } = await useFetch('/api/public/categories')

useHead(() => ({ title: t('layout.categories') }))
</script>

<template>
  <CategoryOverviewSection
    :data="data"
    :status="status"
    :has-error="!!error"
  />
</template>
