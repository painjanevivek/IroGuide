"use client";

export type ActivationSaveState = "idle" | "saving" | "saved" | "offline" | "conflict" | "error";

type ActivationSaveNoticeProps = {
  state: ActivationSaveState;
  onReload?: () => void;
  onRetry?: () => void;
};

const messages: Record<ActivationSaveState, string> = {
  idle: "Changes save when you continue.",
  saving: "Saving your progress…",
  saved: "Progress saved.",
  offline: "You are offline. Your confirmed progress is still available; reconnect before retrying.",
  conflict: "This progress changed in another tab. Reload the latest version before continuing.",
  error: "Progress could not be saved. Your current answers remain on this screen.",
};

export function ActivationSaveNotice({ state, onReload, onRetry }: ActivationSaveNoticeProps) {
  const urgent = state === "conflict" || state === "error";
  return (
    <div aria-atomic="true" aria-live={urgent ? "assertive" : "polite"} role={urgent ? "alert" : "status"}>
      <p>{messages[state]}</p>
      {state === "conflict" && onReload ? <button type="button" onClick={onReload}>Reload latest progress</button> : null}
      {(state === "offline" || state === "error") && onRetry ? <button type="button" onClick={onRetry}>Try saving again</button> : null}
    </div>
  );
}
