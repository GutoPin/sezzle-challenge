import { useTranslation } from 'react-i18next'

import { ApiStatusBadge, CalculatorWorkspace } from '@/features/calculator'
import { BookIcon } from '@/shared/ui/icons'
import { LanguageSwitch } from '@/shared/ui/LanguageSwitch'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'
import { Wordmark } from '@/shared/ui/Wordmark'

import { AppProviders } from './providers'

function Shell() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 sm:px-8">
      <header className="flex items-center justify-between gap-3 py-4">
        <a href="/" className="rounded-sm">
          <Wordmark />
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/docs"
            className="inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-full text-sm font-medium text-ink-muted transition-colors duration-(--q-duration-quick) hover:text-ink sm:px-2"
          >
            <BookIcon />
            <span className="max-sm:sr-only">{t('header.apiDocs')}</span>
          </a>
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 pt-6 pb-16 sm:pt-10">
        <CalculatorWorkspace
          intro={
            <>
              <h1 className="text-display font-semibold text-balance">{t('hero.title')}</h1>
              <p className="max-w-[56ch] pt-3 text-pretty text-ink-muted">{t('hero.body')}</p>
            </>
          }
        />
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line py-6 text-sm text-ink-muted">
        <p>{t('app.tagline')}</p>
        <ApiStatusBadge />
      </footer>
    </div>
  )
}

export function App() {
  return (
    <AppProviders>
      <Shell />
    </AppProviders>
  )
}
