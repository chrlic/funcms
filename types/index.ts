// ─── Block System ──────────────────────────────────────────────────────────────

export type BuiltinBlockType =
  | 'hero'
  | 'rich-text'
  | 'media-text'
  | 'grid'
  | 'image'
  | 'gallery'
  | 'video'
  | 'cta'
  | 'card-row'
  | 'divider'
  | 'raw-html'

// Custom block types are stored in content repo; type string is their slug (e.g. 'my-block')
export type BlockType = BuiltinBlockType | string

// ─── Custom Block Types ────────────────────────────────────────────────────────

export interface CustomBlockField {
  name: string
  type: 'text' | 'textarea' | 'richtext' | 'number' | 'boolean' | 'select' | 'image' | 'color' | 'url'
  label: string
  default?: unknown
  options?: { label: string; value: string }[]
  required?: boolean
}

export interface CustomBlockType {
  _id?: string
  slug: string          // unique identifier used as block type, e.g. 'testimonial-card'
  label: string         // human name shown in picker, e.g. 'Testimonial Card'
  description?: string
  source: string        // original SFC source (template + script)
  compiledJs: string    // compiled render function JS (server-evaluated on both SSR + client)
  fields: CustomBlockField[]  // schema for admin form auto-generation
  createdAt?: string
  updatedAt?: string
  createdBy?: string
}

export interface Block {
  id: string
  type: BlockType
  order: number
  slot: string         // layout slot: 'main' | 'sidebar' | 'hero' | etc.
  visible: boolean
  props: Record<string, unknown>
  customCss?: string
}

export interface PageStyle {
  bgImage?: string
  bgColor?: string
  bgSize?: 'cover' | 'contain' | 'auto'
  bgPosition?: string
  bgFixed?: boolean
  bgOverlay?: number    // 0–100 opacity of a dark overlay
  customCss?: string
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export type PageStatus = 'draft' | 'published' | 'archived'

export type LayoutType =
  | 'full-width'
  | 'sidebar-left'
  | 'sidebar-right'
  | 'landing'
  | 'blank'

export interface PageMeta {
  title: string
  description?: string
  ogImage?: string
  noIndex?: boolean
  canonical?: string
}

export interface PageLayoutOptions {
  sidebarWidth?: number  // percentage 10–50, only used by sidebar-left / sidebar-right
}

export interface LocaleVariant {
  title: string
  meta: PageMeta
  blocks: Block[]
  status: PageStatus
}

export interface Page {
  _id?: string
  slug: string           // canonical slug, no locale prefix, e.g. "/about/team"
  title: string          // default locale title (fallback)
  layout: LayoutType     // shared across all locales
  layoutOptions?: PageLayoutOptions
  style?: PageStyle
  status: PageStatus     // default locale status (fallback)
  meta: PageMeta         // default locale meta (fallback)
  blocks: Block[]        // default locale blocks (fallback)
  locales?: Record<string, LocaleVariant>  // locale code → variant; absence = use root fields
  createdAt?: string
  updatedAt?: string
  createdBy?: string
}

// ─── Media ─────────────────────────────────────────────────────────────────────

export interface FocalPoint {
  x: number   // 0–1 (left → right)
  y: number   // 0–1 (top → bottom)
}

export interface MediaItem {
  _id?: string
  filename: string
  originalName: string
  mimeType: string
  size: number           // bytes
  width?: number
  height?: number
  url: string
  alt?: string
  focalPoint?: FocalPoint
  createdAt?: string
}

// ─── Auth / Users ──────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'editor' | 'viewer'

export interface User {
  _id?: string
  email: string
  name: string
  role: UserRole
  createdAt?: string
}

// ─── Site Settings ─────────────────────────────────────────────────────────────

export interface NavItem {
  label: string
  href: string           // page slug (e.g. "/about") or external URL
  newTab?: boolean
  children?: NavItem[]
}

export type NavStyle = 'topbar' | 'sidebar-left'

// ─── Typography ────────────────────────────────────────────────────────────────

export interface TextStyle {
  name: string        // e.g. "Body", "Pull Quote"
  fontFamily: string  // e.g. "Georgia, serif"
  fontSize: string    // e.g. "1rem", "18px"
  fontWeight?: string // e.g. "400", "700"
  lineHeight?: string // e.g. "1.6"
  color?: string      // e.g. "#1a1a1a"
}

export interface ThemeTokens {
  background: string      // e.g. "#ffffff"
  surface: string         // cards, panels
  border: string          // dividers
  textPrimary: string     // body text
  textSecondary: string   // muted text
  textHeading: string     // headings
  accent: string          // links, buttons, highlights
  accentFg: string        // text on accent background
}

export interface SiteTypography {
  bodyFont: string        // CSS font-family for base body text
  headingFont: string     // CSS font-family for h1–h6
  baseSize: string        // root font size, e.g. "16px"
  styles: TextStyle[]     // named styles available in rich-text toolbar
  light?: ThemeTokens
  dark?: ThemeTokens
}

export interface Locale {
  code: string       // e.g. 'en', 'cs', 'en-us'
  label: string      // e.g. 'English', 'Česky'
  default?: boolean  // exactly one locale should be default
}

export type FooterColWidth = '1/4' | '1/3' | '1/2' | '2/3' | '3/4' | 'full'

export interface FooterColVisibility {
  sm: boolean   // ≥640px
  md: boolean   // ≥768px
  lg: boolean   // ≥1024px
  xl: boolean   // ≥1280px
}

export interface FooterColumn {
  id: string
  block: Block
  width: FooterColWidth
  /** Smallest breakpoint at which this column is visible. Hidden below it. */
  showFrom: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Largest breakpoint at which this column is visible. Hidden above it. '' = always */
  hideFrom: '' | 'sm' | 'md' | 'lg' | 'xl'
}

// ─── Page Templates ────────────────────────────────────────────────────────────

export interface PageTemplate {
  _id?: string
  name: string
  description?: string
  layout: LayoutType
  blocks: Block[]
  createdAt?: string
  createdBy?: string
}

export interface SiteSettings {
  siteName: string
  tagline?: string
  logo?: string
  favicon?: string
  navStyle?: NavStyle
  nav: NavItem[]
  navLocales?: Record<string, NavItem[]>  // per-locale nav overrides; key = locale code
  footerColumns?: FooterColumn[]
  footerLocales?: Record<string, FooterColumn[]>  // per-locale footer overrides; key = locale code
  footerPadding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  socialLinks: Record<string, string>
  customCss?: string
  headScripts?: string
  typography?: SiteTypography
  locales?: Locale[]                       // configured locales; empty = no i18n
}

// ─── API Responses ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
