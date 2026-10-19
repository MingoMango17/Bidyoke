import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/Button'

type Theme = 'light' | 'dark'

function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme
  if (set === 'light' || set === 'dark') return set
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme)

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    setTheme(next)
    try {
      localStorage.setItem('bidyoke:theme', next)
    } catch {
      // preference lasts until reload
    }
  }

  return (
    <Button variant="ghost" size="icon" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle}>
      {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  )
}
