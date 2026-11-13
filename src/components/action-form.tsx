"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { IDLE_STATE, type ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Label } from "@/components/ui/input";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const FormContext = React.createContext<{ state: ActionState; pending: boolean }>({
  state: IDLE_STATE,
  pending: false,
});

interface ActionFormProps extends Omit<React.ComponentProps<"form">, "action" | "onSubmit"> {
  action: FormAction;
  /** Clear the inputs after a successful submit (for "add" forms). */
  resetOnSuccess?: boolean;
  /** Show the result inline below the form in addition to the toast. */
  inlineMessage?: boolean;
}

/**
 * Form wired to a server action with loading, success and error states.
 * Submits via JS so that inputs keep their values when validation fails.
 */
export function ActionForm({ action, resetOnSuccess, inlineMessage = true, children, className, ...props }: ActionFormProps) {
  const [state, dispatch, pending] = React.useActionState(action, IDLE_STATE);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Gespeichert.");
      if (resetOnSuccess) formRef.current?.reset();
    } else if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state, resetOnSuccess]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return; // guard against double submits
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    React.startTransition(() => dispatch(formData));
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className={className} aria-busy={pending} {...props}>
      <FormContext value={{ state, pending }}>{children}</FormContext>
      {inlineMessage && (
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "mt-3 min-h-5 text-sm",
            state.status === "error" ? "text-destructive" : "text-success",
            state.status === "idle" && "hidden",
          )}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

interface FieldProps {
  /** Form field name – used to look up server-side validation errors. */
  name: string;
  /** id of the control inside (defaults to `name`). */
  htmlFor?: string;
  label: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function Field({ name, htmlFor, label, hint, className, children }: FieldProps) {
  const { state } = React.use(FormContext);
  const errors = state.status === "error" ? state.fieldErrors?.[name] : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor ?? name}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {errors?.map((error) => (
        <p key={error} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ))}
    </div>
  );
}

export function SubmitButton({ children, pendingLabel = "Speichern …", ...props }: ButtonProps & { pendingLabel?: string }) {
  const { pending } = React.use(FormContext);
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
