"use client";

import AIChatInterface from "./ai-chat-interface";
import AIChatSidebar, { SidebarContent } from "./ai-chat-sidebar";
import { AssistantChatProvider } from "./assistant-chat-provider";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AssistantChatShell() {
  const [drawerOpen, setDrawerOpen] = useState(true);

  return (
    <AssistantChatProvider>
      <div className="relative h-[calc(100vh-var(--header-height)-3rem)] rounded-md">
        {/* Mobile sheet sidebar */}
        <div className="md:hidden">
          <AIChatSidebar />
        </div>

        <div className="flex h-full">
          {/* Desktop sliding drawer */}
          <div className="relative hidden h-full md:flex">
            <div
              className={cn(
                "relative h-full overflow-visible transition-[width] duration-300 ease-in-out bg-muted/30",
                drawerOpen ? "w-72" : "w-0"
              )}>
              <div
                className={cn(
                  "h-full w-72 bg-muted/30",
                  drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}>
                <SidebarContent />
              </div>
            </div>
          </div>

          {/* Toggle and main chat area */}
          <div className="relative flex h-full w-full flex-col md:rounded-none bg-background md:-ml-px">
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "hidden md:inline-flex absolute top-1/2 left-0 z-50 -translate-y-1/2 -translate-x-1/2 rounded-full border bg-background shadow-md transition-all duration-300",
                drawerOpen ? "opacity-100" : "opacity-100"
              )}
              onClick={() => setDrawerOpen((prev) => !prev)}
              aria-label={drawerOpen ? "Hide chats" : "Show chats"}>
              {drawerOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </Button>
            <AIChatInterface />
          </div>
        </div>
      </div>
    </AssistantChatProvider>
  );
}
