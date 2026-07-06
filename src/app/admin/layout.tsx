"use client";

// Gemeinsames Layout für den Admin-Bereich mit Tab-Navigation.
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "📊 Dashboard" },
  { href: "/admin/llm", label: "🤖 LLM & Limits" },
  { href: "/admin/shops", label: "🛒 Shops" },
  { href: "/admin/awin", label: "🔗 AWIN" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="max-w-4xl mx-auto p-6 sm:p-8 space-y-6">
      <header className="space-y-4">
        <h1 className="text-2xl font-semibold">
          tschetti<span className="text-accent">.at</span> · Admin
        </h1>
        <nav className="flex gap-1 flex-wrap border-b border-cream-dark">
          {TABS.map((t) => {
            const active =
              t.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
                  active
                    ? "bg-card border-cream-dark text-ink -mb-px"
                    : "border-transparent text-ink-soft hover:text-accent"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </main>
  );
}
