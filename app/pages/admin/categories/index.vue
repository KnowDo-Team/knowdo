<script setup lang="ts">
definePageMeta({
  layout: 'admin'
})

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

const { t } = useI18n()
const modal = useAppModal()
const toast = useToast()
const { data, refresh } = await useFetch('/api/admin/terms', { lazy: true })

const terms = computed(() => (data.value?.terms ?? []) as TermRow[])
const nameFilter = ref('')
const selectedCategoryId = ref<string | null>(null)
const expandedCategoryTreeKeys = ref<string[]>([])
const categoryChevronTogglePending = ref(false)

const showCreate = ref(false)
const creating = ref(false)
const newSlug = ref('')
const newName = ref('')
const newParentId = ref<string>('')
const createParentPickerOpen = ref(false)
const pendingCreateParentId = ref<string>('')
const expandedCreateParentTreeKeys = ref<string[]>([])
const createParentChevronTogglePending = ref(false)

const showEdit = ref(false)
const editing = ref(false)
const editSlug = ref('')
const editName = ref('')
const editParentId = ref<string>('')
const editParentPickerOpen = ref(false)
const pendingEditParentId = ref<string>('')
const expandedEditParentTreeKeys = ref<string[]>([])
const editParentChevronTogglePending = ref(false)

const totalLabel = computed(() => t('admin.categories_total', { count: visibleCategoryCount.value }))

function getErrorMessage(error: unknown, fallback = '') {
  if (error && typeof error === 'object') {
    const maybeData = 'data' in error ? (error as { data?: { statusMessage?: string } }).data : undefined
    const maybeMessage = 'message' in error ? (error as { message?: string }).message : ''
    return maybeData?.statusMessage || maybeMessage || fallback
  }
  return fallback
}

const categoryById = computed(() => {
  const map = new Map<string, TermRow>()
  for (const term of terms.value) {
    map.set(term.id, term)
  }
  return map
})

const selectedCategory = computed(() => {
  if (!selectedCategoryId.value) return null
  return categoryById.value.get(selectedCategoryId.value) ?? null
})

const childCountById = computed(() => {
  const map = new Map<string, number>()
  for (const term of terms.value) {
    if (!term.parentId) continue
    map.set(term.parentId, (map.get(term.parentId) ?? 0) + 1)
  }
  return map
})

const categoryTreeItems = computed<CategoryTreeItem[]>(() => {
  const byParent = new Map<string | null, TermRow[]>()
  for (const term of terms.value) {
    const parentId = term.parentId ?? null
    const list = byParent.get(parentId) ?? []
    list.push(term)
    byParent.set(parentId, list)
  }

  const filterKeyword = nameFilter.value.trim().toLowerCase()

  const walk = (parentId: string | null): CategoryTreeItem[] => {
    const children = (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))

    const nodes: CategoryTreeItem[] = []
    for (const child of children) {
      const childNodes = walk(child.id)
      const matched = !filterKeyword
        || child.name.toLowerCase().includes(filterKeyword)
        || child.slug.toLowerCase().includes(filterKeyword)

      if (!matched && childNodes.length === 0) continue

      nodes.push({
        label: child.name,
        value: child.id,
        ...(childNodes.length ? { children: childNodes } : {})
      })
    }

    return nodes
  }

  return walk(null)
})

function buildTreeItems(sourceTerms: TermRow[], parentId: string | null): CategoryTreeItem[] {
  return sourceTerms
    .filter(term => (term.parentId ?? null) === parentId)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((term) => {
      const children = buildTreeItems(sourceTerms, term.id)
      return {
        label: term.name,
        value: term.id,
        ...(children.length ? { children } : {})
      }
    })
}

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

const visibleCategoryCount = computed(() => {
  const walkCount = (items: CategoryTreeItem[]): number => {
    let count = 0
    for (const item of items) {
      count += 1
      if (item.children?.length) count += walkCount(item.children)
    }
    return count
  }

  return walkCount(categoryTreeItems.value)
})

