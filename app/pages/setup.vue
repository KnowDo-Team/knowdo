<script setup lang="ts">
definePageMeta({ layout: 'empty' })

const { t } = useI18n()
const state = reactive({
  username: '',
  password: ''
})
const loading = ref(false)
const modal = useAppModal()

async function submit() {
  loading.value = true
  try {
    await $fetch('/api/setup', {
      method: 'POST',
      body: { username: state.username.trim(), password: state.password }
    })
    await modal.success({
      title: t('setup.account_created'),
      confirmLabel: t('common.confirm')
    })
    await navigateTo('/login', { replace: true })
  } catch (e: any) {
    modal.error({
      title: t('common.error'),
      description: e?.data?.statusMessage || e?.message || t('setup.request_failed'),
      confirmLabel: t('common.confirm')
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-(--ui-bg) p-4 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      <div class="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
    </div>

    <div class="relative z-10 w-full flex justify-center p-2">
      <UCard class="w-full max-w-md border border-(--ui-border) shadow-xl bg-background/60 backdrop-blur-xl ring-1 ring-black/[0.04] dark:ring-white/10 overflow-visible">
        <template #header>
          <h1 class="text-xl font-semibold">{{ t('setup.title') }}</h1>
          <p class="text-sm text-muted">{{ t('setup.subtitle') }}</p>
        </template>
        <UForm :state="state" class="space-y-4" @submit="submit">
          <UFormField :label="t('setup.username')" name="username" required>
            <UInput v-model="state.username" class="w-full" autocomplete="username" />
          </UFormField>
          <UFormField :label="t('setup.password')" name="password" required>
            <UInput v-model="state.password" class="w-full" type="password" autocomplete="new-password" />
          </UFormField>
          <UButton type="submit" block :loading="loading">{{ t('setup.create_account') }}</UButton>
        </UForm>
      </UCard>
    </div>
  </div>
</template>
