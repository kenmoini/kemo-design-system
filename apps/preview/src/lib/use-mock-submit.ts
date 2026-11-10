'use client'
import { useState } from 'react'
import { mockSubmit, type MockSubmitValues } from './mock-auth'

/**
 * `error` and `isSubmitting` state around `mockSubmit`, wired the way a host wires a real call:
 * `submit` (the page's `onSubmit`) clears the error and rejects when the call fails, and
 * `onSubmitError` (the page's `onSubmitError`) turns that rejection into the `error` the page shows.
 */
export function useMockSubmit() {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(values: MockSubmitValues) {
    setError(null)
    setIsSubmitting(true)
    try {
      await mockSubmit(values)
    } finally {
      setIsSubmitting(false)
    }
  }

  function onSubmitError(cause: unknown) {
    setError(cause instanceof Error ? cause.message : String(cause))
  }

  return { error, isSubmitting, submit, onSubmitError }
}
