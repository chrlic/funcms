import type { Component } from 'vue'
import type { BlockType } from '~/types'
import HeroBlock from './HeroBlock.vue'
import RichTextBlock from './RichTextBlock.vue'
import MediaTextBlock from './MediaTextBlock.vue'
import GridBlock from './GridBlock.vue'
import ImageBlock from './ImageBlock.vue'
import GalleryBlock from './GalleryBlock.vue'
import VideoBlock from './VideoBlock.vue'
import CtaBlock from './CtaBlock.vue'
import CardRowBlock from './CardRowBlock.vue'
import DividerBlock from './DividerBlock.vue'
import RawHtmlBlock from './RawHtmlBlock.vue'
import GlobalBlock from './GlobalBlock.vue'

const blockRegistry: Record<BlockType, Component> = {
  'hero': HeroBlock,
  'rich-text': RichTextBlock,
  'media-text': MediaTextBlock,
  'grid': GridBlock,
  'image': ImageBlock,
  'gallery': GalleryBlock,
  'video': VideoBlock,
  'cta': CtaBlock,
  'card-row': CardRowBlock,
  'divider': DividerBlock,
  'raw-html': RawHtmlBlock,
  'global': GlobalBlock,
}

export default blockRegistry

// ─── Human-readable block type labels ──────────────────────────────────────────

export const builtinBlockTypes: { type: BlockType; label: string }[] = [
  { type: 'hero',       label: 'Hero' },
  { type: 'rich-text',  label: 'Rich Text' },
  { type: 'media-text', label: 'Media + Text' },
  { type: 'grid',       label: 'Grid' },
  { type: 'image',      label: 'Image' },
  { type: 'gallery',    label: 'Gallery' },
  { type: 'video',      label: 'Video' },
  { type: 'cta',        label: 'Call to Action' },
  { type: 'card-row',   label: 'Card Row' },
  { type: 'divider',    label: 'Divider' },
  { type: 'raw-html',   label: 'Raw HTML' },
  { type: 'global',     label: 'Global Component' },
]

// ─── Block schema registry ──────────────────────────────────────────────────────
// Each block declares the editable props schema used by the admin panel
// to auto-generate the settings form. No extra admin UI code needed per block.

export interface PropSchema {
  type: 'text' | 'textarea' | 'richtext' | 'number' | 'boolean' | 'select' | 'image' | 'color' | 'url' | 'global-component'
  label: string
  default?: unknown
  options?: { label: string; value: string }[] // for 'select'
  required?: boolean
}

export const blockSchemas: Record<BlockType, Record<string, PropSchema>> = {
  'hero': {
    heading: { type: 'text', label: 'Heading', required: true },
    subheading: { type: 'richtext', label: 'Subheading' },
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
    fontFamily: { type: 'text', label: 'Font Family override', default: '' },
    fontSize: { type: 'text', label: 'Font Size override', default: '' },
  },
  'media-text': {
    image: { type: 'image', label: 'Image', required: true },
    imageAlt: { type: 'text', label: 'Image Alt Text' },
    layout: { type: 'select', label: 'Layout', default: 'columns', options: [
      { label: 'Columns (side-by-side)', value: 'columns' },
      { label: 'Float (text wraps)', value: 'float' },
    ]},
    imagePosition: { type: 'select', label: 'Image Side', default: 'left', options: [
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
    ]},
    imageWidth: { type: 'select', label: 'Image Width', default: 'half', options: [
      { label: '1/3', value: 'third' },
      { label: '1/2', value: 'half' },
      { label: '2/3', value: 'two-thirds' },
    ]},
    verticalAlign: { type: 'select', label: 'Vertical Align (columns only)', default: 'center', options: [
      { label: 'Top', value: 'top' },
      { label: 'Center', value: 'center' },
      { label: 'Bottom', value: 'bottom' },
    ]},
    caption: { type: 'text', label: 'Image Caption' },
    content: { type: 'richtext', label: 'Text Content', required: true },
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
    body: { type: 'richtext', label: 'Body Text' },
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
    dividerStyle: { type: 'select', label: 'Style', default: 'line', options: [
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
  'global': {
    globalId: { type: 'global-component', label: 'Global Component', required: true },
  },
}
