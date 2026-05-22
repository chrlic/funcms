import type { SiteTypography, TextStyle } from '~/types'

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

export function typographyToCss(typo: SiteTypography): string {
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
  const base = `:root {\n${vars}\n}\nbody { font-family: var(--font-body); font-size: var(--font-base-size); }\n.prose h1,.prose h2,.prose h3,.prose h4,.prose h5,.prose h6 { font-family: var(--font-heading); }\nh1,h2,h3,h4,h5,h6 { font-family: var(--font-heading); }`
  return styleRules.length ? `${base}\n${styleRules.join('\n')}` : base
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
