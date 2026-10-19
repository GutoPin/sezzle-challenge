import { useTranslation } from 'react-i18next'

import { useTheme } from '@/shared/theme/useTheme'

import { MonitorIcon, MoonIcon, SunIcon } from './icons'
import { SegmentedControl } from './SegmentedControl'

export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  return (
    <SegmentedControl
      label={t('header.theme.label')}
      value={theme}
      onChange={setTheme}
      options={[
        { value: 'light', label: t('header.theme.light'), content: <SunIcon /> },
        { value: 'dark', label: t('header.theme.dark'), content: <MoonIcon /> },
        { value: 'system', label: t('header.theme.system'), content: <MonitorIcon /> },
      ]}
    />
  )
}