const createParentTreeItems = computed<CategoryTreeItem[]>(() => {
  return [
    { value: '', label: t('admin.categories_parent_root') },
    ...buildTreeItems(terms.value, null)
  ]
})

const defaultExpandedCreateParentTreeKeys = computed(() => {
  const keys: string[] = []
  const walk = (items: CategoryTreeItem[]) => {
    for (const item of items) {
      if (item.children?.length) {
        keys.push(String(item.value))
        walk(item.children)
      }
    }
  }
  walk(createParentTreeItems.value)
  return keys
})

const editParentTreeItems = computed<CategoryTreeItem[]>(() => {
  const currentId = selectedCategory.value?.id
  if (!currentId) {
    return [{ value: '', label: t('admin.categories_parent_root') }]
  }

  const blocked = new Set<string>([currentId])
  const childrenByParent = new Map<string | null, TermRow[]>()
  for (const term of terms.value) {
    const key = term.parentId ?? null
    const list = childrenByParent.get(key) ?? []
    list.push(term)
    childrenByParent.set(key, list)
  }

  const markDescendants = (parentId: string) => {
    const children = childrenByParent.get(parentId) ?? []
    for (const child of children) {
      if (blocked.has(child.id)) continue
      blocked.add(child.id)
      markDescendants(child.id)
    }
  }

  markDescendants(currentId)

  return [
    { value: '', label: t('admin.categories_parent_root') },
    ...buildTreeItems(terms.value.filter(term => !blocked.has(term.id)), null)
  ]
})

const defaultExpandedEditParentTreeKeys = computed(() => {
  const keys: string[] = []
  const walk = (items: CategoryTreeItem[]) => {
    for (const item of items) {
      if (item.children?.length) {
        keys.push(String(item.value))
        walk(item.children)
      }
    }
  }
  walk(editParentTreeItems.value)
  return keys
})

const createParentDisplayLabel = computed(() => {
  if (!newParentId.value) return t('admin.categories_parent_root')
  return categoryById.value.get(newParentId.value)?.name ?? t('admin.categories_parent_root')
})

const editParentDisplayLabel = computed(() => {
  if (!editParentId.value) return t('admin.categories_parent_root')

  const walk = (items: CategoryTreeItem[]): string | null => {
    for (const item of items) {
      if (item.value === editParentId.value) return item.label
      if (item.children?.length) {
        const matched = walk(item.children)
        if (matched) return matched
      }
    }
    return null
  }

  return walk(editParentTreeItems.value)
    || categoryById.value.get(editParentId.value)?.name
    || t('admin.categories_parent_root')
})

watch(categoryTreeItems, () => {
  expandedCategoryTreeKeys.value = [...defaultExpandedCategoryTreeKeys.value]

  if (!selectedCategoryId.value && terms.value.length) {
    selectedCategoryId.value = terms.value[0]?.id ?? null
  }

  if (selectedCategoryId.value && !categoryById.value.has(selectedCategoryId.value)) {
    selectedCategoryId.value = terms.value[0]?.id ?? null
  }
}, { immediate: true })

watch(createParentPickerOpen, (open) => {
  if (open) {
    pendingCreateParentId.value = newParentId.value
    expandedCreateParentTreeKeys.value = [...defaultExpandedCreateParentTreeKeys.value]
    return
  }
  createParentChevronTogglePending.value = false
})

watch(editParentPickerOpen, (open) => {
  if (open) {
    pendingEditParentId.value = editParentId.value
    expandedEditParentTreeKeys.value = [...defaultExpandedEditParentTreeKeys.value]
    return
  }
  editParentChevronTogglePending.value = false
})

function onTreeSelect(item: unknown) {
  if (!item || typeof item !== 'object' || !('value' in item)) return
  const value = String((item as { value: string }).value)
  if (value) selectedCategoryId.value = value
}

function onCategoryTreeExpandedUpdate(keys: string[]) {
  if (!categoryChevronTogglePending.value) return
  expandedCategoryTreeKeys.value = keys
  categoryChevronTogglePending.value = false
}

function toggleCategoryTreeNode(handleToggle: () => void) {
  categoryChevronTogglePending.value = true
  handleToggle()
}

