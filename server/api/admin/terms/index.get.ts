import { useDb } from '../../../utils/db'
import { terms } from '../../../database/schema'
import { requireStaff } from '../../../utils/roles'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const db = await useDb()
  const all = await db.select().from(terms)
  return { terms: all }
})
