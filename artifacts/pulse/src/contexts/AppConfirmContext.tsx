import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  id: number;
  resolve: (accepted: boolean) => void;
}

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean> | null>(null);

export function AppConfirmProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<PendingConfirm | null>(null);
  const activeRef = useRef<PendingConfirm | null>(null);
  const queueRef = useRef<PendingConfirm[]>([]);
  const nextIdRef = useRef(0);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    const request = { ...options, id: ++nextIdRef.current, resolve };
    if (!activeRef.current) {
      activeRef.current = request;
      setActive(request);
    } else {
      queueRef.current.push(request);
    }
  }), []);

  const settle = useCallback((id: number, accepted: boolean) => {
    const current = activeRef.current;
    if (!current || current.id !== id) return;
    current.resolve(accepted);
    const next = queueRef.current.shift() ?? null;
    activeRef.current = next;
    setActive(next);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={!!active}
        onOpenChange={(open) => {
          if (!open && active) settle(active.id, false);
        }}
      >
        {active && (
          <AlertDialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-3xl border-border bg-card shadow-2xl">
            <AlertDialogHeader className="text-left">
              <AlertDialogTitle className="text-foreground">{active.title}</AlertDialogTitle>
              {active.description && (
                <AlertDialogDescription className="leading-relaxed">
                  {active.description}
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row justify-end gap-2">
              <AlertDialogCancel className="mt-0 rounded-xl border-border bg-secondary text-foreground hover:bg-secondary/80">
                {active.cancelLabel || "Отмена"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  settle(active.id, true);
                }}
                className={`rounded-xl ${active.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
              >
                {active.confirmLabel || "Продолжить"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useAppConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useAppConfirm must be used inside AppConfirmProvider");
  return confirm;
}
