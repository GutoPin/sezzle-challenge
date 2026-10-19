import { useTranslation } from 'react-i18next'

import { type ApiStatus, useApiStatus } from '../hooks/useApiStatus'

const dotColor: Record<ApiStatus, string> = {
  checking: 'bg-line-strong animate-pulse',
  online: 'bg-success',
  offline: 'bg-danger',
}

export function ApiStatusBadge() {
  const { t } = useTranslation()
  const status = useApiStatus()

  return (
    <p role="status" className="inline-flex items-center gap-2 text-sm text-ink-muted">
      <span className={`size-2 rounded-full ${dotColor[status]}`} aria-hidden="true" />
      {t(`status.${status}`)}
    </p>
  )
}
