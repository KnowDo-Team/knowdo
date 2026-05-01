<script setup lang="ts">
import type { AppModalTone } from '~/composables/useAppModal'

const { state, close, onOpenChange } = useAppModal()

const iconName = computed(() => {
  const toneIcons: Record<AppModalTone, string> = {
    neutral: 'i-lucide-message-square',
    success: 'i-lucide-circle-check-big',
    warning: 'i-lucide-triangle-alert',
    error: 'i-lucide-octagon-alert'
  }

  return toneIcons[state.value.tone]
})

const iconClasses = computed(() => {
  const toneClasses: Record<AppModalTone, string> = {
    neutral: 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)',
    success: 'bg-green-500/12 text-green-500',
    warning: 'bg-amber-500/12 text-amber-500',
    error: 'bg-red-500/12 text-red-500'
  }

  return toneClasses[state.value.tone]
})
</script>

<template>
  <UModal
    :open="state.open"
    :dismissible="state.dismissible"
    :ui="{ content: 'sm:max-w-md', body: 'p-0', footer: 'p-0' }"
    @update:open="onOpenChange"
  >
    <template #content>
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            :class="iconClasses"
          >
            <UIcon
              :name="iconName"
              class="h-5 w-5"
            />
          </div>

          <div class="min-w-0 flex-1">
            <h3 class="text-base font-semibold text-(--ui-text-highlighted)">
              {{ state.title }}
            </h3>
            <p
              v-if="state.description"
              class="mt-2 text-sm leading-6 text-(--ui-text-muted)"
            >
              {{ state.description }}
            </p>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <UButton
            v-if="state.kind === 'confirm'"
            color="neutral"
            variant="ghost"
            @click="close(false)"
          >
            {{ state.cancelLabel }}
          </UButton>
          <UButton
            :color="state.tone === 'error' ? 'error' : 'neutral'"
            :variant="state.kind === 'alert' ? 'solid' : 'solid'"
            @click="close(true)"
          >
            {{ state.confirmLabel }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
