'use client';
import { Kanit } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { NotificationProvider } from "@/context/NotificationContext";

const kanit = Kanit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated && !user?.familyId) {
      const allowedPaths = ['/', '/families', '/login', '/register'];
      if (!allowedPaths.includes(pathname)) {
        router.replace('/families');
      }
    }
  }, [loading, isAuthenticated, user, pathname, router]);

  // Listen for user-removed event (when moderator kicks a user)
  useEffect(() => {
    if (!user) return;

    import('@/lib/socket').then(({ socket }) => {
      const handleUserRemoved = (data: { userId: string }) => {
        if (data.userId === user.id) {
          // Clear user data and redirect to families
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/families');
          alert('You have been removed from the family by a moderator.');
        }
      };

      socket.on('user-removed', handleUserRemoved);

      return () => {
        socket.off('user-removed', handleUserRemoved);
      };
    });
  }, [user, router]);

  // Don't show navigation on landing, login, or register pages
  // Also don't show navigation if user has no family (unless they are on allowed pages, but sidebar should be hidden anyway)
  const isAuthPage = pathname === '/' || pathname === '/login' || pathname === '/register';
  const showNavigation = isAuthenticated && !isAuthPage && !!user?.familyId;

  return (
    <>
      {showNavigation && <Sidebar />}
      <main className={showNavigation ? "md:pl-64 pb-24 md:pb-6 min-h-screen" : "min-h-screen pb-24 md:pb-6"}>
        <div className={showNavigation ? "page-shell max-w-5xl mx-auto p-4 md:p-8" : "page-shell max-w-4xl mx-auto p-4 md:p-8"}>
          {children}
        </div>
      </main>
      {showNavigation && <BottomNav />}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${kanit.className} bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-900`}>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <LayoutContent>{children}</LayoutContent>
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