function onCreateParentTreeSelect(item: unknown) {
  if (!item || typeof item !== 'object' || !('value' in item)) return
  pendingCreateParentId.value = String((item as { value: string }).value ?? '')
}

function onCreateParentTreeExpandedUpdate(keys: string[]) {
  if (!createParentChevronTogglePending.value) return
  expandedCreateParentTreeKeys.value = keys
  createParentChevronTogglePending.value = false
}

function toggleCreateParentTreeNode(handleToggle: () => void) {
  createParentChevronTogglePending.value = true
  handleToggle()
}

function applyCreateParentTreeSelect() {
  newParentId.value = pendingCreateParentId.value
  createParentPickerOpen.value = false
}

function onEditParentTreeSelect(item: unknown) {
  if (!item || typeof item !== 'object' || !('value' in item)) return
  pendingEditParentId.value = String((item as { value: string }).value ?? '')
}

function onEditParentTreeExpandedUpdate(keys: string[]) {
  if (!editParentChevronTogglePending.value) return
  expandedEditParentTreeKeys.value = keys
  editParentChevronTogglePending.value = false
}

function toggleEditParentTreeNode(handleToggle: () => void) {
  editParentChevronTogglePending.value = true
  handleToggle()
}

function applyEditParentTreeSelect() {
  editParentId.value = pendingEditParentId.value
  editParentPickerOpen.value = false
}

async function createTerm() {
  creating.value = true
  try {
    await $fetch('/api/admin/terms', {
      method: 'POST',
      body: {
        slug: newSlug.value.trim(),
        name: newName.value.trim(),
        parentId: newParentId.value || null
      }
    })

    showCreate.value = false
    newSlug.value = ''
    newName.value = ''
    newParentId.value = ''
    pendingCreateParentId.value = ''
    await refresh()

    toast.add({
      title: t('common.created'),
      color: 'success'
    })
  } catch (e: unknown) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(e),
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}

function openEdit() {
  if (!selectedCategory.value) return
  editSlug.value = selectedCategory.value.slug
  editName.value = selectedCategory.value.name
  editParentId.value = selectedCategory.value.parentId ?? ''
  pendingEditParentId.value = editParentId.value
  showEdit.value = true
}

async function updateTerm() {
  if (!selectedCategory.value) return
  editing.value = true
  try {
    await $fetch(`/api/admin/terms/${selectedCategory.value.id}`, {
      method: 'PATCH',
      body: {
        slug: editSlug.value.trim(),
        name: editName.value.trim(),
        parentId: editParentId.value || null
      }
    })

    showEdit.value = false
    await refresh()

    toast.add({
      title: t('common.saved'),
      color: 'success'
    })
  } catch (e: unknown) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(e, t('admin.save_failed')),
      color: 'error'
    })
  } finally {
    editing.value = false
  }
}

