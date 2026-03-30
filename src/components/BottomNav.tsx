"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Camera", icon: (active: boolean) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${active ? "text-white" : "text-white/40"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
  { href: "/learn", label: "Learn", icon: (active: boolean) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${active ? "text-white" : "text-white/40"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )},
  { href: "/rewards", label: "Rewards", icon: (active: boolean) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${active ? "text-white" : "text-white/40"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  )},
  { href: "/scenarios", label: "Scenes", icon: (active: boolean) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${active ? "text-white" : "text-white/40"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} points="9 22 9 12 15 12 15 22" />
    </svg>
  )},
  { href: "/story", label: "Stories", icon: (active: boolean) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${active ? "text-white" : "text-white/40"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )},
];

export default function BottomNav() {
  const path = usePathname();
  const active = (href: string) => href === "/" ? path === "/" : path.startsWith(href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10 pb-safe-bottom">
      <div className="flex items-center justify-around px-4 pt-2 pb-3">
        {TABS.map(tab => (
          <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-1 min-w-[56px] active:scale-90 transition">
            {tab.icon(active(tab.href))}
            <span className={`text-[10px] font-semibold ${active(tab.href) ? "text-white" : "text-white/40"}`}>
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
