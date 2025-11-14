import { MessageSquare, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-lg">
          <MessageSquare className="w-4 h-4" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Legend of Calicdan</h1>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                U
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Account Settings</DropdownMenuItem>
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}