export interface CssHint {
  selector: string   // relative to the scope root — shown as-is to the editor
  element: string    // plain-english label
  example: string    // one useful CSS property example
}

export interface CssHintGroup {
  label: string
  hints: CssHint[]
}

// Block-type hints — selector is relative to .block-{id}
const blockHints: Record<string, CssHintGroup[]> = {
  'hero': [
    { label: 'Container', hints: [
      { selector: '&', element: 'Hero section', example: 'min-height: 80vh' },
    ]},
    { label: 'Text', hints: [
      { selector: 'h1', element: 'Main heading', example: 'font-size: 5rem; letter-spacing: -0.02em' },
      { selector: '.prose', element: 'Subheading area', example: 'font-size: 1.25rem; opacity: 0.85' },
    ]},
    { label: 'Button', hints: [
      { selector: 'a', element: 'CTA button', example: 'background: #6366f1; border-radius: 0.5rem' },
      { selector: 'a:hover', element: 'CTA button hover', example: 'background: #4f46e5' },
    ]},
    { label: 'Background', hints: [
      { selector: 'img', element: 'Background image', example: 'object-position: top center' },
      { selector: 'div:nth-child(2)', element: 'Dark overlay div', example: 'opacity: 0.3' },
    ]},
    { label: 'Mobile (≤ 768px)', hints: [
      { selector: '@media (max-width: 768px) { & section', element: 'Hero on mobile', example: 'min-height: 50vh; padding: 2rem 1rem }' },
      { selector: '@media (max-width: 768px) { & h1', element: 'Heading on mobile', example: 'font-size: 2.25rem }' },
      { selector: '@media (max-width: 768px) { & a', element: 'Button on mobile', example: 'width: 100%; text-align: center }' },
    ]},
  ],

  'rich-text': [
    { label: 'Container', hints: [
      { selector: '&', element: 'Outer wrapper', example: 'padding: 3rem 1.5rem' },
      { selector: '.prose', element: 'Prose content area', example: 'max-width: 75ch' },
    ]},
    { label: 'Typography', hints: [
      { selector: '.prose h1', element: 'H1 heading', example: 'font-size: 3rem; color: #1e293b' },
      { selector: '.prose h2', element: 'H2 heading', example: 'font-size: 2rem; border-bottom: 2px solid #e2e8f0' },
      { selector: '.prose h3', element: 'H3 heading', example: 'font-size: 1.5rem' },
      { selector: '.prose p', element: 'Paragraph', example: 'line-height: 1.8; color: #374151' },
      { selector: '.prose a', element: 'Link', example: 'color: #6366f1; text-decoration: underline' },
      { selector: '.prose strong', element: 'Bold text', example: 'color: #111827' },
      { selector: '.prose ul li', element: 'Bullet list item', example: 'list-style-type: square' },
      { selector: '.prose ol li', element: 'Numbered list item', example: 'color: #374151' },
      { selector: '.prose blockquote', element: 'Blockquote', example: 'border-left: 4px solid #6366f1; background: #f5f3ff' },
      { selector: '.prose code', element: 'Inline code', example: 'background: #f1f5f9; border-radius: 0.25rem' },
      { selector: '.prose pre', element: 'Code block', example: 'background: #1e293b; color: #e2e8f0' },
      { selector: '.prose hr', element: 'Horizontal rule', example: 'border-color: #e2e8f0; margin: 2rem 0' },
    ]},
    { label: 'Mobile (≤ 768px)', hints: [
      { selector: '@media (max-width: 768px) { &', element: 'Wrapper on mobile', example: 'padding: 1.5rem 1rem }' },
      { selector: '@media (max-width: 768px) { & .prose h1', element: 'H1 on mobile', example: 'font-size: 1.75rem }' },
      { selector: '@media (max-width: 768px) { & .prose h2', element: 'H2 on mobile', example: 'font-size: 1.5rem }' },
    ]},
  ],

  'media-text': [
    { label: 'Layout', hints: [
      { selector: '&', element: 'Row wrapper', example: 'gap: 3rem; padding: 4rem 1.5rem' },
      { selector: '& > div:first-child', element: 'Image column', example: 'align-self: start' },
      { selector: '& > div:last-child', element: 'Text column', example: 'padding: 1rem 0' },
    ]},
    { label: 'Image', hints: [
      { selector: 'img', element: 'Image', example: 'border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.15)' },
      { selector: 'figcaption', element: 'Image caption', example: 'font-style: italic; color: #6b7280' },
    ]},
    { label: 'Text', hints: [
      { selector: '.prose', element: 'Rich text area', example: 'font-size: 1.125rem' },
      { selector: '.prose h2', element: 'Heading', example: 'font-size: 2.5rem; margin-bottom: 1rem' },
      { selector: '.prose p', element: 'Paragraph', example: 'line-height: 1.75' },
    ]},
    { label: 'Mobile (≤ 768px)', hints: [
      { selector: '@media (max-width: 768px) { & > div:first-child', element: 'Image on mobile (stacked)', example: 'width: 100% }' },
      { selector: '@media (max-width: 768px) { & img', element: 'Image on mobile', example: 'max-height: 280px; object-fit: cover }' },
      { selector: '@media (max-width: 768px) { &', element: 'Row on mobile', example: 'padding: 2rem 1rem; gap: 1.5rem }' },
    ]},
  ],

  'cta': [
    { label: 'Container', hints: [
      { selector: 'section', element: 'CTA section', example: 'background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 1.5rem' },
    ]},
    { label: 'Text', hints: [
      { selector: 'h2', element: 'Heading', example: 'font-size: 2.5rem; font-weight: 800' },
      { selector: '.prose', element: 'Body text', example: 'font-size: 1.2rem; opacity: 0.9' },
    ]},
    { label: 'Buttons', hints: [
      { selector: 'a:first-of-type', element: 'Primary button', example: 'background: white; color: #6366f1; border-radius: 9999px' },
      { selector: 'a:last-of-type', element: 'Secondary button', example: 'border: 2px solid white; border-radius: 9999px' },
      { selector: 'a:hover', element: 'Button hover', example: 'transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2)' },
    ]},
    { label: 'Mobile (≤ 768px)', hints: [
      { selector: '@media (max-width: 768px) { & section', element: 'CTA on mobile', example: 'padding: 2.5rem 1.25rem }' },
      { selector: '@media (max-width: 768px) { & h2', element: 'Heading on mobile', example: 'font-size: 1.75rem }' },
      { selector: '@media (max-width: 768px) { & a', element: 'Buttons on mobile (full width)', example: 'width: 100%; display: block }' },
    ]},
  ],

  'image': [
    { label: 'Figure', hints: [
      { selector: 'figure', element: 'Figure wrapper', example: 'margin: 2rem 0' },
      { selector: 'img', element: 'Image', example: 'border-radius: 1rem; box-shadow: 0 4px 24px rgba(0,0,0,0.1)' },
      { selector: 'figcaption', element: 'Caption', example: 'font-style: italic; font-size: 0.875rem; color: #6b7280' },
    ]},
    { label: 'Mobile (≤ 768px)', hints: [
      { selector: '@media (max-width: 768px) { & img', element: 'Image on mobile', example: 'border-radius: 0.5rem }' },
    ]},
  ],

  'gallery': [
    { label: 'Grid', hints: [
      { selector: '& > div', element: 'Grid container', example: 'gap: 0.5rem' },
      { selector: 'figure', element: 'Each image cell', example: 'border-radius: 0.5rem; overflow: hidden' },
      { selector: 'img', element: 'Gallery image', example: 'object-fit: cover; aspect-ratio: 1/1' },
      { selector: 'figcaption', element: 'Image caption', example: 'font-size: 0.75rem; padding: 0.25rem 0.5rem' },
    ]},
    { label: 'Mobile (≤ 768px)', hints: [
      { selector: '@media (max-width: 640px) { & > div', element: 'Force single column on mobile', example: 'grid-template-columns: 1fr !important }' },
      { selector: '@media (max-width: 640px) { & img', element: 'Image height on mobile', example: 'height: 200px }' },
    ]},
  ],

  'video': [
    { label: 'Container', hints: [
      { selector: '&', element: 'Block wrapper', example: 'margin: 2rem 0' },
      { selector: 'p', element: 'Video title', example: 'font-weight: 700; font-size: 1.25rem' },
      { selector: 'iframe', element: 'Video iframe', example: 'border-radius: 0.75rem' },
    ]},
    { label: 'Mobile (≤ 768px)', hints: [
      { selector: '@media (max-width: 768px) { &', element: 'Wrapper on mobile', example: 'margin: 1rem 0 }' },
      { selector: '@media (max-width: 768px) { & p', element: 'Title on mobile', example: 'font-size: 1rem }' },
    ]},
  ],

  'card-row': [
    { label: 'Grid', hints: [
      { selector: '& > div', element: 'Cards grid', example: 'gap: 1.5rem' },
    ]},
    { label: 'Card', hints: [
      { selector: '& > div > div', element: 'Individual card', example: 'border-radius: 1rem; box-shadow: 0 4px 16px rgba(0,0,0,0.08)' },
      { selector: 'img', element: 'Card image', example: 'height: 200px; object-fit: cover' },
      { selector: 'h3', element: 'Card title', example: 'font-size: 1.25rem; font-weight: 700' },
      { selector: 'p', element: 'Card body text', example: 'color: #6b7280; line-height: 1.6' },
      { selector: 'a', element: 'Card link', example: 'color: #6366f1; font-weight: 600' },
    ]},
    { label: 'Mobile (≤ 640px)', hints: [
      { selector: '@media (max-width: 640px) { & > div', element: 'Force single column on mobile', example: 'grid-template-columns: 1fr !important }' },
      { selector: '@media (max-width: 640px) { & img', element: 'Card image on mobile', example: 'height: 160px }' },
    ]},
  ],

  'divider': [
    { label: 'Elements', hints: [
      { selector: 'hr', element: 'Divider line', example: 'border-color: #6366f1; border-width: 2px' },
      { selector: 'span', element: 'Dot (dots style)', example: 'background: #6366f1; width: 6px; height: 6px' },
    ]},
  ],

  'raw-html': [
    { label: 'Wrapper', hints: [
      { selector: '&', element: 'HTML wrapper div', example: 'padding: 2rem; background: #f8fafc' },
    ]},
    { label: 'Mobile (≤ 768px)', hints: [
      { selector: '@media (max-width: 768px) { &', element: 'Wrapper on mobile', example: 'padding: 1rem; overflow-x: auto }' },
    ]},
  ],

  'grid': [
    { label: 'Grid', hints: [
      { selector: '&', element: 'Grid container', example: 'gap: 1.5rem; padding: 2rem 0' },
      { selector: '& > div', element: 'Grid cell', example: 'background: #f8fafc; border-radius: 0.75rem' },
    ]},
    { label: 'Mobile (≤ 640px)', hints: [
      { selector: '@media (max-width: 640px) { &', element: 'Force single column on mobile', example: 'grid-template-columns: 1fr !important }' },
    ]},
  ],
}

