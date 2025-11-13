import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navigationTabs = [
  { name: "Landing (Desktop)", href: "/" },
  { name: "Chat (Desktop)", href: "/chat" },
  { name: "History", href: "/history" },
  { name: "Settings", href: "/settings" },
  { name: "Customer Service", href: "/customer-service" },
];

export function TopNavigation() {
  const location = useLocation();

  return (
    <nav className="border-b border-border bg-card px-6 py-2">
      <div className="flex items-center gap-1">
        {navigationTabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          return (
            <NavLink
              key={tab.name}
              to={tab.href}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {tab.name}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}