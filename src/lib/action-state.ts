export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Changes on every result so clients can react to repeated identical outcomes. */
  nonce?: number;
}

export const IDLE_STATE: ActionState = { status: "idle" };
