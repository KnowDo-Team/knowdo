<script setup lang="ts">
import type { CategoryOverviewData } from '~/components/CategoryOverviewSection.vue'

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()
const modal = useAppModal()
const {
  data: categoriesData,
  status: categoriesStatus,
  error: categoriesError
} = await useFetch<CategoryOverviewData>('/api/public/categories')

const slugQuery = ref('')

async function handleSearch() {
  const raw = slugQuery.value.trim()
  if (!raw) return
  try {
    const res = await $fetch<{
      query: string
      directSlug: string | null
      results: {
        slug: string
        title: string
        updatedAt: string
      }[]
    }>('/api/public/articles/search', { query: { q: raw } })
    if (res.directSlug) {
      await router.push(localePath(`/${encodeURIComponent(res.directSlug)}`))
    } else {
      await router.push({ path: localePath('/search'), query: { q: raw } })
    }
  } catch {
    modal.error({
      title: t('common.error'),
      description: t('wiki.search_failed'),
      confirmLabel: t('common.confirm')
    })
  }
}

function handlePointerMove(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement | null
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
  const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))
  el.style.setProperty('--mx', `${x}px`)
  el.style.setProperty('--my', `${y}px`)
}
</script>

<template>
  <div class="wiki-home">
    <section class="hero-section">
      <div class="hero-bg-grid" />
      <div class="hero-bg-orbs">
        <div class="orb orb-1" />
        <div class="orb orb-2" />
        <div class="orb orb-3" />
      </div>

      <div class="hero-inner relative px-4">
        <div class="mx-auto max-w-3xl text-center">
          <div class="mb-5 flex justify-center">
            <UBadge color="primary" variant="subtle" class="px-3 py-1">
              {{ t('home.hero_badge') }}
            </UBadge>
          </div>

          <h1 class="hero-heading">
            <span class="hero-heading-primary text-(--ui-text-highlighted)">
              {{ t('home.hero_title_line1') }}
            </span>
            <span class="hero-heading-tagline">
              {{ t('home.hero_title_line2') }}
            </span>
          </h1>

          <UCard
            class="search-card text-left"
            :ui="{ body: 'p-4 sm:p-5' }"
            @pointermove="handlePointerMove"
          >
            <div class="flex flex-col sm:flex-row gap-3">
              <UInput
                v-model="slugQuery"
                icon="i-lucide-book-open"
                size="lg"
                class="flex-1"
                @keydown.enter="handleSearch"
              />
              <UButton
                color="primary"
                size="lg"
                class="sm:px-7 shrink-0"
                @click="handleSearch"
              >
                {{ t('home.search_button') }}
              </UButton>
            </div>
          </UCard>
        </div>
      </div>
    </section>

    <CategoryOverviewSection
      compact
      :data="categoriesData"
      :status="categoriesStatus"
      :has-error="!!categoriesError"
    />
  </div>
</template>

<style scoped>
.wiki-home {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - var(--ui-header-height, 4rem));
}

.hero-section {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: min(calc(100dvh - var(--ui-header-height, 4rem) - 7rem), 52rem);
  overflow: hidden;
  background: linear-gradient(
    180deg,
    color-mix(in oklab, var(--ui-bg-elevated) 88%, var(--ui-bg)) 0%,
    color-mix(in oklab, var(--ui-bg-elevated) 52%, var(--ui-bg)) 38%,
    var(--ui-bg) 100%
  );
}

.hero-inner {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding-block: clamp(2rem, 6vh, 4rem);
}

.hero-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(color-mix(in oklab, var(--ui-border) 70%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in oklab, var(--ui-border) 70%, transparent) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.32;
  pointer-events: none;
}

.hero-bg-orbs {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(110px);
  opacity: 0.18;
}

.orb-1 {
  width: 520px;
  height: 520px;
  background: radial-gradient(
    circle,
    color-mix(in oklab, white 18%, transparent) 0%,
    color-mix(in oklab, white 10%, transparent) 36%,
    transparent 74%
  );
  top: -180px;
  left: -140px;
}

.orb-2 {
  width: 420px;
  height: 420px;
  background: radial-gradient(
    circle,
    color-mix(in oklab, white 12%, transparent) 0%,
    color-mix(in oklab, white 7%, transparent) 34%,
    transparent 72%
  );
  top: -120px;
  right: -120px;
}

.orb-3 {
  width: 340px;
  height: 340px;
  background: radial-gradient(
    circle,
    color-mix(in oklab, white 10%, transparent) 0%,
    color-mix(in oklab, white 5%, transparent) 30%,
    transparent 74%
  );
  bottom: -140px;
  left: 38%;
}

.hero-heading {
  margin: 0 0 1.5rem;
}

.hero-heading-primary {
  display: block;
  font-size: clamp(1.875rem, 4.2vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.15;
}

.hero-heading-tagline {
  display: block;
  margin-top: 0.4rem;
  font-size: clamp(0.9375rem, 1.85vw, 1.1875rem);
  font-weight: 600;
  letter-spacing: -0.012em;
  line-height: 1.45;
  color: color-mix(in oklab, var(--ui-text-muted) 92%, var(--ui-text-highlighted) 8%);
}

.search-card {
  box-shadow:
    0 18px 48px color-mix(in oklab, black 18%, transparent),
    0 1px 0 color-mix(in oklab, var(--ui-border) 50%, transparent) inset;
  position: relative;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--ui-border) 88%, transparent);
  background: color-mix(in oklab, var(--ui-bg) 86%, var(--ui-bg-elevated) 14%);
}

.search-card::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
  background-image: radial-gradient(
    520px circle at var(--mx, 50%) var(--my, 40%),
    color-mix(in oklab, white 10%, transparent),
    transparent 55%
  );
}

.search-card:hover::after {
  opacity: 1;
}
</style>
