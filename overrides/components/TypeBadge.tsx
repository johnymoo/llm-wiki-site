import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

export default (() => {
  const TypeBadge: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const type = fileData.frontmatter?.type as string | undefined
    if (!type) return null

    const label = type.charAt(0).toUpperCase() + type.slice(1)

    return (
      <span class="type-badge">
        {label}
      </span>
    )
  }

  TypeBadge.css = `
    .type-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--highlight);
      color: var(--secondary);
      margin-bottom: 0.5rem;
    }
  `

  return TypeBadge
}) satisfies QuartzComponentConstructor
