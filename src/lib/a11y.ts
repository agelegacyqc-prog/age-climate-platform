import type { KeyboardEvent, FocusEvent } from 'react'

// Rend un élément non natif (div) navigable au clavier comme un bouton — RGAA 4.1, socle §Accessibilité
export function clickableCardProps(onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onActivate()
      }
    },
  }
}

// Focus visible 2 px à la couleur du module — socle §Inputs
export function focusRing(color: string) {
  return {
    onFocus: (e: FocusEvent<HTMLElement>) => {
      e.currentTarget.style.outline = `2px solid ${color}`
      e.currentTarget.style.outlineOffset = '2px'
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      e.currentTarget.style.outline = 'none'
    },
  }
}

export const AGEADAPT_PRIMARY = '#2F7D5C'