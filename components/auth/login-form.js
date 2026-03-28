"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Connexion impossible.");
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Connexion impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        <span>Email</span>
        <input
          defaultValue="coach@omegafit.app"
          name="email"
          type="email"
          required
          placeholder="coach@omegafit.app"
        />
      </label>

      <label>
        <span>Mot de passe</span>
        <input
          defaultValue="OmegaFit2026!"
          name="password"
          type="password"
          required
          placeholder="Votre mot de passe"
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="button button-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Connexion..." : "Entrer dans OMEGA FIT"}
      </button>
    </form>
  );
}
