import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { getPlatformRole, getCurrentUser } from '@/lib/auth'
import { getFirestoreDb, hasFirebase } from '@/lib/firebase'

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')
const BRANDING_DIR = path.join(process.cwd(), 'public', 'branding')

const globalDeletedAssets = new Set<string>()

async function getDeletedAssets(): Promise<string[]> {
  const deleted: string[] = []
  
  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const doc = await db.collection('settings').doc('deleted_assets').get()
        if (doc.exists) {
          const data = doc.data()
          if (data && Array.isArray(data.urls)) {
            return data.urls
          }
        }
      } catch (err) {
        console.error('Failed to fetch deleted assets from Firestore:', err)
      }
    }
  }

  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const cookieVal = cookieStore.get('deleted_assets')?.value
    if (cookieVal) {
      return JSON.parse(cookieVal)
    }
  } catch (err) {
    // ignore
  }

  return deleted
}

async function addDeletedAsset(url: string) {
  globalDeletedAssets.add(url)

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const docRef = db.collection('settings').doc('deleted_assets')
        const doc = await docRef.get()
        let urls = [url]
        if (doc.exists) {
          const data = doc.data()
          if (data && Array.isArray(data.urls)) {
            urls = Array.from(new Set([...data.urls, url]))
          }
        }
        await docRef.set({ urls, updated_at: new Date() }, { merge: true })
        return
      } catch (err) {
        console.error('Failed to save deleted asset to Firestore:', err)
      }
    }
  }

  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const cookieVal = cookieStore.get('deleted_assets')?.value
    let urls = [url]
    if (cookieVal) {
      urls = Array.from(new Set([...JSON.parse(cookieVal), url]))
    }
    cookieStore.set('deleted_assets', JSON.stringify(urls), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  } catch (err) {
    // ignore
  }
}

async function removeDeletedAsset(url: string) {
  globalDeletedAssets.delete(url)

  if (hasFirebase) {
    const db = getFirestoreDb()
    if (db) {
      try {
        const docRef = db.collection('settings').doc('deleted_assets')
        const doc = await docRef.get()
        if (doc.exists) {
          const data = doc.data()
          if (data && Array.isArray(data.urls)) {
            const urls = data.urls.filter((u: string) => u !== url)
            await docRef.set({ urls, updated_at: new Date() }, { merge: true })
          }
        }
        return
      } catch (err) {
        console.error('Failed to remove deleted asset from Firestore:', err)
      }
    }
  }

  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const cookieVal = cookieStore.get('deleted_assets')?.value
    if (cookieVal) {
      const urls = JSON.parse(cookieVal).filter((u: string) => u !== url)
      cookieStore.set('deleted_assets', JSON.stringify(urls), {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      })
    }
  } catch (err) {
    // ignore
  }
}

