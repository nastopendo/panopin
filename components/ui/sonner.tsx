"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-card border-border text-foreground shadow-lg rounded-xl",
          description: "text-muted-foreground",
          actionButton: "bg-brand text-brand-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          error: "!border-destructive/30 !bg-destructive/10 !text-destructive",
          success: "!border-success/30 !bg-success/10 !text-success",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
