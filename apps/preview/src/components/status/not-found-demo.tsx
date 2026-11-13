'use client'
import { StatusDemo } from '@/components/status/status-demo'

/** The real 404: the library page is inert by contract, so the preview, as host, wires "Go back". */
export function NotFoundDemo() {
  return <StatusDemo page="404" onGoBack={() => window.history.back()} />
}
