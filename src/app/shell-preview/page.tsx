import { AppShell } from '@/components/layout/AppShell'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'

export default function ShellPreviewPage() {
  return (
    <AppShell
      user={{
        displayName: 'Preview User',
        email: 'preview@sharesplit.app',
        avatarUrl: null,
      }}
    >
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          Responsive preview
        </p>
        <h1 className="mt-2 font-display text-4xl text-foreground">ShareSplit app shell</h1>
        <Card priority className="mt-8">
          <CardHeader>
            <CardTitle>Desktop and mobile navigation</CardTitle>
            <CardDescription>
              Resize the browser to verify the sidebar, topbar, bottom navigation, and theme toggle.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  )
}
