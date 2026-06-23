"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, ImagePlus, KeyRound, Link2, LoaderCircle, RotateCcw, ShieldCheck, Trash2, UploadCloud, UserX } from "lucide-react";
import { useAuth } from "./auth-provider";
import { UserAvatar } from "./user-menu";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const MAX_AVATAR_BYTES = 1024 * 1024;
const REVIEW_PURGE_CONFIRMATION = "DELETE REVIEWS";
const ACCOUNT_DELETE_CONFIRMATION = "DELETE ACCOUNT";

export function ProfileSettings() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, avatarUrl, providerIds, updateAvatar, resetAvatar, changePassword, linkGoogleProvider, purgeReviewData, deleteAccount } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [reviewConfirm, setReviewConfirm] = useState("");
  const [accountConfirm, setAccountConfirm] = useState("");
  const [dangerMessage, setDangerMessage] = useState("");
  const [dangerError, setDangerError] = useState("");
  const [reviewDeleting, setReviewDeleting] = useState(false);
  const [accountDeleting, setAccountDeleting] = useState(false);

  if (!user) return null;

  const label = user.displayName ?? user.email ?? user.phoneNumber ?? "IroGuide user";
  const linkedProviderIds = new Set(providerIds);
  const hasPasswordProvider = linkedProviderIds.has("password");
  const hasGoogleProvider = linkedProviderIds.has("google.com");

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    setMessage("");
    setError("");

    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      setError("Use a PNG, JPEG, or WebP image for your avatar.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Use an image under 1 MB so it can be saved in this browser.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("That image could not be read. Try another file.");
        return;
      }
      updateAvatar(reader.result);
      setMessage("Avatar updated.");
    };
    reader.onerror = () => setError("That image could not be read. Try another file.");
    reader.readAsDataURL(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(event.target.files);
    event.target.value = "";
  }

  function onReset() {
    resetAvatar();
    setError("");
    setMessage("Avatar reset.");
  }

  async function onPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountMessage("");
    setAccountError("");

    if (nextPassword.length < 6) {
      setAccountError("Use a new password with at least 6 characters.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setAccountError("The new passwords do not match.");
      return;
    }

    setPasswordSubmitting(true);
    try {
      await changePassword(currentPassword, nextPassword);
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setAccountMessage("Password updated.");
    } catch (passwordError) {
      setAccountError(passwordError instanceof Error ? passwordError.message : "Password update failed.");
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function onLinkGoogle() {
    setAccountMessage("");
    setAccountError("");
    setGoogleSubmitting(true);
    try {
      await linkGoogleProvider();
      setAccountMessage("Google linked to this account.");
    } catch (linkError) {
      setAccountError(linkError instanceof Error ? linkError.message : "Google linking failed.");
    } finally {
      setGoogleSubmitting(false);
    }
  }

  async function onPurgeReviews(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDangerMessage("");
    setDangerError("");

    if (reviewConfirm !== REVIEW_PURGE_CONFIRMATION) {
      setDangerError(`Type ${REVIEW_PURGE_CONFIRMATION} before deleting saved reviews.`);
      return;
    }

    setReviewDeleting(true);
    try {
      const result = await purgeReviewData();
      setReviewConfirm("");
      setDangerMessage(`Deleted ${formatDeletionCount(result.reviewsDeleted, "review")}, ${formatDeletionCount(result.draftsDeleted, "draft")}, and ${formatDeletionCount(result.sourceImagesDeleted, "source image")}.`);
    } catch (deleteError) {
      setDangerError(deleteError instanceof Error ? deleteError.message : "Review history deletion failed.");
    } finally {
      setReviewDeleting(false);
    }
  }

  async function onDeleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDangerMessage("");
    setDangerError("");

    if (accountConfirm !== ACCOUNT_DELETE_CONFIRMATION) {
      setDangerError(`Type ${ACCOUNT_DELETE_CONFIRMATION} before deleting this account.`);
      return;
    }

    setAccountDeleting(true);
    try {
      await deleteAccount();
    } catch (deleteError) {
      setDangerError(deleteError instanceof Error ? deleteError.message : "Account deletion failed.");
      setAccountDeleting(false);
    }
  }

  return (
    <main className="profile-main">
      <section className="profile-hero">
        <div>
          <p className="eyebrow">Account profile</p>
          <h1>Your authorised workspace identity.</h1>
          <p>Manage the avatar, sign-in methods, and permanent data controls for this signed-in workspace.</p>
        </div>
        <div className="profile-card">
          <UserAvatar label={label} src={avatarUrl} size="lg" />
          <div>
            <span className="mono-label">SIGNED IN AS</span>
            <h2>{label}</h2>
            {user.email && <p>{user.email}</p>}
          </div>
        </div>
      </section>

      <section className="avatar-settings">
        <div>
          <p className="eyebrow">Avatar</p>
          <h2>Set your profile image.</h2>
          <p>Your custom avatar is stored privately in this browser for the current Firebase account.</p>
        </div>
        <div
          className={`avatar-dropzone${dragging ? " is-dragging" : ""}`}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
        >
          <UploadCloud />
          <h3>Drop your avatar here</h3>
          <p>PNG, JPEG, or WebP under 1 MB</p>
          <div className="avatar-actions">
            <button className="button button-dark" type="button" onClick={() => inputRef.current?.click()}>
              Choose image <ImagePlus size={17} />
            </button>
            <button className="button-secondary" type="button" onClick={onReset}>
              Reset <RotateCcw size={16} />
            </button>
          </div>
          <input ref={inputRef} className="sr-only" type="file" accept={ACCEPTED_TYPES.join(",")} onChange={onInput} />
          {error && <p className="form-error" role="alert"><AlertCircle /> {error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
        </div>
      </section>

      <section className="account-security">
        <div>
          <p className="eyebrow">Security</p>
          <h2>Manage sign-in methods.</h2>
          <p>Manual accounts can update their password and attach Google for faster future sign-ins.</p>
        </div>
        <div className="security-panels">
          {hasPasswordProvider ? (
            <form className="security-panel" onSubmit={onPasswordSubmit}>
              <header><KeyRound /><div><h3>Change password</h3><p>Confirm your current password before setting a new one.</p></div></header>
              <label><span>Current password</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
              <label><span>New password</span><input type="password" autoComplete="new-password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} minLength={6} required /></label>
              <label><span>Confirm new password</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} required /></label>
              <button className="button button-dark" type="submit" disabled={passwordSubmitting}>{passwordSubmitting ? <><LoaderCircle className="spin" /> Updating...</> : <>Update password <ShieldCheck size={17} /></>}</button>
            </form>
          ) : (
            <div className="security-panel security-state">
              <header><ShieldCheck /><div><h3>Password sign-in is not enabled</h3><p>This account currently signs in through a linked provider.</p></div></header>
            </div>
          )}

          <div className="security-panel security-state">
            <header><Link2 /><div><h3>Google sign-in</h3><p>{hasGoogleProvider ? "Google is linked to this account." : "Link Google to keep the same account and add one-click sign-in."}</p></div></header>
            {hasGoogleProvider ? (
              <span className="linked-provider"><CheckCircle2 /> Linked</span>
            ) : hasPasswordProvider ? (
              <button className="button" type="button" onClick={onLinkGoogle} disabled={googleSubmitting}>{googleSubmitting ? <><LoaderCircle className="spin" /> Linking...</> : <>Link Google <ArrowRight size={17} /></>}</button>
            ) : (
              <span className="linked-provider muted">Not available for this provider</span>
            )}
          </div>

          {(accountError || accountMessage) && (
            accountError ? <p className="form-error security-message" role="alert"><AlertCircle /> {accountError}</p> : <p className="form-success security-message" role="status">{accountMessage}</p>
          )}
        </div>
      </section>

      <section className="account-danger">
        <div>
          <p className="eyebrow">Deletion</p>
          <h2>Permanent data controls.</h2>
          <p>Delete saved critique history on its own, or remove this Firebase account after clearing its stored reviews and drafts.</p>
        </div>
        <div className="danger-panels">
          <form className="danger-panel" onSubmit={onPurgeReviews}>
            <header><Trash2 /><div><h3>Delete review history</h3><p>Removes saved reviews, review drafts, and local dashboard cache for this signed-in account.</p></div></header>
            <label><span>Type {REVIEW_PURGE_CONFIRMATION}</span><input value={reviewConfirm} onChange={(event) => setReviewConfirm(event.target.value)} autoComplete="off" /></label>
            <button className="danger-button" type="submit" disabled={reviewDeleting || reviewConfirm !== REVIEW_PURGE_CONFIRMATION}>
              {reviewDeleting ? <><LoaderCircle className="spin" /> Deleting...</> : <>Delete reviews <Trash2 size={16} /></>}
            </button>
          </form>

          <form className="danger-panel danger-panel-critical" onSubmit={onDeleteAccount}>
            <header><UserX /><div><h3>Delete account</h3><p>Permanently removes this account after deleting its saved reviews, drafts, avatar cache, and sign-in record.</p></div></header>
            <label><span>Type {ACCOUNT_DELETE_CONFIRMATION}</span><input value={accountConfirm} onChange={(event) => setAccountConfirm(event.target.value)} autoComplete="off" /></label>
            <button className="danger-button" type="submit" disabled={accountDeleting || accountConfirm !== ACCOUNT_DELETE_CONFIRMATION}>
              {accountDeleting ? <><LoaderCircle className="spin" /> Deleting...</> : <>Delete account <UserX size={16} /></>}
            </button>
          </form>

          {(dangerError || dangerMessage) && (
            dangerError ? <p className="form-error security-message" role="alert"><AlertCircle /> {dangerError}</p> : <p className="form-success security-message" role="status">{dangerMessage}</p>
          )}
        </div>
      </section>

      <div className="profile-footer-actions">
        <Link className="button-secondary" href="/dashboard">Dashboard</Link>
        <Link className="button" href="/review/new">New review <ArrowRight size={17} /></Link>
      </div>
    </main>
  );
}

function formatDeletionCount(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}
