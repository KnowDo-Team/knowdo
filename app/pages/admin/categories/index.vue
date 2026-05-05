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

type DeleteArticleAction = 'detach' | 'delete'

const errorMessageKeys: Record<string, string> = {
  'Not found': 'admin.error_not_found',
  'delete_children_first': 'admin.error_delete_children_first',
  'slug_conflict_same_parent': 'admin.error_slug_conflict_same_parent',
  'invalid slug or name': 'admin.error_invalid_slug_or_name',
  'slug and name required': 'admin.error_slug_and_name_required'
}

const { t } = useI18n()
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

const showDelete = ref(false)
const deleting = ref(false)
const deleteCategoryId = ref<string | null>(null)
const deleteArticleAction = ref<DeleteArticleAction>('detach')

const totalLabel = computed(() => t('admin.categories_total', { count: visibleCategoryCount.value }))

function getErrorMessage(error: unknown, fallback = '') {
  if (error && typeof error === 'object') {
    const maybeData = 'data' in error ? (error as { data?: { statusMessage?: string } }).data : undefined
    const maybeMessage = 'message' in error ? (error as { message?: string }).message : ''
    const rawMessage = maybeData?.statusMessage || maybeMessage || ''
    const messageKey = errorMessageKeys[rawMessage]
      || errorMessageKeys[rawMessage.trim().toLowerCase().replace(/\s+/g, '_')]

    if (messageKey) return t(messageKey)
    return rawMessage || fallback
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

const deleteCategory = computed(() => {
  if (!deleteCategoryId.value) return null
  return categoryById.value.get(deleteCategoryId.value) ?? null
})

const deleteArticleActionItems = computed(() => [
  {
    label: t('admin.categories_delete_article_action_detach'),
    description: t('admin.categories_delete_article_action_detach_description'),
    value: 'detach' as const
  },
  {
    label: t('admin.categories_delete_article_action_delete'),
    description: t('admin.categories_delete_article_action_delete_description'),
    value: 'delete' as const
  }
])

const deleteCategoryIds = computed(() => {
  const rootId = deleteCategoryId.value
  if (!rootId) return []

  const childrenByParent = new Map<string | null, TermRow[]>()
  for (const term of terms.value) {
    const parentId = term.parentId ?? null
    const list = childrenByParent.get(parentId) ?? []
    list.push(term)
    childrenByParent.set(parentId, list)
  }

  const ids: string[] = []
  const walk = (parentId: string) => {
    ids.push(parentId)
    for (const child of childrenByParent.get(parentId) ?? []) {
      walk(child.id)
    }
  }

  walk(rootId)
  return ids
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

type DeleteCategoryResponse = {
  deletedTerms: number
  affectedArticles: number
  deletedArticles: number
}

function openDeleteTerm(id: string) {
  deleteCategoryId.value = id
  deleteArticleAction.value = 'detach'
  showDelete.value = true
}

function closeDeleteTerm() {
  if (deleting.value) return
  showDelete.value = false
  deleteCategoryId.value = null
  deleteArticleAction.value = 'detach'
}

async function confirmDeleteTerm() {
  const id = deleteCategoryId.value
  if (!id) return

  const deletedIds = [...deleteCategoryIds.value]
  deleting.value = true
  try {
    const result = await $fetch<DeleteCategoryResponse>(`/api/admin/terms/${id}`, {
      method: 'DELETE',
      body: {
        articleAction: deleteArticleAction.value
      }
    })

    if (selectedCategoryId.value && deletedIds.includes(selectedCategoryId.value)) {
      selectedCategoryId.value = null
    }

    showDelete.value = false
    deleteCategoryId.value = null
    await refresh()

    toast.add({
      title: t('common.deleted'),
      description: t(
        deleteArticleAction.value === 'delete'
          ? 'admin.categories_deleted_summary_delete'
          : 'admin.categories_deleted_summary_detach',
        {
          categories: result.deletedTerms,
          articles: deleteArticleAction.value === 'delete'
            ? result.deletedArticles
            : result.affectedArticles
        }
      ),
      color: 'success'
    })
  } catch (e: unknown) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(e),
      color: 'error'
    })
  } finally {
    deleting.value = false
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
        <p class="text-muted">
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
      <p class="text-xs text-muted">
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
                  class="inline-flex items-center justify-center text-toned hover:text-highlighted"
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
            <div class="text-base font-semibold text-highlighted">
              {{ selectedCategory.name }}
            </div>
            <div class="font-mono text-xs text-muted">
              {{ selectedCategory.slug }}
            </div>
          </div>

          <div class="text-sm text-muted">
            {{ t('admin.categories_parent_meta') }}:
            {{ selectedCategory.parentId ? (categoryById.get(selectedCategory.parentId)?.name || selectedCategory.parentId) : t('admin.categories_parent_root') }}
          </div>
          <div class="text-sm text-muted">
            {{ t('admin.categories_child_count') }}: {{ childCountById.get(selectedCategory.id) ?? 0 }}
          </div>

          <div class="flex flex-wrap gap-1">
            <span class="rounded border border-default bg-elevated px-2 py-0.5 text-xs">
              {{ `/${selectedCategory.slug}` }}
            </span>
          </div>

          <div class="flex justify-end gap-2 border-t border-default pt-3">
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
              @click="openDeleteTerm(selectedCategory.id)"
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
                <div class="w-(--reka-popper-anchor-width) space-y-2 p-2">
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
                              class="inline-flex items-center justify-center text-toned hover:text-highlighted"
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
                  <div class="flex justify-end gap-2 border-t border-default pt-2">
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
                <div class="w-(--reka-popper-anchor-width) space-y-2 p-2">
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
                              class="inline-flex items-center justify-center text-toned hover:text-highlighted"
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
                  <div class="flex justify-end gap-2 border-t border-default pt-2">
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

    <UModal
      v-model:open="showDelete"
      :dismissible="!deleting"
      :ui="{ content: 'sm:max-w-lg' }"
      @update:open="open => !open && closeDeleteTerm()"
    >
      <template #content>
        <div class="space-y-5 p-6">
          <div class="flex items-start gap-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/12 text-red-500">
              <UIcon
                name="i-lucide-triangle-alert"
                class="h-5 w-5"
              />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-highlighted">
                {{ t('admin.categories_delete_title') }}
              </h2>
              <p class="mt-2 text-sm leading-6 text-muted">
                {{ t('admin.categories_delete_confirm', { name: deleteCategory?.name || '', count: deleteCategoryIds.length }) }}
              </p>
            </div>
          </div>

          <URadioGroup
            v-model="deleteArticleAction"
            :items="deleteArticleActionItems"
            variant="card"
            color="error"
          />

          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="deleting"
              @click="closeDeleteTerm"
            >
              {{ t('common.cancel') }}
            </UButton>
            <UButton
              color="error"
              :loading="deleting"
              @click="confirmDeleteTerm"
            >
              {{ t('common.delete') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