export async function GET() {
  try {
    // Ensure uploads folder exists
    await fs.mkdir(UPLOADS_DIR, { recursive: true })

    const IMAGE_EXT = /\.(png|jpe?g|gif|svg|webp)$/i

    // Read user uploads
    const uploadFiles = await fs.readdir(UPLOADS_DIR)
    const uploadImages = uploadFiles
      .filter((f) => IMAGE_EXT.test(f))
      .map((f) => `/uploads/${f}`)

    // Read branding assets (banners only — filter out small logos / sim icons)
    let brandingImages: string[] = []
    try {
      const brandingFiles = await fs.readdir(BRANDING_DIR)
      brandingImages = brandingFiles
        .filter((f) => IMAGE_EXT.test(f))
        .map((f) => `/branding/${f}`)
    } catch {}

    const images = [...uploadImages, ...brandingImages]

    // Filter out any assets that have been soft-deleted
    const deletedList = await getDeletedAssets()
    const deletedSet = new Set([...deletedList, ...Array.from(globalDeletedAssets)])
    const filteredImages = images.filter((img) => !deletedSet.has(img))

    return NextResponse.json({ images: filteredImages })
  } catch (err: any) {
    console.error('Failed to list uploads:', err)
    return NextResponse.json({ error: 'Failed to list uploads' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // Security check: Any logged-in user can upload files (e.g. for team logos)
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized: You must be logged in to upload files' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    // Sanitize filename
    const ext = path.extname(file.name)
    const nameWithoutExt = path.basename(file.name, ext)
    const safeBase = nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')

    const isArchive = /\.(zip|rar|7z|tar|gz|tgz)$/i.test(file.name)
    const isRasterImage = /\.(png|jpe?g|gif|webp)$/i.test(file.name)

    // Compressed skin archives upload
    if (type === 'skin' || isArchive) {
      if (!isArchive) {
        return NextResponse.json(
          { error: 'Formato no permitido. Únicamente se permiten archivos comprimidos (.zip, .rar, .7z, .tar.gz)' },
          { status: 400 }
        )
      }

      const SKINS_DIR = path.join(process.cwd(), 'public', 'uploads', 'skins')
      const safeSkinName = `${safeBase}-${Date.now()}${ext.toLowerCase()}`
      const skinTargetPath = path.join(SKINS_DIR, safeSkinName)

      try {
        await fs.mkdir(SKINS_DIR, { recursive: true })
        await fs.writeFile(skinTargetPath, inputBuffer)
        const finalUrl = `/uploads/skins/${safeSkinName}`
        return NextResponse.json({ url: finalUrl, name: file.name })
      } catch (fsErr) {
        console.warn('Writing compressed skin to disk failed:', fsErr)
        return NextResponse.json({ error: 'No se pudo guardar el archivo comprimido' }, { status: 500 })
      }
    }

    // Compress raster images with sharp → WebP, max 1200x600, quality 82
    if (isRasterImage) {
      try {
        const sharp = (await import('sharp')).default
        
        // Sizing optimization: team logos must be highly compact
        // (especially to fit in Vercel cookies/local fallbacks if Firestore isn't connected)
        const resizeOpts = type === 'logo'
          ? { width: 160, height: 160, fit: 'cover' as const }
          : { width: 1000, height: 500, fit: 'inside' as const, withoutEnlargement: true }

        const quality = type === 'logo' ? 60 : 70

        const compressed = await sharp(inputBuffer)
          .resize(resizeOpts)
          .webp({ quality })
          .toBuffer()

        const safeName = `${safeBase}.webp`
        const targetPath = path.join(UPLOADS_DIR, safeName)

        try {
          await fs.mkdir(UPLOADS_DIR, { recursive: true })
          await fs.writeFile(targetPath, compressed)
          const finalUrl = `/uploads/${safeName}`
          await removeDeletedAsset(finalUrl)
          return NextResponse.json({ url: finalUrl })
        } catch (fsErr) {
          console.warn('Writing file to disk failed (expected on Vercel/serverless environments). Falling back to Base64:', fsErr)
          const base64 = compressed.toString('base64')
          const finalUrl = `data:image/webp;base64,${base64}`
          return NextResponse.json({ url: finalUrl })
        }
      } catch (sharpErr) {
        console.warn('sharp compression failed, falling back to original:', sharpErr)
      }
    }

    // SVG or compression fallback: save original or return base64 data URL if read-only
    const safeName = `${safeBase}${ext.toLowerCase()}`
    const targetPath = path.join(UPLOADS_DIR, safeName)

    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true })
      await fs.writeFile(targetPath, inputBuffer)
      const finalUrl = `/uploads/${safeName}`
      await removeDeletedAsset(finalUrl)
      return NextResponse.json({ url: finalUrl })
    } catch (fsErr) {
      console.warn('Writing original file to disk failed, falling back to base64:', fsErr)
      const mimeType = file.type || 'image/png'
      const base64 = inputBuffer.toString('base64')
      const finalUrl = `data:${mimeType};base64,${base64}`
      return NextResponse.json({ url: finalUrl })
    }
  } catch (err: any) {
    console.error('Upload failed:', err)
    return NextResponse.json({ error: 'Failed to process uploaded file' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    // Security check: Only platform admins can delete assets
    const role = await getPlatformRole()
    if (role !== 'super_admin' && role !== 'platform_admin') {
      return NextResponse.json({ error: 'Unauthorized: Only platform admins can delete files' }, { status: 403 })
    }

    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    // Sanitize path to prevent directory traversal
    const normalized = path.normalize(url).replace(/^(\.\.(\/|\\|$))+/, '')

    let targetPath = ''
    if (normalized.startsWith('/uploads/') || normalized.startsWith('uploads/')) {
      const fileName = path.basename(normalized)
      targetPath = path.join(UPLOADS_DIR, fileName)
    } else if (normalized.startsWith('/branding/') || normalized.startsWith('branding/')) {
      const fileName = path.basename(normalized)
      targetPath = path.join(BRANDING_DIR, fileName)
    } else {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    try {
      await fs.unlink(targetPath)
    } catch (unlinkErr: any) {
      console.warn('fs.unlink failed, falling back to soft delete:', unlinkErr)
      // Even if file deletion fails on read-only environments (Vercel, Git-tracked),
      // we still proceed with soft-deleting it from the list!
    }

    // Register in the soft-delete system
    await addDeletedAsset(url)

    return NextResponse.json({ success: true, softDeleted: true })
  } catch (err: any) {
    console.error('Delete failed:', err)
    return NextResponse.json({ error: `Failed to delete file: ${err.message || err}` }, { status: 500 })
  }
}
