'use client'

// Throws on every render so the preview's `app/error.tsx` boundary (the 500 status page) shows. A
// client page, so in a production build the boundary catches it in the browser.
export default function ThrowRoute(): never {
  throw new Error('Preview: intentional render error')
}
