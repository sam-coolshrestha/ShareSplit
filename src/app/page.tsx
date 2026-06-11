import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

const features = [
  {
    number: '01',
    title: 'Split it your way',
    description: 'Equal, exact, percentage, or itemized. The math stays fair, even when dinner was not.',
    accent: 'bg-ember-400 text-obsidian',
  },
  {
    number: '02',
    title: 'Settle with UPI',
    description: 'Send the exact amount through your preferred UPI app. One tap, no calculator screenshots.',
    accent: 'bg-obsidian-50 text-obsidian',
  },
  {
    number: '03',
    title: 'Keep the peace',
    description: 'Shared balances, clear activity, and gentle reminders keep every group on the same page.',
    accent: 'bg-ember-100 text-obsidian',
  },
]

function hasSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) return false

  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
}

export default async function Home() {
  if (hasSupabaseConfig()) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) redirect('/dashboard')
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#131313] text-obsidian-50">
      <div className="comic-halftone fixed inset-0 pointer-events-none opacity-30" />

      <header className="relative z-20 border-b-4 border-obsidian-50 bg-[#131313] px-5 py-4 md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="font-display text-2xl font-black uppercase tracking-tight md:text-3xl">
            Share<span className="text-ember-400">Split</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="font-mono text-xs font-bold uppercase tracking-widest text-obsidian-100 transition hover:text-ember-300 sm:text-sm"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="comic-button hidden bg-ember-400 px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-obsidian sm:block"
            >
              Join free
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl items-center gap-12 px-5 py-16 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div>
          <div className="comic-label mb-7 inline-block -rotate-2 bg-ember-400 px-4 py-2 font-mono text-xs font-black uppercase tracking-[0.16em] text-obsidian">
            Issue #001: the bill strikes back
          </div>

          <h1 className="comic-title max-w-4xl font-display text-6xl font-black uppercase leading-[0.88] tracking-[-0.06em] text-ember-300 sm:text-7xl md:text-8xl lg:text-[7.2rem]">
            Split bills.
            <span className="mt-2 block text-obsidian-50">Not friendships.</span>
          </h1>

          <p className="comic-panel mt-8 max-w-xl rotate-1 bg-[#292522] p-5 text-base font-semibold leading-7 text-obsidian-100 sm:text-lg">
            ShareSplit makes group expenses painless. Track who paid, divide every rupee fairly,
            and settle up before the group chat gets dramatic.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              href="/login"
              className="comic-button bg-ember-400 px-7 py-4 font-mono text-sm font-black uppercase tracking-wider text-obsidian sm:text-base"
            >
              Start splitting
            </Link>
            <div className="comic-burst grid h-24 w-24 rotate-12 place-items-center bg-obsidian-50 text-center font-mono text-xs font-black uppercase leading-tight text-obsidian">
              100%
              <br />
              free
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg pb-8">
          <div className="comic-panel comic-orange-shadow relative rotate-2 bg-[#211e1c] p-5 sm:p-8">
            <div className="comic-tape -left-8 -top-2 -rotate-45" />
            <div className="comic-tape -bottom-2 -right-8 -rotate-45" />

            <div className="mb-6 flex items-center justify-between border-b-4 border-obsidian-50 pb-4">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-ember-300">
                  Weekend mission
                </p>
                <h2 className="mt-1 font-display text-3xl font-black uppercase">Goa Trip</h2>
              </div>
              <span className="comic-label -rotate-3 bg-ember-400 px-3 py-2 font-mono text-xs font-black text-obsidian">
                4 heroes
              </span>
            </div>

            <div className="space-y-4">
              <div className="comic-panel -rotate-1 bg-obsidian-50 p-4 text-obsidian">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-obsidian-500">
                      You are owed
                    </p>
                    <p className="mt-1 font-display text-4xl font-black">₹2,840</p>
                  </div>
                  <span className="text-4xl" aria-hidden="true">
                    POW!
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="comic-panel bg-ember-400 p-4 text-obsidian">
                  <p className="font-mono text-[10px] font-black uppercase tracking-widest">Dinner</p>
                  <p className="mt-3 font-display text-2xl font-black">₹3,200</p>
                </div>
                <div className="comic-panel bg-[#393330] p-4">
                  <p className="font-mono text-[10px] font-black uppercase tracking-widest text-ember-200">
                    Cab
                  </p>
                  <p className="mt-3 font-display text-2xl font-black">₹1,160</p>
                </div>
              </div>

              <div className="comic-panel rotate-1 bg-ember-100 p-4 text-center font-mono text-xs font-black uppercase tracking-widest text-obsidian">
                Tap once. Settle via UPI. Scene over.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y-4 border-obsidian bg-ember-400 px-5 py-20 text-obsidian md:px-10">
        <div className="comic-halftone-dark absolute inset-0 pointer-events-none opacity-20" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.2em]">Origin story</p>
              <h2 className="mt-3 max-w-3xl font-display text-5xl font-black uppercase leading-none tracking-tight sm:text-6xl">
                Fair math. Fast settlements. Zero drama.
              </h2>
            </div>
            <p className="comic-panel max-w-sm -rotate-1 bg-obsidian-50 p-4 font-mono text-xs font-bold uppercase leading-5">
              Built for trips, flatmates, events, and every “I’ll pay you later” moment.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
              <article
                key={feature.number}
                className={`comic-panel comic-dark-shadow ${feature.accent} p-6 ${
                  index === 1 ? 'md:-translate-y-4 md:rotate-1' : index === 2 ? 'md:-rotate-1' : ''
                }`}
              >
                <p className="font-mono text-sm font-black">{feature.number} / SUPERPOWER</p>
                <h3 className="mt-8 font-display text-3xl font-black uppercase leading-none">
                  {feature.title}
                </h3>
                <p className="mt-4 text-sm font-semibold leading-6">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-5 py-24 text-center md:px-10">
        <div className="comic-speech mx-auto max-w-3xl -rotate-1 bg-obsidian-50 p-8 text-obsidian sm:p-12">
          <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-ember-600">
            To be continued...
          </p>
          <h2 className="mt-4 font-display text-5xl font-black uppercase leading-none tracking-tight sm:text-6xl">
            Ready to defeat the group bill?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base font-semibold leading-7 text-obsidian-600">
            Start free, invite your people, and let ShareSplit handle the arithmetic.
          </p>
        </div>
        <Link
          href="/login"
          className="comic-button mt-12 inline-block bg-ember-400 px-8 py-4 font-mono text-sm font-black uppercase tracking-wider text-obsidian"
        >
          Enter ShareSplit
        </Link>
      </section>

      <footer className="relative z-10 border-t-4 border-obsidian-50 px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 font-mono text-xs font-bold uppercase tracking-wider text-obsidian-200 sm:flex-row sm:items-center sm:justify-between">
          <span>ShareSplit comic edition</span>
          <span>No paywalls. No awkward math.</span>
        </div>
      </footer>
    </main>
  )
}
