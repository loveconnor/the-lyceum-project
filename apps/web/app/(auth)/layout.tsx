import React from "react";
import { cn } from "@/lib/utils";

export default function AuthLayout({
  className,
  children
}: Readonly<{
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center bg-background px-4 py-10",
        className
      )}>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
