import { defineAsyncComponent, type Component } from 'vue'
import type { BlockType } from '~/types'

const blockRegistry: Record<BlockType, Component> = {
  'hero': defineAsyncComponent(() => import('./HeroBlock.vue')),
  'rich-text': defineAsyncComponent(() => import('./RichTextBlock.vue')),
  'grid': defineAsyncComponent(() => import('./GridBlock.vue')),
  'image': defineAsyncComponent(() => import('./ImageBlock.vue')),
  'gallery': defineAsyncComponent(() => import('./GalleryBlock.vue')),
  'video': defineAsyncComponent(() => import('./VideoBlock.vue')),
  'cta': defineAsyncComponent(() => import('./CtaBlock.vue')),
  'card-row': defineAsyncComponent(() => import('./CardRowBlock.vue')),
  'divider': defineAsyncComponent(() => import('./DividerBlock.vue')),
  'raw-html': defineAsyncComponent(() => import('./RawHtmlBlock.vue')),
}

export default blockRegistry

// ─── Block schema registry ──────────────────────────────────────────────────────
// Each block declares the editable props schema used by the admin panel
// to auto-generate the settings form. No extra admin UI code needed per block.

export interface PropSchema {
  type: 'text' | 'textarea' | 'richtext' | 'number' | 'boolean' | 'select' | 'image' | 'color' | 'url'
  label: string
  default?: unknown
  options?: { label: string; value: string }[] // for 'select'
  required?: boolean
}

export const blockSchemas: Record<BlockType, Record<string, PropSchema>> = {
  'hero': {
    heading: { type: 'text', label: 'Heading', required: true },
    subheading: { type: 'textarea', label: 'Subheading' },
    image: { type: 'image', label: 'Background Image' },
    ctaLabel: { type: 'text', label: 'Button Label' },
    ctaHref: { type: 'url', label: 'Button URL' },
    overlay: { type: 'boolean', label: 'Dark Overlay', default: true },
    height: { type: 'select', label: 'Height', default: 'lg', options: [
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
      { label: 'Full Screen', value: 'full' },
    ]},
  },
  'rich-text': {
    content: { type: 'richtext', label: 'Content', required: true },
    maxWidth: { type: 'select', label: 'Max Width', default: 'prose', options: [
      { label: 'Prose (65ch)', value: 'prose' },
      { label: 'Wide (90ch)', value: 'wide' },
      { label: 'Full', value: 'full' },
    ]},
  },
  'grid': {
    columns: { type: 'select', label: 'Columns', default: '3', options: [
      { label: '2', value: '2' },
      { label: '3', value: '3' },
      { label: '4', value: '4' },
    ]},
    gap: { type: 'select', label: 'Gap', default: 'md', options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
    ]},
    items: { type: 'textarea', label: 'Items (JSON)' },
  },
  'image': {
    src: { type: 'image', label: 'Image', required: true },
    alt: { type: 'text', label: 'Alt Text', required: true },
    caption: { type: 'text', label: 'Caption' },
    width: { type: 'select', label: 'Width', default: 'full', options: [
      { label: 'Full', value: 'full' },
      { label: 'Wide', value: 'wide' },
      { label: 'Medium', value: 'medium' },
    ]},
  },
  'gallery': {
    images: { type: 'textarea', label: 'Images (JSON array)' },
    columns: { type: 'number', label: 'Columns', default: 3 },
  },
  'video': {
    url: { type: 'url', label: 'Video URL (YouTube/Vimeo embed)', required: true },
    title: { type: 'text', label: 'Title' },
    aspectRatio: { type: 'select', label: 'Aspect Ratio', default: '16/9', options: [
      { label: '16:9', value: '16/9' },
      { label: '4:3', value: '4/3' },
      { label: '1:1', value: '1/1' },
    ]},
  },
  'cta': {
    heading: { type: 'text', label: 'Heading' },
    body: { type: 'textarea', label: 'Body Text' },
    primaryLabel: { type: 'text', label: 'Primary Button Label' },
    primaryHref: { type: 'url', label: 'Primary Button URL' },
    secondaryLabel: { type: 'text', label: 'Secondary Button Label' },
    secondaryHref: { type: 'url', label: 'Secondary Button URL' },
    background: { type: 'color', label: 'Background Color' },
  },
  'card-row': {
    cards: { type: 'textarea', label: 'Cards (JSON array)' },
    cardStyle: { type: 'select', label: 'Card Style', default: 'elevated', options: [
      { label: 'Elevated', value: 'elevated' },
      { label: 'Outlined', value: 'outlined' },
      { label: 'Flat', value: 'flat' },
    ]},
  },
  'divider': {
    style: { type: 'select', label: 'Style', default: 'line', options: [
      { label: 'Line', value: 'line' },
      { label: 'Space', value: 'space' },
      { label: 'Dots', value: 'dots' },
    ]},
    spacing: { type: 'select', label: 'Spacing', default: 'md', options: [
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
    ]},
  },
  'raw-html': {
    html: { type: 'textarea', label: 'HTML', required: true },
    dangerouslyDisableSanitize: { type: 'boolean', label: 'Disable Sanitization (admin only)', default: false },
  },
}
