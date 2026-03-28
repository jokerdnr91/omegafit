import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getSessionFromCookieStore } from "@/src/lib/auth";

export default async function LoginPage() {
  const session = getSessionFromCookieStore(await cookies());

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            Ω
          </span>
          <div>
            <p className="eyebrow">OMEGA FIT</p>
            <p className="brand-subtitle">Luxury Performance Platform</p>
          </div>
        </div>
        <h1>Le cockpit premium du coaching sportif moderne.</h1>
        <p className="auth-copy">
          Suivi clients, analytics en temps reel, messagerie coach et execution terrain
          sur une seule plateforme Next.js.
        </p>
        <div className="auth-badges">
          <span>Next.js</span>
          <span>PostgreSQL</span>
          <span>JWT Auth</span>
          <span>PWA Sync</span>
        </div>
      </section>

      <aside className="auth-card">
        <div>
          <div className="card-logo" aria-hidden="true">
            Ω
          </div>
          <p className="section-kicker">Connexion securisee</p>
          <h2>Acceder au dashboard</h2>
          <p className="muted-text" style={{ marginTop: 12 }}>
            Demo seed: <strong>coach@omegafit.app</strong> / <strong>OmegaFit2026!</strong>
          </p>
          <p className="muted-text" style={{ marginTop: 8 }}>
            Demo client: <strong>sarah.mendes@example.com</strong> / <strong>OmegaFitClient2026!</strong>
          </p>
        </div>
        <LoginForm />
      </aside>
    </main>
  );
}
