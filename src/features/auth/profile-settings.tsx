"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, ImagePlus, RotateCcw, UploadCloud } from "lucide-react";
import { useAuth } from "./auth-provider";
import { UserAvatar } from "./user-menu";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const MAX_AVATAR_BYTES = 1024 * 1024;

export function ProfileSettings() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, avatarUrl, updateAvatar, resetAvatar } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!user) return null;

  const label = user.displayName ?? user.email ?? user.phoneNumber ?? "IroGuide user";

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

  return (
    <main className="profile-main">
      <section className="profile-hero">
        <div>
          <p className="eyebrow">Account profile</p>
          <h1>Your authorised workspace identity.</h1>
          <p>Choose the avatar that appears in the top navigation while you are signed in.</p>
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

      <div className="profile-footer-actions">
        <Link className="button-secondary" href="/dashboard">Dashboard</Link>
        <Link className="button" href="/review/new">New review <ArrowRight size={17} /></Link>
      </div>
    </main>
  );
}
