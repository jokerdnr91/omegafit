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
            <p className="brand-subtitle">Copilote coach sportif (coach)</p>
          </div>
        </div>
        <h1>Copilote coach sportif.</h1>
        <p className="auth-copy">
          Connexion coach et client sur une interface claire, fluide et orientee terrain.
        </p>
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
