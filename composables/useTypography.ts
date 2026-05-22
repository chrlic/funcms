import type { SiteTypography, TextStyle, ThemeTokens } from '~/types'

/**
 * Provides site typography settings and derives CSS custom properties from them.
 * The `cssVars` string is injected into <head> on both the public renderer and admin.
 *
 * CSS variables exposed:
 *   --font-body      body font stack
 *   --font-heading   heading font stack
 *   --font-base-size root font size
 *   --ts-{slug}-family / --ts-{slug}-size / etc.  per named TextStyle
 */

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function slugifyStyle(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function tokensToCssVars(t: ThemeTokens): string {
  return [
    `--color-bg: ${t.background};`,
    `--color-surface: ${t.surface};`,
    `--color-border: ${t.border};`,
    `--color-text: ${t.textPrimary};`,
    `--color-text-secondary: ${t.textSecondary};`,
    `--color-heading: ${t.textHeading};`,
    `--color-accent: ${t.accent};`,
    `--color-accent-fg: ${t.accentFg};`,
  ].map(l => `  ${l}`).join('\n')
}

export const defaultLight: ThemeTokens = {
  background: '#ffffff',
  surface: '#f9fafb',
  border: '#e5e7eb',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textHeading: '#111827',
  accent: '#4f46e5',
  accentFg: '#ffffff',
}

export const defaultDark: ThemeTokens = {
  background: '#111827',
  surface: '#1f2937',
  border: '#374151',
  textPrimary: '#f9fafb',
  textSecondary: '#9ca3af',
  textHeading: '#f9fafb',
  accent: '#6366f1',
  accentFg: '#ffffff',
}

export function typographyToCss(typo: SiteTypography): string {
  const light = typo.light ?? defaultLight
  const dark = typo.dark ?? defaultDark

  const rootLines: string[] = [
    `--font-body: ${typo.bodyFont};`,
    `--font-heading: ${typo.headingFont};`,
    `--font-base-size: ${typo.baseSize};`,
  ]

  const styleRules: string[] = []

  for (const s of typo.styles) {
    const slug = slugifyStyle(s.name)
    const props: string[] = []
    if (s.fontFamily) props.push(`font-family: ${s.fontFamily};`)
    if (s.fontSize) props.push(`font-size: ${s.fontSize};`)
    if (s.fontWeight) props.push(`font-weight: ${s.fontWeight};`)
    if (s.lineHeight) props.push(`line-height: ${s.lineHeight};`)
    if (s.color) props.push(`color: ${s.color};`)
    if (props.length) styleRules.push(`.ts-${slug} { ${props.join(' ')} }`)
  }

  const vars = rootLines.map(l => `  ${l}`).join('\n')

  const css = [
    `:root {\n${vars}\n${tokensToCssVars(light)}\n}`,
    `.dark {\n${tokensToCssVars(dark)}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${tokensToCssVars(dark)}\n  }\n}`,
    `body { font-family: var(--font-body); font-size: var(--font-base-size); background-color: var(--color-bg); color: var(--color-text); }`,
    `.prose h1,.prose h2,.prose h3,.prose h4,.prose h5,.prose h6 { font-family: var(--font-heading); color: var(--color-heading); }`,
    `h1,h2,h3,h4,h5,h6 { font-family: var(--font-heading); color: var(--color-heading); }`,
    `a { color: var(--color-accent); }`,
    ...styleRules,
  ]

  return css.join('\n')
}

export function useTypography() {
  const { data } = useNuxtData<{ data: { typography?: SiteTypography } }>('site-settings')

  const typography = computed<SiteTypography>(() => data.value?.data?.typography ?? {
    bodyFont: 'system-ui, sans-serif',
    headingFont: 'system-ui, sans-serif',
    baseSize: '16px',
    styles: [],
  })

  const namedStyles = computed<TextStyle[]>(() => typography.value.styles ?? [])

  const cssVars = computed(() => typographyToCss(typography.value))

  return { typography, namedStyles, cssVars }
}
