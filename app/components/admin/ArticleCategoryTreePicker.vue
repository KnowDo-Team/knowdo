<script setup lang="ts">
type TermRow = {
  id: string
  name: string
  slug: string
  parentId: string | null
}

type CategoryTreeItem = {
  label: string
  value: string
  children?: CategoryTreeItem[]
}

const props = defineProps<{
  modelValue: string[]
  terms: TermRow[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const { t } = useI18n()

const categoryPickerOpen = ref(false)
const pendingCategoryIds = ref<string[]>([])
const expandedCategoryTreeKeys = ref<string[]>([])
const categoryChevronTogglePending = ref(false)

const categoryNameById = computed(() => {
  const map = new Map<string, string>()
  for (const term of props.terms) {
    map.set(term.id, term.name)
  }
  return map
})

const categoryTreeItems = computed<CategoryTreeItem[]>(() => {
  const childrenByParent = new Map<string | null, TermRow[]>()
  for (const term of props.terms) {
    const parentId = term.parentId ?? null
    const list = childrenByParent.get(parentId) ?? []
    list.push(term)
    childrenByParent.set(parentId, list)
  }

  const build = (parentId: string | null): CategoryTreeItem[] => {
    const children = (childrenByParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))

    return children.map((child) => {
      const nodes = build(child.id)
      return {
        label: `${child.name} (${child.slug})`,
        value: child.id,
        ...(nodes.length ? { children: nodes } : {})
      }
    })
  }

  return build(null)
})

const defaultExpandedCategoryTreeKeys = computed(() => {
  const keys: string[] = []

  const walk = (items: CategoryTreeItem[]) => {
    for (const item of items) {
      if (item.children?.length) {
        keys.push(String(item.value))
        walk(item.children)
      }
    }
  }

  walk(categoryTreeItems.value)
  return keys
})

const pendingCategoryIdSet = computed(() => new Set(pendingCategoryIds.value))

const categoryDisplayLabel = computed(() => {
  if (props.modelValue.length === 0) return t('admin.select_categories_placeholder')
  return props.modelValue
    .map(id => categoryNameById.value.get(id))
    .filter((name): name is string => Boolean(name))
    .join(', ')
})

function onCategoryTreeExpandedUpdate(keys: string[]) {
  if (!categoryChevronTogglePending.value) return
  expandedCategoryTreeKeys.value = keys
  categoryChevronTogglePending.value = false
}

function toggleCategoryTreeNode(handleToggle: () => void) {
  categoryChevronTogglePending.value = true
  handleToggle()
}

function togglePendingCategorySelection(item: CategoryTreeItem) {
  const id = String(item.value)
  const next = new Set(pendingCategoryIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  pendingCategoryIds.value = [...next]
}

function applyCategoryTreeSelect() {
  emit('update:modelValue', [...pendingCategoryIds.value])
  categoryPickerOpen.value = false
}

watch(categoryPickerOpen, (open) => {
  if (open) {
    pendingCategoryIds.value = [...props.modelValue]
    expandedCategoryTreeKeys.value = [...defaultExpandedCategoryTreeKeys.value]
    return
  }
  categoryChevronTogglePending.value = false
})
</script>

<template>
  <UPopover v-model:open="categoryPickerOpen">
    <UButton
      color="neutral"
      variant="outline"
      class="w-full justify-between"
      trailing-icon="i-lucide-chevron-down"
    >
      <span class="truncate">{{ categoryDisplayLabel }}</span>
    </UButton>
    <template #content>
      <div class="w-[var(--reka-popper-anchor-width)] space-y-2 p-2">
        <div class="max-h-72 overflow-y-auto">
          <UTree
            :expanded="expandedCategoryTreeKeys"
            :items="categoryTreeItems"
            :get-key="item => String(item.value)"
            @update:expanded="onCategoryTreeExpandedUpdate"
          >
            <template #item-wrapper="{ item, expanded, handleToggle }">
              <div
                :class="[
                  'relative group w-full flex items-center text-sm select-none before:absolute before:inset-y-px before:inset-x-0 before:z-[-1] before:rounded-md',
                  'focus:outline-none focus-visible:outline-none focus-visible:before:ring-inset focus-visible:before:ring-2 focus-visible:before:ring-primary',
                  'px-2.5 py-1.5 gap-1.5 transition-colors before:transition-colors',
                  pendingCategoryIdSet.has(item.value)
                    ? 'before:bg-elevated text-primary'
                    : 'hover:text-highlighted hover:before:bg-elevated/50'
                ]"
                @click="togglePendingCategorySelection(item)"
              >
                <UIcon
                  :name="item.children?.length ? (expanded ? 'i-lucide-folder-open' : 'i-lucide-folder') : 'i-lucide-folder'"
                  class="size-5 shrink-0 relative"
                />
                <span class="truncate">{{ item.label }}</span>
                <span
                  v-if="item.children?.length"
                  class="ms-auto inline-flex gap-1.5 items-center"
                >
                  <button
                    type="button"
                    class="inline-flex items-center justify-center text-(--ui-text-toned) hover:text-highlighted"
                    @click.stop="toggleCategoryTreeNode(handleToggle)"
                  >
                    <UIcon
                      name="i-lucide-chevron-down"
                      :class="[
                        'size-5 shrink-0 transform transition-transform duration-200',
                        expanded ? 'rotate-180' : ''
                      ]"
                    />
                  </button>
                </span>
              </div>
            </template>
          </UTree>
        </div>
        <div class="flex justify-end gap-2 border-t border-(--ui-border) pt-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            @click="categoryPickerOpen = false"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            color="primary"
            size="sm"
            @click="applyCategoryTreeSelect"
          >
            {{ t('common.confirm') }}
          </UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>
