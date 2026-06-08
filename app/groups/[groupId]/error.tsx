"use client"

export default function GroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <p className="text-text-muted">Something went wrong loading this page.</p>
      <button
        onClick={reset}
        className="text-sm text-primary underline hover:text-primary-hover"
      >
        Try again
      </button>
    </div>
  )
}
