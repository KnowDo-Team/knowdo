<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { t, locale } = useI18n()
const state = reactive({
  username: '',
  password: ''
})
const loading = ref(false)
const captchaVerifyParam = ref('')
const modal = useAppModal()
const captcha = useAliyunCaptcha()

const captchaEnabled = captcha.enabled
const captchaConfigured = captcha.configured
const captchaInitializing = captcha.initializing
const loginSceneId = captcha.loginSceneId
const captchaElementSelector = '#login-captcha-element'
const captchaButtonSelector = '#login-captcha-button'
const captchaLanguage = computed(() => locale.value === 'zh-CN' ? 'cn' : 'en')
const submitLoading = computed(() => loading.value || captchaInitializing.value)

function getResponseHeader(error: unknown, name: string) {
  if (!error || typeof error !== 'object') return null

  const e = error as { response?: { headers?: { get?: (headerName: string) => string | null } } }
  return e.response?.headers?.get?.(name) || null
}

function getLoginErrorMessage(error: unknown) {
  const verifyCode = getResponseHeader(error, 'x-captcha-verify-code')
  if (verifyCode && verifyCode !== 'T001') return t('login.captcha_failed')

  if (error && typeof error === 'object') {
    const e = error as {
      data?: { statusMessage?: unknown }
      message?: unknown
    }
    if (typeof e.data?.statusMessage === 'string' && e.data.statusMessage) return e.data.statusMessage
    if (typeof e.message === 'string' && e.message) return e.message
  }

  return t('login.invalid_credentials')
}

function clearCaptchaVerifyParam() {
  captchaVerifyParam.value = ''
}

function refreshCaptcha() {
  clearCaptchaVerifyParam()
  captcha.refresh()
}

async function initCaptcha(showError = false) {
  if (!captchaEnabled.value) return true

  if (!captchaConfigured.value) {
    if (showError) {
      await modal.error({
        title: t('login.failed'),
        description: t('login.captcha_config_error'),
        confirmLabel: t('common.confirm')
      })
    }
    return false
  }

  const ok = await captcha.init({
    sceneId: loginSceneId.value,
    element: captchaElementSelector,
    button: captchaButtonSelector,
    language: captchaLanguage.value,
    success: (param) => {
      captchaVerifyParam.value = param
    },
    fail: clearCaptchaVerifyParam,
    onError: clearCaptchaVerifyParam,
    onClose: clearCaptchaVerifyParam
  })

  if (!ok) {
    clearCaptchaVerifyParam()
    if (showError) {
      await modal.error({
        title: t('login.failed'),
        description: t('login.captcha_unavailable'),
        confirmLabel: t('common.confirm')
      })
    }
  }

  return ok
}

async function login(captchaParam?: string) {
  loading.value = true
  try {
    const headers: Record<string, string> = {}
    if (captchaEnabled.value) {
      if (!captchaParam) {
        throw new Error(t('login.captcha_required'))
      }
      headers['captcha-verify-param'] = captchaParam
    }

    const response = await $fetch.raw('/api/auth/login', {
      method: 'POST',
      headers,
      body: { username: state.username.trim(), password: state.password }
    })

    if (captchaEnabled.value) {
      const verifyCode = response.headers.get('x-captcha-verify-code')
      if (verifyCode && verifyCode !== 'T001') {
        await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
        throw new Error(t('login.captcha_failed'))
      }
    }

    await navigateTo('/admin', { replace: true })
  } catch (e: unknown) {
    if (captchaEnabled.value) refreshCaptcha()
    modal.error({
      title: t('login.failed'),
      description: getLoginErrorMessage(e),
      confirmLabel: t('common.confirm')
    })
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (loading.value) return

  if (!captchaEnabled.value) {
    await login()
    return
  }

  const ok = await initCaptcha(true)
  if (!ok) return

  if (!captchaVerifyParam.value) {
    await modal.error({
      title: t('login.failed'),
      description: t('login.captcha_required'),
      confirmLabel: t('common.confirm')
    })
    return
  }

  await login(captchaVerifyParam.value)
}

onMounted(() => {
  void initCaptcha()
})
</script>

<template>
  <div class="flex min-h-[calc(100svh-5rem)] items-center justify-center px-4 py-8">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-xl font-semibold">
          {{ t('login.title') }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('login.subtitle') }}
        </p>
      </template>
      <UForm
        :state="state"
        class="space-y-4"
        @submit="submit"
      >
        <UFormField
          :label="t('login.username')"
          name="username"
          required
        >
          <UInput
            v-model="state.username"
            class="w-full"
            autocomplete="username"
          />
        </UFormField>
        <UFormField
          :label="t('login.password')"
          name="password"
          required
        >
          <UInput
            v-model="state.password"
            class="w-full"
            type="password"
            autocomplete="current-password"
          />
        </UFormField>
        <div
          v-if="captchaEnabled"
          class="space-y-2"
        >
          <div id="login-captcha-element" />
          <button
            id="login-captcha-button"
            class="hidden"
            type="button"
            tabindex="-1"
            aria-hidden="true"
          />
        </div>
        <UButton
          type="submit"
          block
          :loading="submitLoading"
        >
          {{ t('login.sign_in') }}
        </UButton>
      </UForm>
    </UCard>
  </div>
</template>
