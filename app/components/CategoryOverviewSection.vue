<script setup lang="ts">
export type CategoryTreeNode = {
  id: string
  slug: string
  name: string
  parentId: string | null
}

export type CategoryOverviewData = {
  term: null
  terms: CategoryTreeNode[]
  children: {
    id: string
    slug: string
    name: string
  }[]
  articles: {
    id: string
    slug: string
    title: string
  }[]
}

type TreeItem = {
  label: string
  value: string
  path: string
  depth: number
  children?: TreeItem[]
}

const props = withDefaults(defineProps<{
  data?: CategoryOverviewData | null
  status?: 'idle' | 'pending' | 'success' | 'error'
  hasError?: boolean
  compact?: boolean
}>(), {
  data: null,
  status: 'success',
  hasError: false,
  compact: false
})

const { t } = useI18n()
const router = useRouter()
const expandedTreeKeys = ref<string[]>([])
const treeChevronTogglePending = ref(false)

const treeItems = computed<TreeItem[]>(() => {
  const terms = props.data?.terms ?? []
  const byParent = new Map<string | null, CategoryTreeNode[]>()

  for (const term of terms) {
    const parentId = term.parentId ?? null
    const list = byParent.get(parentId) ?? []
    list.push(term)
    byParent.set(parentId, list)
  }

  const walk = (parentId: string | null, parentSegments: string[] = [], depth = 0): TreeItem[] => {
    const children = (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))

    return children.map((child) => {
      const currentSegments = [...parentSegments, child.slug]
      const descendants = walk(child.id, currentSegments, depth + 1)
      return {
        label: child.name,
        value: child.id,
        path: `/categories/${currentSegments.map(encodeURIComponent).join('/')}`,
        depth,
        ...(descendants.length ? { children: descendants } : {})
      }
    })
  }

  return walk(null)
})

const defaultExpandedTreeKeys = computed(() => {
  const keys: string[] = []

  const walk = (items: TreeItem[]) => {
    for (const item of items) {
      if (item.children?.length) {
        keys.push(String(item.value))
        walk(item.children)
      }
    }
  }

  walk(treeItems.value)
  return keys
})

watch(treeItems, () => {
  expandedTreeKeys.value = [...defaultExpandedTreeKeys.value]
}, { immediate: true })

function onTreeSelect(item: unknown) {
  if (!item || typeof item !== 'object' || !('path' in item)) return

  const path = (item as { path?: string }).path
  if (!path) return
  void router.push(path)
}

function onTreeExpandedUpdate(keys: string[]) {
  if (!treeChevronTogglePending.value) return
  expandedTreeKeys.value = keys
  treeChevronTogglePending.value = false
}

function toggleTreeNode(handleToggle: () => void) {
  treeChevronTogglePending.value = true
  handleToggle()
}

function getCompactTreeDepthClass(item: TreeItem) {
  if (item.depth <= 0) return 'category-tree-depth-0'
  if (item.depth === 1) return 'category-tree-depth-1'
  if (item.depth === 2) return 'category-tree-depth-2'
  if (item.depth === 3) return 'category-tree-depth-3'
  return 'category-tree-depth-4'
}
</script>

