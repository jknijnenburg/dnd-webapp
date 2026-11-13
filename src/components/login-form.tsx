"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { IDLE_STATE, type ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

interface LoginFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  label: string;
  submitLabel: string;
}

export function LoginForm({ action, label, submitLabel }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(action, IDLE_STATE);
  const next = useSearchParams().get("next") ?? "";
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{label}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          maxLength={256}
          aria-invalid={state.status === "error"}
          aria-describedby="login-message"
        />
      </div>
      <p id="login-message" role="alert" className="min-h-5 text-sm text-destructive">
        {state.status === "error" ? state.message : ""}
      </p>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <KeyRound aria-hidden />}
        {pending ? "Wird geprüft …" : submitLabel}
      </Button>
    </form>
  );
}