async function deleteTerm(id: string) {
  const confirmed = await modal.confirm({
    tone: 'error',
    title: t('common.confirm'),
    description: t('admin.categories_delete_confirm'),
    confirmLabel: t('common.delete'),
    cancelLabel: t('common.cancel')
  })
  if (!confirmed) return

  try {
    await $fetch(`/api/admin/terms/${id}`, { method: 'DELETE' })
    await refresh()

    toast.add({
      title: t('common.deleted'),
      color: 'success'
    })
  } catch (e: unknown) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(e),
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-3xl font-bold tracking-tight">
          {{ t('admin.categories_title') }}
        </h2>
        <p class="text-(--ui-text-muted)">
          {{ t('admin.categories_subtitle') }}
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-lucide-plus"
        @click="showCreate = true"
      >
        {{ t('admin.categories_new') }}
      </UButton>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-1.5 pt-2">
      <UInput
        v-model="nameFilter"
        class="max-w-sm"
        icon="i-lucide-search"
        :placeholder="t('admin.categories_col_category')"
      />
      <p class="text-xs text-(--ui-text-muted)">
        {{ totalLabel }}
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <UCard :ui="{ body: 'p-2 sm:p-2' }">
        <template #header>
          <div class="text-sm font-semibold">
            {{ t('admin.categories_title') }}
          </div>
        </template>

        <UEmpty
          v-if="visibleCategoryCount === 0"
          :title="t('admin.categories_empty')"
        />

        <UTree
          v-else
          :expanded="expandedCategoryTreeKeys"
          :items="categoryTreeItems"
          :get-key="item => String(item.value)"
          @update:model-value="onTreeSelect"
          @update:expanded="onCategoryTreeExpandedUpdate"
        >
          <template #item-wrapper="{ item, expanded, handleToggle }">
            <div
              :class="[
                'relative group w-full flex items-center text-sm select-none before:absolute before:inset-y-px before:inset-x-0 before:z-[-1] before:rounded-md',
                'focus:outline-none focus-visible:outline-none focus-visible:before:ring-inset focus-visible:before:ring-2 focus-visible:before:ring-primary',
                'px-2.5 py-1.5 gap-1.5 transition-colors before:transition-colors',
                selectedCategoryId === item.value
                  ? 'before:bg-elevated text-primary'
                  : 'hover:text-highlighted hover:before:bg-elevated/50'
              ]"
              @click="onTreeSelect(item)"
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
      </UCard>

      <UCard>
        <template #header>
          <div class="text-sm font-semibold">
            {{ t('admin.categories_actions_title') }}
          </div>
        </template>

        <UEmpty
          v-if="!selectedCategory"
          :title="t('admin.categories_empty_selection_title')"
          :description="t('admin.categories_empty_selection_description')"
        />

        <div
          v-else
          class="space-y-4"
        >
          <div>
            <div class="text-base font-semibold text-(--ui-text-highlighted)">
              {{ selectedCategory.name }}
            </div>
            <div class="font-mono text-xs text-(--ui-text-muted)">
              {{ selectedCategory.slug }}
            </div>
          </div>

          <div class="text-sm text-(--ui-text-muted)">
            {{ t('admin.categories_parent_meta') }}:
            {{ selectedCategory.parentId ? (categoryById.get(selectedCategory.parentId)?.name || selectedCategory.parentId) : t('admin.categories_parent_root') }}
          </div>
          <div class="text-sm text-(--ui-text-muted)">
            {{ t('admin.categories_child_count') }}: {{ childCountById.get(selectedCategory.id) ?? 0 }}
          </div>

          <div class="flex flex-wrap gap-1">
            <span class="rounded border border-(--ui-border) bg-(--ui-bg-elevated) px-2 py-0.5 text-xs">
              {{ `/${selectedCategory.slug}` }}
            </span>
          </div>

          <div class="flex justify-end gap-2 border-t border-(--ui-border) pt-3">
            <UButton
              color="neutral"
              variant="outline"
              @click="openEdit"
            >
              {{ t('admin.categories_action_edit') }}
            </UButton>
            <UButton
              color="error"
              variant="outline"
              @click="deleteTerm(selectedCategory.id)"
            >
              {{ t('admin.categories_action_delete') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <UModal v-model:open="showCreate">
      <template #content>
        <div class="p-6 space-y-4">
          <h2 class="text-lg font-semibold">
            {{ t('admin.categories_modal_new_title') }}
          </h2>
          <UFormField :label="t('admin.field_parent')">
            <UPopover v-model:open="createParentPickerOpen">
              <UButton
                color="neutral"
                variant="outline"
                class="w-full justify-between"
                trailing-icon="i-lucide-chevron-down"
              >
                {{ createParentDisplayLabel }}
              </UButton>
              <template #content>
                <div class="w-[var(--reka-popper-anchor-width)] space-y-2 p-2">
                  <div class="max-h-72 overflow-y-auto">
                    <UTree
                      :expanded="expandedCreateParentTreeKeys"
                      :items="createParentTreeItems"
                      :get-key="item => String(item.value)"
                      @update:model-value="onCreateParentTreeSelect"
                      @update:expanded="onCreateParentTreeExpandedUpdate"
                    >
                      <template #item-wrapper="{ item, expanded, handleToggle }">
                        <div
                          :class="[
                            'relative group w-full flex items-center text-sm select-none before:absolute before:inset-y-px before:inset-x-0 before:z-[-1] before:rounded-md',
                            'focus:outline-none focus-visible:outline-none focus-visible:before:ring-inset focus-visible:before:ring-2 focus-visible:before:ring-primary',
                            'px-2.5 py-1.5 gap-1.5 transition-colors before:transition-colors',
                            pendingCreateParentId === item.value
                              ? 'before:bg-elevated text-primary'
                              : 'hover:text-highlighted hover:before:bg-elevated/50'
                          ]"
                          @click="onCreateParentTreeSelect(item)"
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
                              @click.stop="toggleCreateParentTreeNode(handleToggle)"
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
                      @click="createParentPickerOpen = false"
                    >
                      {{ t('common.cancel') }}
                    </UButton>
                    <UButton
                      color="primary"
                      size="sm"
                      @click="applyCreateParentTreeSelect"
                    >
                      {{ t('common.confirm') }}
                    </UButton>
                  </div>
                </div>
              </template>
            </UPopover>
          </UFormField>
          <UFormField
            :label="t('admin.field_slug')"
            required
          >
            <UInput
              v-model="newSlug"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('admin.field_name')"
            required
          >
            <UInput
              v-model="newName"
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="showCreate = false"
            >
              {{ t('common.cancel') }}
            </UButton>
            <UButton
              :loading="creating"
              @click="createTerm"
            >
              {{ t('admin.action_create') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showEdit">
      <template #content>
        <div class="p-6 space-y-4">
          <h2 class="text-lg font-semibold">
            {{ t('admin.categories_action_edit') }}
          </h2>
          <UFormField :label="t('admin.field_parent')">
            <UPopover v-model:open="editParentPickerOpen">
              <UButton
                color="neutral"
                variant="outline"
                class="w-full justify-between"
                trailing-icon="i-lucide-chevron-down"
              >
                {{ editParentDisplayLabel }}
              </UButton>
              <template #content>
                <div class="w-[var(--reka-popper-anchor-width)] space-y-2 p-2">
                  <div class="max-h-72 overflow-y-auto">
                    <UTree
                      :expanded="expandedEditParentTreeKeys"
                      :items="editParentTreeItems"
                      :get-key="item => String(item.value)"
                      @update:model-value="onEditParentTreeSelect"
                      @update:expanded="onEditParentTreeExpandedUpdate"
                    >
                      <template #item-wrapper="{ item, expanded, handleToggle }">
                        <div
                          :class="[
                            'relative group w-full flex items-center text-sm select-none before:absolute before:inset-y-px before:inset-x-0 before:z-[-1] before:rounded-md',
                            'focus:outline-none focus-visible:outline-none focus-visible:before:ring-inset focus-visible:before:ring-2 focus-visible:before:ring-primary',
                            'px-2.5 py-1.5 gap-1.5 transition-colors before:transition-colors',
                            pendingEditParentId === item.value
                              ? 'before:bg-elevated text-primary'
                              : 'hover:text-highlighted hover:before:bg-elevated/50'
                          ]"
                          @click="onEditParentTreeSelect(item)"
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
                              @click.stop="toggleEditParentTreeNode(handleToggle)"
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
                      @click="editParentPickerOpen = false"
                    >
                      {{ t('common.cancel') }}
                    </UButton>
                    <UButton
                      color="primary"
                      size="sm"
                      @click="applyEditParentTreeSelect"
                    >
                      {{ t('common.confirm') }}
                    </UButton>
                  </div>
                </div>
              </template>
            </UPopover>
          </UFormField>
          <UFormField
            :label="t('admin.field_slug')"
            required
          >
            <UInput
              v-model="editSlug"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('admin.field_name')"
            required
          >
            <UInput
              v-model="editName"
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="showEdit = false"
            >
              {{ t('common.cancel') }}
            </UButton>
            <UButton
              :loading="editing"
              @click="updateTerm"
            >
              {{ t('common.save') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
