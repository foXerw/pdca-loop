import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { NotificationBell, type NotificationBellItem } from "./ui/NotificationBell";
import { ServiceWorkerRegister } from "./ui/ServiceWorkerRegister";
import { listNotifications, unreadNotificationCount } from "@/lib/server/actions/notification";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "pdca-loop",
  description: "PDCA 闭环式个人计划管理",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    title: "pdca-loop",
    capable: true,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export const dynamic = 'force-dynamic';

function parseItem(n: {
  id: string;
  type: string;
  payload: string;
  readAt: Date | null;
}): NotificationBellItem {
  try {
    const p = JSON.parse(n.payload) as { title: string; body: string; href: string };
    return { id: n.id, title: p.title, body: p.body, href: p.href, read: !!n.readAt };
  } catch {
    return { id: n.id, title: n.type, body: '', href: '/', read: !!n.readAt };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [count, notifs] = await Promise.all([
    unreadNotificationCount(),
    listNotifications(),
  ]);
  const items = notifs.slice(0, 5).map(parseItem);

  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <nav className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
            <Link href="/" className="font-semibold">
              pdca-loop
            </Link>
            <Link
              href="/plans/new"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              新建计划
            </Link>
            <Link
              href="/reviews"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              回顾
            </Link>
            <Link
              href="/settings"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              设置
            </Link>
            <div className="ml-auto">
              <NotificationBell count={count} items={items} />
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
