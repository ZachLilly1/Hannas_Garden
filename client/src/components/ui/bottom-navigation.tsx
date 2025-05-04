import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LeafIcon, CalendarIcon, UserIcon, PlusIcon, SunIcon } from "@/lib/icons";
import { ActivityIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export type BottomNavigationProps = {
  onAddPlant: () => void;
};

export function BottomNavigation({ onAddPlant }: BottomNavigationProps) {
  const [location] = useLocation();

  const navItems: NavItem[] = [
    {
      href: "/",
      label: "Plants",
      icon: <LeafIcon className="text-lg" />,
    },
    {
      href: "/schedule",
      label: "Schedule",
      icon: <CalendarIcon className="text-lg" />,
    },
    {
      href: "#", // Special case for Add button
      label: "", // No label for the add button
      icon: <PlusIcon className="text-lg" />,
    },
    {
      href: "/tools",
      label: "Tools",
      icon: <SunIcon className="text-lg" />,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <UserIcon className="text-lg" />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-t-xl border-t border-neutral-medium dark:border-gray-700 z-20">
      <div className="flex justify-around py-2 px-3">
        {navItems.map((item, index) => {
          // Special case for the Add button
          if (index === 2) {
            return (
              <button
                key={index}
                onClick={onAddPlant}
                className="p-3 bg-primary rounded-full text-white shadow-md transform -translate-y-5"
                aria-label="Add plant"
              >
                {item.icon}
              </button>
            );
          }

          const isActive = location === item.href;
          return (
            <div key={index}>
              <Link href={item.href}>
                <div
                  className={cn(
                    "flex flex-col items-center p-2 cursor-pointer",
                    isActive 
                      ? "text-primary" 
                      : "text-neutral-dark dark:text-gray-400 opacity-60"
                  )}
                >
                  {item.icon}
                  <span className="text-xs mt-1">{item.label}</span>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNavigation;
