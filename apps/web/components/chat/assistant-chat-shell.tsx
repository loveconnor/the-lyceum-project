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
      <div className="relative h-[calc(100vh-var(--header-height))] -mt-[var(--content-padding)] -mb-[var(--content-padding)]">
        {/* Mobile sheet sidebar */}
        <div className="md:hidden">
          <AIChatSidebar />
        </div>

        <div className="flex h-full -mx-[var(--content-padding)]">
          {/* Desktop sliding drawer - seamlessly connected to app sidebar */}
          <div className="relative hidden h-full md:flex">
            <div
              className={cn(
                "relative h-full overflow-visible transition-[width] duration-300 ease-in-out bg-sidebar border-r border-sidebar-border shadow-sm",
                drawerOpen ? "w-72" : "w-0"
              )}>
              <div
                className={cn(
                  "h-full w-72 bg-sidebar transition-opacity duration-300",
                  drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}>
                <SidebarContent />
              </div>
              
              {/* Toggle button - circular and positioned at edge of sidebar */}
              <Button
                variant="outline"
                size="icon"
                className="absolute top-1/2 -right-5 z-50 -translate-y-1/2 rounded-full border bg-background shadow-md hover:bg-muted transition-all duration-300"
                onClick={() => setDrawerOpen((prev) => !prev)}
                aria-label={drawerOpen ? "Hide chats" : "Show chats"}>
                {drawerOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
              </Button>
            </div>
          </div>

          {/* Main chat area */}
          <div className="relative flex h-full w-full flex-col">
            <div className="px-[var(--content-padding)] h-full">
              <AIChatInterface />
            </div>
          </div>
        </div>
      </div>
    </AssistantChatProvider>
  );
}
