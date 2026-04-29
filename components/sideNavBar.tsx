"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  ShoppingCart,
  Users,
  Workflow,
  Settings,
  Activity,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/integrations", label: "Integrations", icon: Workflow },
];

const linkBase =
  "flex items-center gap-3 px-4 py-3 transition-colors duration-50 ease-technical";
const linkInactive =
  "text-on-primary/60 hover:bg-on-primary/10 hover:text-on-primary";
const linkActive =
  "border-l-2 border-accent-magenta bg-on-primary/5 text-on-primary";

export function SideNavBar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 left-0 z-50 flex h-screen w-60 flex-col border-r border-outline-variant/20 bg-primary-container font-sans text-on-primary tracking-tight">
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent-magenta">
            <Activity className="h-4 w-4 text-on-primary" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-on-primary">
              DataRaders
            </h1>
            <p className="text-label-sm uppercase tracking-brand text-on-primary/60">
              Ecommerce Engine
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${linkBase} ${isActive ? linkActive : linkInactive}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-on-primary/10 p-2">
        <Link href="/settings" className={`${linkBase} ${linkInactive}`}>
          <Settings className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-sm">Settings</span>
        </Link>
      </div>
    </aside>
  );
}
