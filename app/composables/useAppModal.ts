export type AppModalTone = 'neutral' | 'success' | 'warning' | 'error'

type AppModalState = {
  open: boolean
  kind: 'alert' | 'confirm'
  tone: AppModalTone
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  dismissible: boolean
}

type AppAlertOptions = {
  tone?: AppModalTone
  title: string
  description?: string
  confirmLabel?: string
  dismissible?: boolean
}

type AppConfirmOptions = {
  tone?: AppModalTone
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  dismissible?: boolean
}

let confirmResolver: ((value: boolean) => void) | null = null
let alertResolver: (() => void) | null = null

function defaultState(): AppModalState {
  return {
    open: false,
    kind: 'alert',
    tone: 'neutral',
    title: '',
    description: '',
    confirmLabel: 'OK',
    cancelLabel: 'Cancel',
    dismissible: true
  }
}

export function useAppModal() {
  const state = useState<AppModalState>('app-modal-state', defaultState)

  function reset() {
    state.value = defaultState()
  }

  function alert(options: AppAlertOptions) {
    if (confirmResolver) {
      confirmResolver(false)
      confirmResolver = null
    }

    if (alertResolver) {
      alertResolver()
      alertResolver = null
    }

    state.value = {
      open: true,
      kind: 'alert',
      tone: options.tone || 'neutral',
      title: options.title,
      description: options.description || '',
      confirmLabel: options.confirmLabel || 'OK',
      cancelLabel: 'Cancel',
      dismissible: options.dismissible ?? true
    }

    return new Promise<void>((resolve) => {
      alertResolver = resolve
    })
  }

  function success(options: Omit<AppAlertOptions, 'tone'>) {
    return alert({ ...options, tone: 'success' })
  }

  function error(options: Omit<AppAlertOptions, 'tone'>) {
    return alert({ ...options, tone: 'error' })
  }

  function confirm(options: AppConfirmOptions) {
    if (confirmResolver) {
      confirmResolver(false)
      confirmResolver = null
    }

    if (alertResolver) {
      alertResolver()
      alertResolver = null
    }

    state.value = {
      open: true,
      kind: 'confirm',
      tone: options.tone || 'neutral',
      title: options.title,
      description: options.description || '',
      confirmLabel: options.confirmLabel || 'OK',
      cancelLabel: options.cancelLabel || 'Cancel',
      dismissible: options.dismissible ?? true
    }

    return new Promise<boolean>((resolve) => {
      confirmResolver = resolve
    })
  }

  function close(result = false) {
    state.value.open = false

    if (state.value.kind === 'confirm' && confirmResolver) {
      confirmResolver(result)
      confirmResolver = null
      return
    }

    if (alertResolver) {
      alertResolver()
      alertResolver = null
    }
  }

  function onOpenChange(open: boolean) {
    if (open) {
      state.value.open = true
      return
    }

    close(false)
  }

  return {
    state,
    alert,
    success,
    error,
    confirm,
    close,
    reset,
    onOpenChange
  }
}
