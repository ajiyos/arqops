"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-end border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{user?.name}</span>
        <Button variant="ghost" size="icon" onClick={logout} title="Logout">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
