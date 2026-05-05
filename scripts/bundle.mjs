import fs from 'node:fs'
import path from 'node:path'
import archiver from 'archiver'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outputPath = path.join(rootDir, 'dist.zip')

async function bundle() {
  console.log('📦 Starting bundle process...')

  // Check if .output exists
  const buildDir = path.join(rootDir, '.output')
  if (!fs.existsSync(buildDir)) {
    console.error('❌ Error: .output directory not found. Please run "pnpm build" first.')
    process.exit(1)
  }

  const output = fs.createWriteStream(outputPath)
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  })

  output.on('close', () => {
    console.log(`✅ Bundle complete! Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`)
    console.log(`📂 Location: ${outputPath}`)
  })

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('⚠️  Warning:', err)
    } else {
      throw err
    }
  })

  archive.on('error', (err) => {
    throw err
  })

  archive.pipe(output)

  console.log('📂 Adding .output directory...')
  archive.directory(buildDir, '.output')

  // Optional: Add other deployment files
  const filesToInclude = [
    '.env.example',
    'package.json',
    'pnpm-lock.yaml',
    'drizzle.config.ts',
    'server/database/schema.ts'
  ]

  for (const file of filesToInclude) {
    const filePath = path.join(rootDir, file)
    if (fs.existsSync(filePath)) {
      console.log(`📄 Adding ${file}...`)
      archive.file(filePath, { name: file })
    }
  }

  // Add migrations
  const migrationsDir = path.join(rootDir, 'server/database/migrations')
  if (fs.existsSync(migrationsDir)) {
    console.log('📂 Adding migrations directory...')
    archive.directory(migrationsDir, '.output/server/database/migrations')
  }

  // Add i18n locale files
  const i18nDir = path.join(rootDir, 'i18n/locales')
  if (fs.existsSync(i18nDir)) {
    console.log('📂 Adding i18n/locales directory...')
    archive.directory(i18nDir, 'i18n/locales')
  }

  console.log('🗜️  Compressing...')
  await archive.finalize()
}

bundle().catch((err) => {
  console.error('❌ Bundle failed:', err)
  process.exit(1)
})
