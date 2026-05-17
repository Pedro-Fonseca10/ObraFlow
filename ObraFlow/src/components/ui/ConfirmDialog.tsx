import { useEffect, useRef, useState } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  requireReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  tone?: 'default' | 'danger'
  onConfirm: (reason: string | null) => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  requireReason = false,
  reasonLabel = 'Motivo',
  reasonPlaceholder = 'Descreva o motivo desta alteração...',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [prevOpen, setPrevOpen] = useState(open)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setReason('')
      setError('')
    }
  }

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => textareaRef.current?.focus(), 50)
      return () => window.clearTimeout(id)
    }
  }, [open])

  if (!open) {
    return null
  }

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('Informe um motivo para prosseguir.')
      return
    }
    onConfirm(requireReason ? reason.trim() : null)
  }

  const confirmStyle =
    tone === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : 'bg-slate-900 hover:bg-slate-800 text-white'

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="font-heading text-xl font-black text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

        {requireReason && (
          <label className="mt-4 block text-sm font-semibold text-slate-700">
            {reasonLabel} *
            <textarea
              ref={textareaRef}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value)
                if (error) setError('')
              }}
              rows={3}
              placeholder={reasonPlaceholder}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
          </label>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${confirmStyle}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
