interface FeedbackMessageProps {
  type: 'success' | 'error' | 'info'
  message: string
}

const styleByType = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  error: 'border-rose-300 bg-rose-50 text-rose-800',
  info: 'border-sky-300 bg-sky-50 text-sky-800',
}

export function FeedbackMessage({ type, message }: FeedbackMessageProps) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm font-medium ${styleByType[type]}`}
      role="alert"
    >
      {message}
    </div>
  )
}
