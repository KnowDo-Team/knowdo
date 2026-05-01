import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, rename, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { H3Event } from 'h3'
import { assertMethod } from 'h3'
import busboy from 'busboy'
import {
  isAllowedAttachmentExtension,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_LABEL_MB
} from '~~/shared/attachmentUpload'
import { getCurrentUser } from '../utils/auth'
import { isStaffRole } from '../utils/roles'

function parseFirstFileStreamToTemp(
  event: H3Event,
  tmpDir: string
): Promise<{ tmpPath: string; originalName: string; byteLength: number }> {
  return new Promise((resolve, reject) => {
    let settled = false
    let fileStarted = false

    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    const req = event.node.req
    const bb = busboy({
      headers: req.headers,
      defParamCharset: 'utf8',
      limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 }
    })

    bb.on('file', (fieldname, file, info) => {
      if (fieldname !== 'file') {
        file.resume()
        return
      }
      if (fileStarted) {
        file.resume()
        return
      }
      fileStarted = true

      const originalName = info.filename || 'unknown'
      const ext = originalName.includes('.') ? originalName.split('.').pop()?.toLowerCase() : ''
      if (ext && !isAllowedAttachmentExtension(ext)) {
        file.resume()
        settle(() => reject(createError({ statusCode: 400, statusMessage: 'Unsupported file type' })))
        return
      }

      const tmpPath = join(tmpDir, `${randomUUID()}.part`)
      const ws = createWriteStream(tmpPath)

      file.on('limit', () => {
        file.resume()
        ws.destroy()
        unlink(tmpPath).catch(() => {})
        settle(() =>
          reject(
            createError({
              statusCode: 413,
              statusMessage: `File is too large (max ${MAX_ATTACHMENT_LABEL_MB}MB)`
            })
          )
        )
      })

      pipeline(file, ws)
        .then(async () => {
          let st
          try {
            st = await stat(tmpPath)
          } catch {
            settle(() => reject(createError({ statusCode: 400, statusMessage: 'File data is empty' })))
            return
          }
          if (st.size === 0) {
            await unlink(tmpPath).catch(() => {})
            settle(() => reject(createError({ statusCode: 400, statusMessage: 'File data is empty' })))
            return
          }
          settle(() => resolve({ tmpPath, originalName, byteLength: st.size }))
        })
        .catch(async (e) => {
          await unlink(tmpPath).catch(() => {})
          settle(() => reject(e))
        })
    })

    bb.on('finish', () => {
      if (!fileStarted) {
        settle(() => reject(createError({ statusCode: 400, statusMessage: 'No file uploaded' })))
      }
    })

    bb.on('error', (err) => settle(() => reject(err)))
    req.on('error', (err) => settle(() => reject(err)))
    req.pipe(bb)
  })
}

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST')

  const user = await getCurrentUser(event)
  if (!user || !isStaffRole(user.role)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const publicUploads = join(process.cwd(), 'public', 'uploads')
  const tmpDir = join(publicUploads, '.tmp')
  await mkdir(tmpDir, { recursive: true })
  await mkdir(publicUploads, { recursive: true })

  let tmpPath: string | undefined
  try {
    const { tmpPath: savedTmp, originalName, byteLength } = await parseFirstFileStreamToTemp(event, tmpDir)
    tmpPath = savedTmp

    const ext = originalName.includes('.') ? originalName.split('.').pop()?.toLowerCase() : ''
    const safeName = `${randomUUID()}${ext ? `.${ext}` : ''}`
    const dest = join(publicUploads, safeName)
    await rename(savedTmp, dest)
    tmpPath = undefined

    const url = `/uploads/${safeName}`
    const id = Math.floor(Math.random() * 1_000_000_000)

    const determineType = (filename: string) => {
      const extension = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() : ''
      if (!extension) return 'file'
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'image'
      if (['mp3', 'wav', 'm4a'].includes(extension)) return 'audio'
      if (['mp4'].includes(extension)) return 'video'
      return 'file'
    }

    return {
      success: true,
      url,
      data: {
        id,
        filename: originalName,
        url,
        size: byteLength,
        type: determineType(originalName)
      }
    }
  } catch (e) {
    if (tmpPath) await unlink(tmpPath).catch(() => {})
    throw e
  }
})
