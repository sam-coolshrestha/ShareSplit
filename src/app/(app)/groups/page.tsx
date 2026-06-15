export default function GroupsPage() {
  return <PlaceholderPage eyebrow="Groups" title="Your groups will live here" />
}

function PlaceholderPage({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl text-foreground">{title}</h1>
    </div>
  )
}
