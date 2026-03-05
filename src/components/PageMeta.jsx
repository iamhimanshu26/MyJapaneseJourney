import { Helmet } from 'react-helmet-async'

export function PageMeta({ title, description }) {
  const fullTitle = title ? `${title} | My Japanese Journey` : 'My Japanese Journey'
  const desc = description || 'Learn Japanese with vocabulary, grammar, and AI-powered lookup. JLPT N5 to N1.'

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
    </Helmet>
  )
}
