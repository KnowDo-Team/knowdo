export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/api')) return

  // useAsyncData: SSR state sharing + deduplication (same pattern as campus-feed)
  const requestFetch = useRequestFetch()
  const { data: status } = await useAsyncData('setup_status', () =>
    requestFetch<{ needsSetup: boolean }>('/api/setup')
  )

  const needsSetup = status.value?.needsSetup ?? false

  if (needsSetup) {
    if (to.path !== '/setup') {
      return navigateTo('/setup')
    }
    return
  }

  if (!needsSetup && to.path === '/setup') {
    return navigateTo('/')
  }
})
