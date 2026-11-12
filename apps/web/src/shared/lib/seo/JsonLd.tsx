interface JsonLdProps {
  data: Record<string, unknown>
}

export const JsonLd = ({ data }: JsonLdProps) => (
  <script
    type='application/ld+json'
    // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data; `<` is escaped so text can't close the tag
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
  />
)