<template>
  <section
    class="category-overview"
    :class="props.compact ? 'category-overview-compact' : 'category-overview-page'"
  >
    <div
      v-if="props.compact"
      class="category-overview-grid"
    />
    <div
      v-if="props.compact"
      class="category-overview-glow category-overview-glow-left"
    />
    <div
      v-if="props.compact"
      class="category-overview-glow category-overview-glow-right"
    />

    <UContainer :class="props.compact ? 'py-14 sm:py-16' : 'py-10'">
      <div class="relative z-1 space-y-6">
        <div class="space-y-2">
          <h2 :class="props.compact ? 'category-overview-title text-2xl sm:text-3xl font-bold' : 'text-3xl font-bold'">
            {{ t('layout.categories') }}
          </h2>
          <p :class="props.compact ? 'category-overview-intro max-w-2xl text-sm sm:text-base' : 'max-w-2xl text-sm sm:text-base text-muted'">
            {{ t('wiki.categories_intro') }}
          </p>
        </div>

        <UAlert
          v-if="props.hasError"
          color="error"
          :title="t('wiki.categories_load_failed')"
        />
        <div
          v-else-if="props.status === 'pending'"
          class="text-muted"
        >
          {{ t('common.loading') }}
        </div>
        <div
          v-else
          class="category-tree-surface"
          :class="props.compact ? 'category-tree-surface-compact' : ''"
        >
          <div class="category-tree-surface-inner">
            <UTree
              :expanded="expandedTreeKeys"
              :items="treeItems"
              :get-key="item => String(item.value)"
              @update:model-value="onTreeSelect"
              @update:expanded="onTreeExpandedUpdate"
            >
              <template #item-wrapper="{ item, expanded, handleToggle }">
                <div
                  :class="[
                    'relative group w-full flex items-center text-base select-none before:absolute before:inset-y-px before:inset-x-0 before:z-[-1] before:rounded-md',
                    'focus:outline-none focus-visible:outline-none focus-visible:before:ring-inset focus-visible:before:ring-2 focus-visible:before:ring-primary',
                    'px-3 py-1.5 gap-1.5 transition-colors before:transition-colors',
                    props.compact
                      ? 'category-tree-row-compact'
                      : 'hover:text-highlighted hover:before:bg-elevated/50'
                  ]"
                  @click="onTreeSelect(item)"
                >
                  <UIcon
                    :name="item.children?.length ? (expanded ? 'i-lucide-folder-open' : 'i-lucide-folder') : 'i-lucide-folder'"
                    :class="props.compact ? ['category-tree-icon-compact', getCompactTreeDepthClass(item), 'size-5 shrink-0 relative'] : 'size-5 shrink-0 relative'"
                  />
                  <span
                    :class="props.compact ? ['category-tree-label-compact', getCompactTreeDepthClass(item), 'truncate'] : 'truncate'"
                  >
                    {{ item.label }}
                  </span>
                  <span
                    v-if="item.children?.length"
                    class="ms-auto inline-flex gap-1.5 items-center"
                  >
                    <button
                      type="button"
                      :class="props.compact ? 'inline-flex items-center justify-center category-tree-icon-compact hover:opacity-100 opacity-80' : 'inline-flex items-center justify-center text-toned hover:text-highlighted'"
                      @click.stop="toggleTreeNode(handleToggle)"
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
        </div>
      </div>
    </UContainer>
  </section>
</template>

<style scoped>
.category-overview {
  position: relative;
}

