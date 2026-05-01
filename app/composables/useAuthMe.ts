export type AuthMeUser = {
  id: string
  username: string
  role: string
} | null

export type AuthMeResponse = {
  user: AuthMeUser
}

export function useAuthMe<T = AuthMeResponse>() {
  return useFetch<T>('/api/auth/me', { key: 'auth-me', lazy: true })
}
