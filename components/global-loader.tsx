'use client'

import { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function GlobalLoader() {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Deactivate loading overlay when pathname or searchParams change (navigation finished)
  useEffect(() => {
    setIsLoading(false)
  }, [pathname, searchParams])

  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      // Find closest anchor tag
      let target = e.target as HTMLElement | null
      while (target && target.tagName !== 'A') {
        target = target.parentElement
      }

      if (target && target.tagName === 'A') {
        const anchor = target as HTMLAnchorElement
        const href = anchor.getAttribute('href')
        const targetAttr = anchor.getAttribute('target')
        const isDownload = anchor.hasAttribute('download')

        // Only show loader for internal navigations (not blank, download, mailto, tel, or hash links)
        if (
          href &&
          href.startsWith('/') &&
          !href.startsWith('/#') &&
          targetAttr !== '_blank' &&
          !isDownload &&
          !href.includes('mailto:') &&
          !href.includes('tel:')
        ) {
          setIsLoading(true)
        }
      }
    };

    const handleFormSubmit = (e: Event) => {
      // If the submit was prevented by React or custom JS, do not show the global loader
      if (e.defaultPrevented) return

      // Show loader on form submission (such as Server Actions or edits)
      setIsLoading(true)
    };

    // Global click listener for links
    window.addEventListener('click', handleLinkClick, { capture: true })
    // Global submit listener for forms (use bubbling phase so we can check e.defaultPrevented)
    window.addEventListener('submit', handleFormSubmit)

    return () => {
      window.removeEventListener('click', handleLinkClick, { capture: true })
      window.removeEventListener('submit', handleFormSubmit)
    }
  }, [])

  // Trigger event whenever isLoading changes to inform TopNav
  useEffect(() => {
    const event = new CustomEvent('rsx-loading', { detail: isLoading })
    window.dispatchEvent(event)
  }, [isLoading])

  // Auto-safety timeout to hide loader if navigation takes way too long or fails
  useEffect(() => {
    if (!isLoading) return
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 15000) // 15 seconds safety limit
    return () => clearTimeout(timer)
  }, [isLoading])

  if (!isLoading) return null

  return (
    <div className="fixed top-0 left-0 w-full h-[3.5px] bg-black/80 z-[99999] overflow-hidden pointer-events-none">
      {/* Base track with high-contrast motorsport gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-blue-600 to-[#1274de] opacity-90" />
      {/* Shimmer effect */}
      <div 
        className="absolute inset-y-0 bg-gradient-to-r from-transparent via-white/90 to-transparent w-1/3"
        style={{ animation: 'rsx-shimmer 1.2s infinite linear' }}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rsx-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}} />
    </div>
  )
}