.category-overview-compact {
  --category-overview-title: rgb(24 24 27 / 0.96);
  --category-overview-intro: rgb(39 39 42 / 0.76);
  --category-tree-label: rgb(24 24 27 / 0.94);
  --category-tree-icon: rgb(82 82 91 / 0.72);
  --category-tree-row-bg: rgb(255 255 255 / 0.42);
  --category-tree-row-hover: rgb(255 255 255 / 0.78);
  --category-tree-surface-bg: color-mix(in oklab, #f8f8f7 46%, transparent);
  --category-tree-surface-border: rgb(24 24 27 / 0.055);
  --category-tree-surface-shadow: inset 0 1px 0 rgb(255 255 255 / 0.2);
  --category-tree-surface-grid: rgb(24 24 27 / 0.03);
  --category-tree-surface-highlight: rgb(255 255 255 / 0.08);
  --category-tree-surface-overlay: rgb(255 255 255 / 0.08);
  --category-overview-grid-line: rgb(24 24 27 / 0.05);
  --category-overview-grid-opacity: 0.48;
  border-top: 1px solid color-mix(in oklab, var(--ui-border) 75%, transparent);
  overflow: hidden;
  background:
    linear-gradient(
      180deg,
      color-mix(in oklab, white 92%, var(--ui-bg)) 0%,
      color-mix(in oklab, #f4f4f5 88%, var(--ui-bg)) 100%
    ),
    color-mix(in oklab, #fafafa 94%, var(--ui-bg));
}

.category-overview-page {
  background: transparent;
}

.category-overview-title {
  color: var(--category-overview-title);
}

.category-overview-intro {
  color: var(--category-overview-intro);
}

.category-overview-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--category-overview-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--category-overview-grid-line) 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: var(--category-overview-grid-opacity);
  pointer-events: none;
}

.category-overview-glow {
  position: absolute;
  border-radius: 9999px;
  filter: blur(90px);
  pointer-events: none;
}

.category-overview-glow-left {
  top: -100px;
  left: -70px;
  width: 260px;
  height: 260px;
  background: rgb(24 24 27 / 0.08);
}

.category-overview-glow-right {
  right: -90px;
  bottom: -120px;
  width: 320px;
  height: 320px;
  background: rgb(24 24 27 / 0.05);
}

.category-tree-surface {
  position: relative;
  overflow: hidden;
  border-radius: 1.5rem;
}

.category-tree-surface-compact {
  border: 1px solid var(--category-tree-surface-border);
  background:
    linear-gradient(180deg, var(--category-tree-surface-highlight), transparent 42%),
    linear-gradient(var(--category-tree-surface-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--category-tree-surface-grid) 1px, transparent 1px),
    var(--category-tree-surface-bg);
  background-size: auto, 26px 26px, 26px 26px, auto;
  box-shadow: var(--category-tree-surface-shadow);
  backdrop-filter: blur(3px);
}

.category-tree-surface-inner {
  padding: 1.15rem 1.25rem;
}

.category-tree-surface-compact::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, var(--category-tree-surface-overlay), transparent 24%);
}

.category-tree-row-compact {
  color: var(--category-tree-label);
  border-radius: 1rem;
  min-height: 2.5rem;
}

.category-tree-row-compact::before {
  background: var(--category-tree-row-bg);
  opacity: 0.52;
}

.category-tree-row-compact:hover::before {
  background: var(--category-tree-row-hover);
  opacity: 1;
}

.category-tree-label-compact {
  color: var(--category-tree-label);
  font-size: 1.0625rem;
  line-height: 1.55;
}

.category-tree-icon-compact {
  color: var(--category-tree-icon);
}

.category-tree-depth-0 {
  font-size: 1.125rem;
}

.category-tree-depth-1 {
  font-size: 1rem;
}

.category-tree-depth-2 {
  font-size: 0.9375rem;
}

.category-tree-depth-3 {
  font-size: 0.875rem;
}

.category-tree-depth-4 {
  font-size: 0.8125rem;
}
</style>

<style>
.dark .category-overview-compact {
  --category-overview-title: rgb(255 255 255 / 0.96);
  --category-overview-intro: rgb(212 212 216 / 0.78);
  --category-tree-label: rgb(244 244 245 / 0.92);
  --category-tree-icon: rgb(212 212 216 / 0.62);
  --category-tree-row-bg: transparent;
  --category-tree-row-hover: rgb(255 255 255 / 0.055);
  --category-tree-surface-bg: rgb(18 18 20 / 0.72);
  --category-tree-surface-border: rgb(255 255 255 / 0.075);
  --category-tree-surface-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.045),
    0 20px 60px rgb(0 0 0 / 0.24);
  --category-tree-surface-grid: rgb(255 255 255 / 0.018);
  --category-tree-surface-highlight: rgb(255 255 255 / 0.022);
  --category-tree-surface-overlay: rgb(255 255 255 / 0.016);
  --category-overview-grid-line: rgb(255 255 255 / 0.032);
  --category-overview-grid-opacity: 0.3;
  background:
    radial-gradient(
      620px circle at 50% 0%,
      rgb(255 255 255 / 0.045),
      transparent 58%
    ),
    linear-gradient(
      180deg,
      color-mix(in oklab, var(--ui-bg-elevated) 18%, var(--ui-bg)) 0%,
      var(--ui-bg) 78%
    );
}

.dark .category-overview-compact .category-overview-glow-left {
  background: rgb(255 255 255 / 0.035);
}

.dark .category-overview-compact .category-overview-glow-right {
  background: rgb(255 255 255 / 0.025);
}
</style>
