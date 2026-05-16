type AliyunCaptchaRuntimeConfig = {
  enabled?: boolean | string
  region?: string
  prefix?: string
  loginSceneId?: string
}

type AliyunCaptchaErrorInfo = {
  code?: string
  msg?: string
}

type AliyunCaptchaInstance = {
  refresh?: () => void
}

type InitAliyunCaptchaOptions = {
  sceneId: string
  element: string
  button: string
  language?: string
  success: (captchaVerifyParam: string) => void | Promise<void>
  fail?: (result: unknown) => void
  onError?: (errorInfo: AliyunCaptchaErrorInfo) => void
  onClose?: () => void
}

type AliyunCaptchaInitOptions = {
  SceneId: string
  mode: 'embed'
  element: string
  button: string
  success: (captchaVerifyParam: string) => void | Promise<void>
  fail?: (result: unknown) => void
  getInstance: (instance: AliyunCaptchaInstance) => void
  server: string[]
  slideStyle: {
    width: number
    height: number
  }
  language?: string
  onError?: (errorInfo: AliyunCaptchaErrorInfo) => void
  onClose?: () => void
}

declare global {
  interface Window {
    AliyunCaptchaConfig?: {
      region: string
      prefix: string
    }
    initAliyunCaptcha?: (options: AliyunCaptchaInitOptions) => void
  }
}

const ALIYUN_CAPTCHA_SCRIPT_ID = 'aliyun-captcha-sdk'
const ALIYUN_CAPTCHA_SCRIPT_SRC = 'https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js'

let scriptPromise: Promise<void> | null = null

function parseEnabled(value: boolean | string | undefined) {
  return value === true || value === 'true'
}

function loadAliyunCaptchaScript(region: string, prefix: string) {
  if (!import.meta.client) return Promise.resolve()

  window.AliyunCaptchaConfig = { region, prefix }

  if (window.initAliyunCaptcha) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(ALIYUN_CAPTCHA_SCRIPT_ID) as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Aliyun CAPTCHA script')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = ALIYUN_CAPTCHA_SCRIPT_ID
    script.type = 'text/javascript'
    script.src = ALIYUN_CAPTCHA_SCRIPT_SRC
    script.async = true
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => {
      scriptPromise = null
      reject(new Error('Failed to load Aliyun CAPTCHA script'))
    }, { once: true })
    document.head.appendChild(script)
  })

  return scriptPromise
}

export function useAliyunCaptcha() {
  const config = useRuntimeConfig().public.aliyunCaptcha as AliyunCaptchaRuntimeConfig | undefined
  const enabled = computed(() => parseEnabled(config?.enabled))
  const region = computed(() => config?.region || 'cn')
  const prefix = computed(() => config?.prefix || '')
  const loginSceneId = computed(() => config?.loginSceneId || '')
  const configured = computed(() => Boolean(prefix.value && loginSceneId.value))

  const initializing = ref(false)
  const ready = ref(false)
  const error = ref<Error | null>(null)
  const instance = shallowRef<AliyunCaptchaInstance | null>(null)
  let initPromise: Promise<boolean> | null = null

  async function init(options: InitAliyunCaptchaOptions) {
    if (!enabled.value || !import.meta.client) return true
    if (ready.value) return true
    if (initPromise) return initPromise

    initPromise = (async () => {
      if (!prefix.value || !options.sceneId) {
        error.value = new Error('Aliyun CAPTCHA is not configured')
        return false
      }

      initializing.value = true
      error.value = null

      try {
        await loadAliyunCaptchaScript(region.value, prefix.value)

        if (!window.initAliyunCaptcha) {
          throw new Error('Aliyun CAPTCHA initializer is unavailable')
        }

        await new Promise<void>((resolve, reject) => {
          let settled = false
          const settleReady = () => {
            if (settled) return
            settled = true
            resolve()
          }
          const settleError = (captchaError: Error) => {
            if (settled) return
            settled = true
            reject(captchaError)
          }

          window.initAliyunCaptcha?.({
            SceneId: options.sceneId,
            mode: 'embed',
            element: options.element,
            button: options.button,
            success: options.success,
            fail: options.fail,
            getInstance(captchaInstance) {
              instance.value = captchaInstance
              ready.value = true
              settleReady()
            },
            server: ['captcha-esa-open.aliyuncs.com', 'captcha-esa-open-b.aliyuncs.com'],
            slideStyle: {
              width: 360,
              height: 40
            },
            language: options.language,
            onError(errorInfo) {
              const captchaError = new Error(errorInfo.msg || errorInfo.code || 'Aliyun CAPTCHA error')
              error.value = captchaError
              options.onError?.(errorInfo)
              settleError(captchaError)
            },
            onClose: options.onClose
          })
        })

        return true
      } catch (e) {
        error.value = e instanceof Error ? e : new Error('Failed to initialize Aliyun CAPTCHA')
        ready.value = false
        return false
      } finally {
        initializing.value = false
        initPromise = null
      }
    })()

    return initPromise
  }

  function refresh() {
    instance.value?.refresh?.()
  }

  return {
    enabled,
    configured,
    initializing,
    ready,
    error,
    loginSceneId,
    init,
    refresh
  }
}
