"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, ArrowRight, LoaderCircle, RefreshCcw, Send, Sparkles } from "lucide-react";
import { followUpOutputSchema, type FollowUpMessage } from "@/domain/follow-up";
import type { ReviewOutput } from "@/domain/review";
import { useAuth } from "@/features/auth/auth-provider";
import { postJsonWithFallback } from "@/lib/api-client";

type ChatMessage = FollowUpMessage & {
  status?: "failed";
};

export function FollowUpChat({ review }: { review: ReviewOutput }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState(review.followUps);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submitQuestion(event?: FormEvent, retryQuestion = draft) {
    event?.preventDefault();
    const question = retryQuestion.trim();
    if (!question || submitting) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };

    setSubmitting(true);
    setError("");
    setMessages((current) => [...current.filter((message) => message.status !== "failed"), userMessage]);

    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error("Sign in again before asking a follow-up.");
      const payload = await postJsonWithFallback({
        path: "/api/follow-ups",
        unavailableMessage: "The follow-up service is not available right now.",
        failureMessage: "Follow-up failed.",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ review, question, messages }),
        },
      });
      const parsed = followUpOutputSchema.parse(payload);
      setMessages((current) => [...current, parsed.message]);
      setSuggestions(parsed.suggestedQuestions);
      setDraft("");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Follow-up failed. Please try again.";
      setError(message);
      setMessages((current) => current.map((item) => item.id === userMessage.id ? { ...item, status: "failed" } : item));
      setDraft(question);
    } finally {
      setSubmitting(false);
    }
  }

  const failedQuestion = messages.find((message) => message.status === "failed" && message.role === "user")?.content ?? "";

  return (
    <section className="follow-up-chat">
      <div className="follow-up-heading">
        <Sparkles className="sparkle-blink-glow" />
        <p className="eyebrow light">Keep the conversation going</p>
        <h2>Ask your mentor.</h2>
        <p>Messages stay scoped to this review in the current session. Production storage will persist them under the review owner.</p>
      </div>

      <div className="chat-thread" aria-live="polite">
        {messages.length === 0 ? (
          <p className="chat-empty">Choose a suggested question or write your own follow-up.</p>
        ) : messages.map((message) => (
          <article className={`chat-message ${message.role} ${message.status ?? ""}`} key={message.id}>
            <span>{message.role === "user" ? "You" : "IroGuide"}</span>
            <p>{message.content}</p>
          </article>
        ))}
      </div>

      <div className="suggested-questions">
        {suggestions.map((question) => (
          <button type="button" key={question} onClick={() => setDraft(question)}>{question} <ArrowRight size={15} /></button>
        ))}
      </div>

      <form className="chat-form" onSubmit={submitQuestion}>
        <label className="sr-only" htmlFor="follow-up-question">Ask a follow-up question</label>
        <textarea id="follow-up-question" rows={3} value={draft} placeholder="Ask about the critique, an issue, or what to change next..." onChange={(event) => setDraft(event.target.value)} />
        <button type="submit" className="button button-lime" disabled={draft.trim().length < 3 || submitting}>{submitting ? <><LoaderCircle className="spin" /> Sending...</> : <>Send <Send size={16} /></>}</button>
      </form>

      {error && (
        <div className="chat-error" role="alert">
          <AlertCircle />
          <p>{error}</p>
          {failedQuestion && <button type="button" onClick={() => submitQuestion(undefined, failedQuestion)}><RefreshCcw size={15} /> Retry</button>}
        </div>
      )}
    </section>
  );
}