// Page-level hints — used in the page Appearance CSS editor
export const pageCssHints: CssHintGroup[] = [
  { label: 'Page', hints: [
    { selector: 'main', element: 'Page content area', example: 'padding-top: 2rem' },
  ]},
  { label: 'Navigation — top bar', hints: [
    { selector: 'header', element: 'Nav bar', example: 'background: #1e1b4b; border-bottom: none' },
    { selector: 'header a', element: 'Nav links', example: 'color: white; font-weight: 500' },
    { selector: 'header a:hover', element: 'Nav link hover', example: 'color: #a5b4fc' },
    { selector: 'header nav > div > button', element: 'Dropdown trigger', example: 'color: white' },
    { selector: 'header span', element: 'Site name', example: 'color: white; font-size: 1.25rem' },
    { selector: 'header img', element: 'Logo image', example: 'height: 2.5rem' },
  ]},
  { label: 'Navigation — left sidebar', hints: [
    { selector: 'aside', element: 'Sidebar container', example: 'background: #1e1b4b; color: white' },
    { selector: 'aside a', element: 'Sidebar links', example: 'color: #c7d2fe; padding: 0.5rem 1rem' },
    { selector: 'aside a:hover', element: 'Sidebar link hover', example: 'background: rgba(255,255,255,0.1); color: white' },
    { selector: 'aside span', element: 'Site name / section labels', example: 'color: white; font-weight: 700' },
  ]},
  { label: 'Layout', hints: [
    { selector: '.layout-full-width', element: 'Full-width layout wrapper', example: 'max-width: 100%; padding: 0' },
    { selector: '.layout-sidebar-left aside', element: 'Sidebar column', example: 'background: #f8fafc' },
    { selector: '.layout-sidebar-right aside', element: 'Right sidebar column', example: 'background: #f8fafc' },
  ]},
  { label: 'Mobile (≤ 768px)', hints: [
    { selector: '@media (max-width: 768px) { main', element: 'Page content on mobile', example: 'padding: 0 }' },
    { selector: '@media (max-width: 768px) { .layout-sidebar-left', element: 'Sidebar layout on mobile (stacked)', example: 'flex-direction: column }' },
    { selector: '@media (max-width: 768px) { .layout-sidebar-left aside', element: 'Sidebar on mobile', example: 'width: 100% !important; order: 2 }' },
  ]},
]

