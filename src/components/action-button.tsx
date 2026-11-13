"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/action-state";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ActionButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Server action with all arguments already bound. */
  action: () => Promise<ActionState>;
  /** When set, a confirmation dialog is shown first (used for deletions). */
  confirm?: { title: string; description: string; confirmLabel: string };
}

/** Button that runs a server action with pending state, toast feedback and optional confirmation. */
export function ActionButton({ action, confirm, children, disabled, ...props }: ActionButtonProps) {
  const [pending, startTransition] = React.useTransition();

  function run() {
    if (pending) return;
    startTransition(async () => {
      const result = await action();
      if (result?.status === "success") toast.success(result.message ?? "Erledigt.");
      else if (result?.status === "error") toast.error(result.message ?? "Das hat nicht geklappt.");
    });
  }

  const content = (
    <>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </>
  );

  if (!confirm) {
    return (
      <Button type="button" onClick={run} disabled={pending || disabled} aria-busy={pending} {...props}>
        {content}
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" disabled={pending || disabled} aria-busy={pending} {...props}>
          {content}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
        <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={run}>{confirm.confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
