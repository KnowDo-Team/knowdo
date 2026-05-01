<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { nextTick } from 'vue'

const { t, locale, locales, setLocale } = useI18n()
const { data: me, refresh: refreshMe } = useAuthMe()

const isLogoutModalOpen = ref(false)
const isLoggingOut = ref(false)

const localeOptions = computed(() => {
  return (locales.value as { code: string, name?: string }[]).map(item => ({
    code: item.code,
    label: item.name || item.code
  }))
})

const localeItems = computed<DropdownMenuItem[][]>(() => {
  return [localeOptions.value.map((item) => ({
    label: item.label,
    checked: locale.value === item.code,
    type: 'checkbox',
    onSelect: () => setLocale(item.code as 'zh-CN' | 'en-US')
  }))]
})

const languageAriaLabel = computed(() => {
  const current = localeOptions.value.find(item => item.code === locale.value)
  return current?.label ? `Language: ${current.label}` : 'Language'
})

const currentRoleLabel = computed(() => {
  const role = me.value?.user?.role as string | undefined
  if (role === 'superadmin') return t('auth.role_superadmin')
  if (role === 'admin') return t('auth.role_admin')
  if (role === 'editor') return t('auth.role_editor')
  return t('auth.guest')
})

const isStaff = computed(() => {
  const r = me.value?.user?.role
  return r === 'superadmin' || r === 'admin' || r === 'editor'
})

const userMenuItems = computed<DropdownMenuItem[][]>(() => {
  if (me.value?.user) {
    return [
      [
        {
          label: me.value.user.username,
          slot: 'account',
          disabled: true
        }
      ],
      [
        {
          label: t('layout.admin'),
          icon: 'i-lucide-shield-check',
          to: '/admin'
        }
      ].filter(() => isStaff.value),
      [
        {
          label: t('auth.logout'),
          icon: 'i-lucide-log-out',
          color: 'error' as const,
          onSelect: openLogoutConfirm
        }
      ]
    ]
  }

  return [
    [
      {
        label: t('auth.guest'),
        slot: 'account',
        disabled: true
      }
    ],
    [
      {
        label: t('layout.login'),
        icon: 'i-lucide-log-in',
        to: '/login'
      }
    ]
  ]
})

function openLogoutConfirm() {
  nextTick(() => {
    isLogoutModalOpen.value = true
  })
}

async function confirmLogout() {
  isLoggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await refreshMe()
    isLogoutModalOpen.value = false
    await navigateTo('/login', { replace: true })
  } finally {
    isLoggingOut.value = false
  }
}

const year = new Date().getFullYear()

</script>

<template>
  <div>
    <UHeader :ui="{ container: 'max-w-full' }" :toggle="false">
      <template #left>
        <NuxtLink to="/" class="font-semibold text-lg text-primary">
          {{ t('layout.brand') }}
        </NuxtLink>
        <nav class="hidden sm:flex items-center gap-4 ml-6 text-sm">
          <NuxtLink to="/categories" class="text-muted hover:text-primary">
            {{ t('layout.categories') }}
          </NuxtLink>
        </nav>
      </template>

      <template #right>
        <div class="flex items-center gap-2">
          <UDropdownMenu :items="localeItems">
            <UButton
              icon="i-lucide-languages"
              :aria-label="languageAriaLabel"
              color="neutral"
              variant="ghost"
            />
          </UDropdownMenu>
          <UColorModeButton />
          <div class="w-px h-4 bg-(--ui-border)" />
          <UDropdownMenu
            :items="userMenuItems"
            :content="{ align: 'end', sideOffset: 8 }"
            :ui="{ item: 'cursor-pointer' }"
          >
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              class="p-0 rounded-full"
            >
              <UAvatar
                :alt="me?.user?.username || 'G'"
                size="sm"
              />
            </UButton>

            <template #account>
              <div class="text-left flex items-center gap-2 p-1">
                <UAvatar
                  :alt="me?.user?.username || 'G'"
                  size="md"
                />
                <div class="truncate">
                  <p class="font-medium text-(--ui-text-highlighted) truncate">
                    {{ me?.user?.username || t('auth.guest') }}
                  </p>
                  <p class="text-xs text-(--ui-text-muted) truncate">
                    {{ me?.user ? currentRoleLabel : t('auth.guest') }}
                  </p>
                </div>
              </div>
            </template>
          </UDropdownMenu>
        </div>
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>

    <USeparator icon="i-simple-icons-nuxtdotjs" />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">{{ t('layout.footer', { year }) }}</p>
      </template>
    </UFooter>

    <UModal
      v-model:open="isLogoutModalOpen"
      :ui="{ overlay: 'z-[60]', content: 'z-[60] sm:max-w-md' }"
    >
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <UIcon
                name="i-lucide-triangle-alert"
                class="w-6 h-6 text-red-500"
              />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold leading-6 text-neutral-900 dark:text-white mb-1">
                {{ t('auth.logout') }}
              </h3>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">
                {{ t('auth.logout_confirm') }}
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              @click="isLogoutModalOpen = false"
            >
              {{ t('common.cancel') }}
            </UButton>
            <UButton
              color="error"
              :loading="isLoggingOut"
              @click="confirmLogout"
            >
              {{ t('common.confirm') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