// Global/site-level hints — used in Settings > Custom CSS
export const siteCssHints: CssHintGroup[] = [
  { label: 'Typography', hints: [
    { selector: 'body', element: 'Body text', example: 'font-family: "Inter", sans-serif; font-size: 16px' },
    { selector: 'h1, h2, h3', element: 'All headings', example: 'font-family: "Playfair Display", serif' },
    { selector: 'a', element: 'All links', example: 'color: #6366f1' },
  ]},
  { label: 'Colours', hints: [
    { selector: ':root', element: 'CSS custom properties', example: '--brand: #6366f1; --brand-dark: #4f46e5' },
  ]},
  { label: 'Navigation', hints: [
    { selector: 'header', element: 'Top nav bar', example: 'background: var(--brand); border: none' },
    { selector: 'header a', element: 'Nav links', example: 'color: white' },
    { selector: 'aside', element: 'Left sidebar nav', example: 'background: #0f172a' },
  ]},
  { label: 'Blocks (all)', hints: [
    { selector: '[class*="block-"]', element: 'Every block wrapper', example: 'transition: opacity 0.3s' },
  ]},
  { label: 'Mobile (≤ 768px)', hints: [
    { selector: '@media (max-width: 768px) { body', element: 'Body on mobile', example: 'font-size: 15px }' },
    { selector: '@media (max-width: 768px) { h1', element: 'H1 on mobile', example: 'font-size: 2rem }' },
    { selector: '@media (max-width: 768px) { h2', element: 'H2 on mobile', example: 'font-size: 1.5rem }' },
    { selector: '@media (max-width: 768px) { header', element: 'Nav bar on mobile', example: 'padding: 0 1rem }' },
  ]},
]

export function getBlockHints(blockType: string): CssHintGroup[] {
  return blockHints[blockType] ?? []
}
