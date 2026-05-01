<script setup lang="ts">
definePageMeta({
  layout: 'admin'
})

const { t } = useI18n()
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">{{ t('admin.overview_title') }}</h1>
    <p class="text-muted">{{ t('admin.overview_desc') }}</p>
    <div class="flex flex-wrap gap-3">
      <UButton to="/admin/articles" icon="i-lucide-file-text">{{ t('admin.nav_articles') }}</UButton>
      <UButton to="/admin/categories" icon="i-lucide-folder-tree" color="neutral" variant="outline">
        {{ t('admin.nav_categories') }}
      </UButton>
    </div>
  </div>
</template>
