<script setup lang="ts">
definePageMeta({ layout: 'default' })

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
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: state.username.trim(), password: state.password }
    })
    await navigateTo('/admin', { replace: true })
  } catch (e: any) {
    modal.error({
      title: t('login.failed'),
      description: e?.data?.statusMessage || e?.message || t('login.invalid_credentials'),
      confirmLabel: t('common.confirm')
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-[calc(100svh-5rem)] items-center justify-center px-4 py-8">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-xl font-semibold">{{ t('login.title') }}</h1>
        <p class="text-sm text-muted">{{ t('login.subtitle') }}</p>
      </template>
      <UForm :state="state" class="space-y-4" @submit="submit">
        <UFormField :label="t('login.username')" name="username" required>
          <UInput v-model="state.username" class="w-full" autocomplete="username" />
        </UFormField>
        <UFormField :label="t('login.password')" name="password" required>
          <UInput v-model="state.password" class="w-full" type="password" autocomplete="current-password" />
        </UFormField>
        <UButton type="submit" block :loading="loading">{{ t('login.sign_in') }}</UButton>
      </UForm>
    </UCard>
  </div>
</template>
