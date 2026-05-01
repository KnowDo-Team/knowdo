<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { t, locale, locales, setLocale } = useI18n()
const localePath = useLocalePath()
const { data: me, refresh: refreshMe } = useAuthMe()

function isWikiStaffRole(role: string | undefined) {
  return role === 'superadmin' || role === 'admin' || role === 'editor'
}

watchEffect(() => {
  if (me.value && (!me.value.user || !isWikiStaffRole(me.value.user.role))) {
    navigateTo(localePath('/'))
  }
})

const currentRoleLabel = computed(() => {
  const role = me.value?.user?.role as string | undefined
  if (role === 'superadmin') return t('auth.role_superadmin')
  if (role === 'admin') return t('auth.role_admin')
  if (role === 'editor') return t('auth.role_editor')
  return t('auth.guest')
})

const localeOptions = computed(() => {
  return (locales.value as { code: string, name?: string }[]).map(item => ({
    code: item.code,
    label: item.name || item.code
  }))
})

const localeItems = computed<DropdownMenuItem[][]>(() => {
  return [localeOptions.value.map(item => ({
    label: item.label,
    checked: locale.value === item.code,
    type: 'checkbox' as const,
    onSelect: () => setLocale(item.code as 'zh-CN' | 'en-US')
  }))]
})

const navItems = computed(() => [
  { label: t('admin.nav_overview'), icon: 'i-lucide-layout-dashboard', to: localePath('/admin') },
  { label: t('admin.nav_articles'), icon: 'i-lucide-file-text', to: localePath('/admin/articles') },
  { label: t('admin.nav_categories'), icon: 'i-lucide-folder-tree', to: localePath('/admin/categories') }
])

const bottomNavItems = computed(() => [
  {
    label: t('admin.back_to_home'),
    icon: 'i-lucide-arrow-left',
    to: localePath('/')
  }
])

const userMenuItems = computed<DropdownMenuItem[][]>(() => {
  return [
    [
      {
        label: me.value?.user?.username || '',
        slot: 'account',
        disabled: true
      }
    ],
    [
      {
        label: t('admin.back_to_home'),
        icon: 'i-lucide-arrow-left',
        to: localePath('/')
      }
    ],
    [
      {
        label: t('auth.logout'),
        icon: 'i-lucide-log-out',
        color: 'error' as const,
        onSelect: () => {
          isLogoutModalOpen.value = true
        }
      }
    ]
  ]
})

const isLogoutModalOpen = ref(false)
const isLoggingOut = ref(false)

async function confirmLogout() {
  isLoggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await refreshMe()
    isLogoutModalOpen.value = false
    await navigateTo(localePath('/login'), { replace: true })
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-(--ui-bg)">
    <UHeader :ui="{ container: 'max-w-full' }" :toggle="false">
      <template #left>
        <div class="flex items-center gap-2">
          <NuxtLink :to="localePath('/admin')" class="font-semibold text-lg text-primary">
            {{ t('admin.panel_title') }}
          </NuxtLink>
        </div>
      </template>

      <template #right>
        <div class="flex items-center gap-2">
          <UDropdownMenu :items="localeItems">
            <UButton icon="i-lucide-languages" color="neutral" variant="ghost" />
          </UDropdownMenu>
          <UColorModeButton />
          <div class="w-px h-4 bg-(--ui-border)" />
          <UDropdownMenu
            :items="userMenuItems"
            :content="{ align: 'end', sideOffset: 8 }"
            :ui="{ item: 'cursor-pointer' }"
          >
            <UButton variant="ghost" color="neutral" size="xs" class="p-0 rounded-full">
              <UAvatar :alt="me?.user?.username || 'G'" size="sm" />
            </UButton>

            <template #account>
              <div class="text-left flex items-center gap-2 p-1">
                <UAvatar :alt="me?.user?.username || 'G'" size="md" />
                <div class="truncate">
                  <p class="font-medium text-(--ui-text-highlighted) truncate">
                    {{ me?.user?.username || t('auth.guest') }}
                  </p>
                  <p class="text-xs text-(--ui-text-muted) truncate">
                    {{ currentRoleLabel }}
                  </p>
                </div>
              </div>
            </template>
          </UDropdownMenu>
        </div>
      </template>
    </UHeader>

    <div class="flex flex-1 min-h-0">
      <aside
        class="hidden md:flex w-56 shrink-0 border-r border-(--ui-border) bg-(--ui-bg-elevated)/50 p-3 flex-col min-h-0"
      >
        <div class="flex-1 min-h-0 overflow-y-auto">
          <UNavigationMenu
            orientation="vertical"
            :items="navItems"
            class="w-full"
            tooltip
            popover
            :ui="{
              link: ['cursor-pointer']
            }"
          />
        </div>

        <div class="mt-auto shrink-0 pt-4">
          <UNavigationMenu
            orientation="vertical"
            :items="bottomNavItems"
            class="w-full"
            tooltip
            popover
            :ui="{
              link: ['cursor-pointer']
            }"
          />
        </div>
      </aside>
      <UMain class="flex-1 min-w-0 p-4 md:p-8">
        <slot />
      </UMain>
    </div>

    <UModal v-model:open="isLogoutModalOpen" :ui="{ content: 'sm:max-w-md' }">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <UIcon name="i-lucide-triangle-alert" class="w-6 h-6 text-red-500" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold mb-1">{{ t('auth.logout') }}</h3>
              <p class="text-sm text-muted">{{ t('auth.logout_confirm') }}</p>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isLogoutModalOpen = false">
              {{ t('common.cancel') }}
            </UButton>
            <UButton color="error" :loading="isLoggingOut" @click="confirmLogout">
              {{ t('common.confirm') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
