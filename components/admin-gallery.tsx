'use client'

import { useEffect, useState, useRef } from 'react'
import { Upload, Trash2, Copy, Download, Check, Loader2, Image as ImageIcon, HardDrive } from 'lucide-react'

export function AdminGallery() {
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'uploads' | 'branding'>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchImages = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/uploads')
      if (res.ok) {
        const data = await res.json()
        setImages(data.images || [])
      }
    } catch (err) {
      console.error('Failed to load gallery images:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchImages()
  }, [])

  // Estimated storage calculation (average image ~180 KB)
  const estimatedSizeMB = Number(((images.length * 0.18)).toFixed(1))
  const maxStorageMB = 500
  const usagePercent = Math.min((estimatedSizeMB / maxStorageMB) * 100, 100)

  const handleUpload = async (file: File) => {
    if (!file) return

    // Ensure it's an image
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          setImages((prev) => {
            if (prev.includes(data.url)) return prev
            return [data.url, ...prev]
          })
        }
      } else {
        const errData = await res.json()
        alert(errData.error || 'No se pudo subir la imagen.')
      }
    } catch (err) {
      console.error('Upload error:', err)
      alert('Ocurrió un error al subir la imagen.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  const handleDelete = async (url: string) => {
    const fileName = url.split('/').pop()
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente la imagen "${fileName}"?`)) {
      return
    }

    try {
      const res = await fetch('/api/uploads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (res.ok) {
        setImages((prev) => prev.filter((img) => img !== url))
      } else {
        const data = await res.json()
        alert(data.error || 'No se pudo eliminar la imagen.')
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('Error al conectar con el servidor.')
    }
  }

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const filteredImages = images.filter((img) => {
    if (filterType === 'uploads') return img.startsWith('/uploads/')
    if (filterType === 'branding') return img.startsWith('/branding/')
    return true
  })

  return (
    <div className="space-y-6">
      {/* GitHub Repository Storage Progress Bar */}
      <div className="shell-panel p-4 border border-shell-line bg-black/30 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-cyan-400" />
            <span className="font-bold uppercase tracking-wider text-white">Almacenamiento del Repositorio (GitHub Free Tier)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
              ● Estado: Saludable
            </span>
            <span className="font-mono text-cyan-400 font-bold">
              {estimatedSizeMB} MB / 500 MB ({usagePercent.toFixed(1)}% Usado)
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-900 h-2.5 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-[#1274de] via-cyan-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${Math.max(usagePercent, 2)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>{images.length} archivos multimedia guardados</span>
          <span>Límite recomendado: 500 MB (Git Repo LFS)</span>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        id="gallery-drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed p-8 text-center transition-colors cursor-pointer rounded-none flex flex-col items-center justify-center min-h-[160px] ${
          dragging
            ? 'border-[#1274de] bg-[#1274de]/10 text-white'
            : 'border-shell-line bg-black/20 text-slate-400 hover:border-slate-500 hover:text-slate-200'
        }`}
        onClick={triggerFileInput}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {uploading ? (
          <div className="space-y-2 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#1274de]" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Comprimiendo y subiendo imagen...</p>
          </div>
        ) : (
          <div className="space-y-2 flex flex-col items-center">
            <Upload className="h-8 w-8 text-slate-450" />
            <p className="text-sm font-semibold">Arrastra y suelta una imagen aquí, o haz clic para buscar</p>
            <p className="text-xxs text-slate-500 uppercase tracking-widest">Soporta PNG, JPG, WEBP (se optimiza automáticamente a WebP)</p>
          </div>
        )}
      </div>

      {/* Gallery Header and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-shell-line pb-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Repositorio de Imágenes</h2>
          <p className="text-xs text-slate-450 mt-0.5">Administra los banners, logos y recursos gráficos de la plataforma.</p>
        </div>

        <div className="flex border border-shell-line bg-black/30 p-0.5 rounded-none w-fit text-xs">
          {(['all', 'uploads', 'branding'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 font-bold uppercase tracking-wider transition-colors rounded-none cursor-pointer ${
                filterType === type
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {type === 'all' ? 'Ver Todas' : type === 'uploads' ? 'Subidas' : 'Branding / Sistema'}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-[#1274de]" />
          <p className="text-xs text-slate-400 font-medium">Cargando galería de imágenes...</p>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="py-12 border border-shell-line bg-black/10 text-center rounded-none flex flex-col items-center justify-center space-y-2">
          <ImageIcon className="h-8 w-8 text-slate-600" />
          <p className="text-xs text-slate-400 font-medium">No se encontraron imágenes en esta categoría.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredImages.map((url) => {
            const fileName = url.split('/').pop() || ''
            const isBranding = url.startsWith('/branding/')

            return (
              <div
                key={url}
                className="group relative border border-shell-line bg-black/30 flex flex-col justify-between overflow-hidden rounded-none hover:border-slate-500 transition-colors"
              >
                {/* Visual Preview */}
                <div className="aspect-video w-full bg-black/40 relative flex items-center justify-center overflow-hidden border-b border-shell-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={fileName}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className={`absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 select-none ${
                    isBranding ? 'bg-amber-500/20 border border-amber-500/30 text-amber-200' : 'bg-blue-500/20 border border-blue-500/30 text-blue-200'
                  }`}>
                    {isBranding ? 'SISTEMA' : 'SUBIDA'}
                  </span>
                </div>

                {/* Details and Actions */}
                <div className="p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-300 truncate" title={fileName}>
                    {fileName}
                  </p>
                  <p className="text-xxs font-mono text-slate-500 truncate select-all">
                    {url}
                  </p>

                  <div className="grid grid-cols-3 gap-1 pt-1 border-t border-shell-line/40">
                    <button
                      onClick={() => handleCopy(url)}
                      title="Copiar ruta de imagen"
                      className="inline-flex justify-center items-center gap-1 p-1.5 border border-shell-line bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors rounded-none cursor-pointer text-xxs font-bold uppercase tracking-wider"
                    >
                      {copiedUrl === url ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    <a
                      href={url}
                      download={fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Descargar o abrir"
                      className="inline-flex justify-center items-center gap-1 p-1.5 border border-shell-line bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors rounded-none cursor-pointer text-xxs font-bold uppercase tracking-wider"
                    >
                      <Download className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => handleDelete(url)}
                      disabled={isBranding}
                      title={isBranding ? 'Las imágenes de branding del sistema no se pueden borrar' : 'Eliminar permanentemente'}
                      className={`inline-flex justify-center items-center gap-1 p-1.5 border transition-colors rounded-none cursor-pointer text-xxs font-bold uppercase tracking-wider ${
                        isBranding
                          ? 'border-transparent text-slate-600 cursor-not-allowed opacity-30'
                          : 'border-red-500/20 bg-red-500/5 hover:bg-red-600/20 text-red-400 hover:text-red-300'
                      }`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
