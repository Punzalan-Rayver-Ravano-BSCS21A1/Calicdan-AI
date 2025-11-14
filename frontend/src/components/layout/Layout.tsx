import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { TopNavigation } from "@/components/layout/TopNavigation";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <TopNavigation />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}