import { getCurrentUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    return { user: null }
  }
  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  }
})
