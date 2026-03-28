"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

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

  async function handleRegisterCoach(event) {
    event.preventDefault();
    setRegisterError("");
    setRegisterSuccess("");
    setIsRegistering(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/auth/register-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Creation du coach impossible.");
      }

      setRegisterSuccess("Coach cree. Acces immediat au dashboard.");
      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      setRegisterError(submitError instanceof Error ? submitError.message : "Creation du coach impossible.");
    } finally {
      setIsRegistering(false);
    }
  }

  return (
    <div className="forms-stack">
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

      <form className="stack-form auth-register-form" onSubmit={handleRegisterCoach}>
        <h3>Creer un coach</h3>
        <label>
          <span>Nom du coach</span>
          <input name="name" placeholder="Dave R" required />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" placeholder="coach@votrebrand.com" required />
        </label>
        <label>
          <span>Mot de passe</span>
          <input name="password" type="password" placeholder="Choisir un mot de passe" required />
        </label>
        {registerError ? <p className="form-error">{registerError}</p> : null}
        {registerSuccess ? <p className="muted-text">{registerSuccess}</p> : null}
        <button className="button button-ghost" disabled={isRegistering} type="submit">
          {isRegistering ? "Creation..." : "Ajouter un coach"}
        </button>
      </form>
    </div>
  );
}
