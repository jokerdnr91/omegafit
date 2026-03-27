"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function formatDate(value, options = { dateStyle: "medium", timeStyle: "short" }) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("fr-FR", options).format(new Date(value));
}

async function fetchJson(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error ?? `Request failed: ${response.status}`);
  }

  return response.json();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

const emptyData = {
  role: "client",
  coach: {
    name: "",
    title: "",
    tagline: "",
    responseTime: "",
  },
  client: null,
  todaySession: null,
  weeklyProgress: {
    completion: 0,
    momentum: 0,
    consistency: 0,
  },
  history: [],
  profile: {
    goal: "",
    currentWeightKg: 0,
    disciplineScore: 0,
    joinedAt: null,
    stats: [],
  },
  activity: [],
};

const abandonReasons = [
  "Fatigue",
  "Douleur",
  "Manque de temps",
  "Trop difficile",
  "Manque de motivation",
  "Probleme technique",
];

function isExerciseCompleted(exercise, draft) {
  const actualSets = Number(draft?.actualSets ?? 0);
  return actualSets >= Number(exercise?.targetSets ?? 0);
}

function isExerciseValidated(exercise, draft) {
  return isExerciseCompleted(exercise, draft) || Boolean(draft?.skipped);
}

export function ClientShell({ user }) {
  const router = useRouter();
  const [data, setData] = useState(emptyData);
  const [sessionDraft, setSessionDraft] = useState({});
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [validationTarget, setValidationTarget] = useState(null);
  const [validationForm, setValidationForm] = useState({ reasons: [], otherReason: "" });
  const [messageAttachment, setMessageAttachment] = useState(null);
  const [syncStatus, setSyncStatus] = useState("Initialisation...");
  const [isPending, startTransition] = useTransition();
  const previousUnreadMessages = useRef(0);

  useEffect(() => {
    void loadDashboard("Espace client pret");
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      startTransition(() => {
        void loadDashboard("Synchronisation automatique");
      });
    }, 12000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const nextDraft = {};
    for (const exercise of data.todaySession?.exercises ?? []) {
      nextDraft[exercise.id] = {
        actualWeightKg: exercise.actualWeightKg ?? exercise.targetWeightKg ?? "",
        actualReps: exercise.actualReps ?? exercise.targetReps ?? "",
        actualSets: exercise.actualSets ?? exercise.targetSets ?? "",
        skipped: Boolean(exercise.skipped),
        skipReasons: exercise.skipReasons ?? [],
        skipNote: exercise.skipNote ?? "",
      };
    }
    setSessionDraft(nextDraft);
    setActiveExerciseIndex(0);
    setValidationTarget(null);
    setValidationForm({ reasons: [], otherReason: "" });
  }, [data.todaySession?.id]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (Notification.permission !== "granted" || !data.client) {
      previousUnreadMessages.current = data.client?.unreadMessages ?? 0;
      return;
    }

    const unreadMessages = Number(data.client.unreadMessages ?? 0);
    const sessionId = data.todaySession?.id;
    const reminderKey = sessionId ? `omega-reminder-${sessionId}` : null;
    const sessionTime = data.todaySession?.scheduledFor
      ? new Date(data.todaySession.scheduledFor).getTime()
      : null;
    const oneHour = 1000 * 60 * 60;

    if (
      reminderKey &&
      sessionTime &&
      sessionTime > Date.now() &&
      sessionTime - Date.now() <= oneHour &&
      window.localStorage.getItem(reminderKey) !== "sent"
    ) {
      new Notification("Rappel de seance", {
        body: `${data.todaySession.title} commence bientot. Ouvre OMEGA FIT pour preparer la session.`,
      });
      window.localStorage.setItem(reminderKey, "sent");
    }

    if (unreadMessages > previousUnreadMessages.current) {
      new Notification("Nouveau message coach", {
        body: "Un message du coach t'attend dans OMEGA FIT.",
      });
    }

    previousUnreadMessages.current = unreadMessages;
  }, [data.client, data.todaySession]);

  async function loadDashboard(message) {
    try {
      const payload = await fetchJson("/api/dashboard");
      setData(payload);
      setSyncStatus(message);
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : "Impossible de charger l'espace client.");
    }
  }

  async function handleLogout() {
    await fetchJson("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function handleSessionSubmit(mode) {
    if (!data.todaySession) {
      return;
    }

    if (mode === "complete") {
      const pendingExercise = data.todaySession.exercises.find(
        (exercise) => !isExerciseValidated(exercise, sessionDraft[exercise.id]),
      );

      if (pendingExercise) {
        setActiveExerciseIndex(
          data.todaySession.exercises.findIndex((exercise) => exercise.id === pendingExercise.id),
        );
        setSyncStatus("Chaque exercice doit etre termine ou justifie avant validation.");
        return;
      }
    }

    try {
      setSyncStatus(mode === "complete" ? "Validation de la seance..." : "Enregistrement...");
      await fetchJson("/api/client/session", {
        method: "POST",
        body: JSON.stringify({
          sessionId: data.todaySession.id,
          started: mode !== "save",
          complete: mode === "complete",
          exercises: Object.entries(sessionDraft).map(([exerciseId, values]) => ({
            exerciseId,
            ...values,
          })),
        }),
      });
      startTransition(() => {
        void loadDashboard(mode === "complete" ? "Seance terminee" : "Seance sauvegardee");
      });
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : "Impossible d'enregistrer la seance.");
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const content = String(formData.get("content") ?? "").trim();

    try {
      setSyncStatus("Envoi du message...");
      let payload = { content };

      if (messageAttachment?.file) {
        const mediaUrl = await fileToDataUrl(messageAttachment.file);
        payload = {
          content,
          mediaUrl,
          mediaType: messageAttachment.kind,
        };
      }

      await fetchJson("/api/messages", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      event.currentTarget.reset();
      setMessageAttachment(null);
      startTransition(() => {
        void loadDashboard("Message envoye au coach");
      });
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : "Envoi impossible");
    }
  }

  function handleDraftChange(exerciseId, field, value) {
    setSessionDraft((current) => ({
      ...current,
      [exerciseId]: {
        ...current[exerciseId],
        [field]: value,
        ...(field === "actualSets" ? { skipped: false, skipReasons: [], skipNote: "" } : {}),
      },
    }));
  }

  function handleOpenValidation(targetIndex) {
    const exercise = data.todaySession?.exercises?.[targetIndex];

    if (!exercise) {
      return;
    }

    const currentDraft = sessionDraft[exercise.id] ?? {};
    setValidationTarget(targetIndex);
    setValidationForm({
      reasons: currentDraft.skipReasons ?? [],
      otherReason: currentDraft.skipNote ?? "",
    });
  }

  function handleToggleValidationReason(reason) {
    setValidationForm((current) => ({
      ...current,
      reasons: current.reasons.includes(reason)
        ? current.reasons.filter((entry) => entry !== reason)
        : [...current.reasons, reason],
    }));
  }

  function handleConfirmValidation() {
    if (validationTarget === null || !data.todaySession) {
      return;
    }

    const exercise = data.todaySession.exercises[validationTarget];
    const note = validationForm.otherReason.trim();

    if (!validationForm.reasons.length && !note) {
      setSyncStatus("Selectionne au moins une raison ou precise une autre raison.");
      return;
    }

    setSessionDraft((current) => ({
      ...current,
      [exercise.id]: {
        ...current[exercise.id],
        skipped: true,
        skipReasons: validationForm.reasons,
        skipNote: note,
      },
    }));

    setValidationTarget(null);
    setValidationForm({ reasons: [], otherReason: "" });
    setActiveExerciseIndex((index) =>
      Math.min(index + 1, (data.todaySession?.exercises?.length ?? 1) - 1),
    );
    setSyncStatus("Passage autorise avec justification.");
  }

  function handleNextExercise() {
    const exercises = data.todaySession?.exercises ?? [];
    const currentExercise = exercises[activeExerciseIndex];

    if (!currentExercise) {
      return;
    }

    if (!isExerciseValidated(currentExercise, sessionDraft[currentExercise.id])) {
      handleOpenValidation(activeExerciseIndex);
      return;
    }

    setActiveExerciseIndex((current) => Math.min(current + 1, exercises.length - 1));
  }

  function handlePreviousExercise() {
    setActiveExerciseIndex((current) => Math.max(current - 1, 0));
  }

  function handleAttachmentChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setMessageAttachment(null);
      return;
    }

    const kind = file.type.startsWith("video/") ? "video" : "image";
    setMessageAttachment({ file, kind, name: file.name });
  }

  const client = data.client;
  const exercises = data.todaySession?.exercises ?? [];
  const activeExercise = exercises[activeExerciseIndex] ?? null;
  const completionCount = useMemo(
    () =>
      exercises.filter((exercise) => isExerciseValidated(exercise, sessionDraft[exercise.id])).length,
    [exercises, sessionDraft],
  );

  if (!client) {
    return (
      <main className="dashboard-page">
        <section className="glass-panel panel">
          <p>Chargement...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-hero glass-panel client-hero">
        <div className="hero-copy">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">{"\u03A9"}</span>
            <div>
              <p className="eyebrow">OMEGA FIT</p>
              <p className="brand-subtitle">Client Performance Space</p>
            </div>
          </div>
          <h1>{client.fullName.split(" ")[0]}, discipline en execution.</h1>
          <p className="hero-lead">
            Ta seance du jour, ta progression et ton echange coach sont regroupes dans un seul espace premium.
          </p>
          <div className="hero-actions">
            <button
              className="button button-primary"
              onClick={() => document.getElementById("client-session")?.scrollIntoView({ behavior: "smooth" })}
              type="button"
            >
              Commencer
            </button>
            <button
              className="button button-ghost"
              onClick={() => document.getElementById("client-messages")?.scrollIntoView({ behavior: "smooth" })}
              type="button"
            >
              Messagerie
            </button>
            <button className="button button-ghost" onClick={handleLogout} type="button">
              Deconnexion
            </button>
          </div>
        </div>

        <aside className="hero-side">
          <div className="live-badge">
            <span className="live-dot"></span>
            {isPending ? "Synchronisation..." : syncStatus}
          </div>
          <div className="client-session-teaser">
            <p className="section-kicker">Seance du jour</p>
            <h2>{data.todaySession?.title ?? "Aucune seance planifiee"}</h2>
            <p className="muted-text">{data.todaySession?.focus ?? "Ton coach actualise ton prochain protocole."}</p>
            <div className="mini-grid two">
              <div>
                <span>Horaire</span>
                <strong>{formatDate(data.todaySession?.scheduledFor, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</strong>
              </div>
              <div>
                <span>Coach</span>
                <strong>{data.coach.name || user.name}</strong>
              </div>
            </div>
          </div>
          <div className="progress-pillars">
            <ProgressPillar label="Completion" value={data.weeklyProgress.completion} />
            <ProgressPillar label="Momentum" value={data.weeklyProgress.momentum} />
            <ProgressPillar label="Discipline" value={data.profile.disciplineScore} />
          </div>
        </aside>
      </header>

      <section className="metric-grid">
        <article className="metric-card"><p>Progression hebdo</p><h3>{data.weeklyProgress.completion}%</h3><span>Seances renseignees cette semaine</span></article>
        <article className="metric-card"><p>Poids actuel</p><h3>{data.profile.currentWeightKg} kg</h3><span>Dernier point valide</span></article>
        <article className="metric-card"><p>Score discipline</p><h3>{data.profile.disciplineScore}</h3><span>Execution sur 100</span></article>
        <article className="metric-card"><p>Messages non lus</p><h3>{client.unreadMessages}</h3><span>Conversation coach</span></article>
        <article className="metric-card"><p>Objectif</p><h3>{client.goal}</h3><span>Cap principal du bloc</span></article>
      </section>

      <section className="client-main-grid">
        <article className="glass-panel panel" id="client-session">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Seance</p>
              <h2>{data.todaySession?.title ?? "Seance a venir"}</h2>
            </div>
            <span className="muted-text">{data.todaySession?.weekLabel ?? "Bloc en construction"}</span>
          </div>
          <div className="session-meta">
            <div><span>Focus</span><strong>{data.todaySession?.focus ?? "--"}</strong></div>
            <div><span>Coach note</span><strong>{data.todaySession?.coachNote ?? "Instruction a venir"}</strong></div>
            <div><span>Progression</span><strong>{completionCount}/{data.todaySession?.exercises?.length ?? 0} exercices renseignes</strong></div>
          </div>
          <div className="exercise-flow">
            <div className="exercise-rail">
              {exercises.map((exercise, index) => {
                const draft = sessionDraft[exercise.id];
                const validated = isExerciseValidated(exercise, draft);
                const completed = isExerciseCompleted(exercise, draft);

                return (
                  <button
                    className={`exercise-step ${index === activeExerciseIndex ? "active" : ""}`}
                    key={exercise.id}
                    onClick={() => {
                      if (index <= activeExerciseIndex || validated) {
                        setActiveExerciseIndex(index);
                      }
                    }}
                    type="button"
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{exercise.name}</strong>
                    <em>{completed ? "Termine" : draft?.skipped ? "Justifie" : "A faire"}</em>
                  </button>
                );
              })}
            </div>

            {activeExercise ? (
              <article className="exercise-card exercise-focus-card" key={activeExercise.id}>
                <div className="exercise-copy">
                  <div className="exercise-index">{String(activeExerciseIndex + 1).padStart(2, "0")}</div>
                  <div>
                    <h3>{activeExercise.name}</h3>
                    <p className="muted-text">
                      Cible {activeExercise.targetSets} x {activeExercise.targetReps}
                      {activeExercise.targetWeightKg ? ` a ${activeExercise.targetWeightKg} kg` : ""}
                    </p>
                    {activeExercise.videoUrl ? (
                      <a className="media-link" href={activeExercise.videoUrl} rel="noreferrer" target="_blank">
                        Voir la video explicative
                      </a>
                    ) : null}
                    {sessionDraft[activeExercise.id]?.skipped ? (
                      <div className="validation-note">
                        <strong>Abandon justifie</strong>
                        <p>
                          {[...(sessionDraft[activeExercise.id]?.skipReasons ?? []), sessionDraft[activeExercise.id]?.skipNote]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="exercise-inputs">
                  <label>
                    <span>Poids</span>
                    <input
                      name={`${activeExercise.id}-weight`}
                      onChange={(event) => handleDraftChange(activeExercise.id, "actualWeightKg", event.target.value)}
                      type="number"
                      value={sessionDraft[activeExercise.id]?.actualWeightKg ?? ""}
                    />
                  </label>
                  <label>
                    <span>Repetitions</span>
                    <input
                      name={`${activeExercise.id}-reps`}
                      onChange={(event) => handleDraftChange(activeExercise.id, "actualReps", event.target.value)}
                      type="number"
                      value={sessionDraft[activeExercise.id]?.actualReps ?? ""}
                    />
                  </label>
                  <label>
                    <span>Series</span>
                    <input
                      name={`${activeExercise.id}-sets`}
                      onChange={(event) => handleDraftChange(activeExercise.id, "actualSets", event.target.value)}
                      type="number"
                      value={sessionDraft[activeExercise.id]?.actualSets ?? ""}
                    />
                  </label>
                </div>
                <div className="exercise-validation-actions">
                  <button className="button button-ghost" onClick={() => handleOpenValidation(activeExerciseIndex)} type="button">
                    Justifier l'abandon
                  </button>
                  <div className="hero-actions compact-actions">
                    <button className="button button-ghost" disabled={activeExerciseIndex === 0} onClick={handlePreviousExercise} type="button">
                      Exercice precedent
                    </button>
                    <button className="button button-primary" onClick={handleNextExercise} type="button">
                      Exercice suivant
                    </button>
                  </div>
                </div>
              </article>
            ) : (
              <div className="empty-card">Aucun exercice disponible.</div>
            )}
          </div>
          <div className="hero-actions session-actions">
            <button className="button button-ghost" onClick={() => handleSessionSubmit("save")} type="button">
              Sauvegarder
            </button>
            <button className="button button-primary" onClick={() => handleSessionSubmit("complete")} type="button">
              Terminer la seance
            </button>
          </div>
        </article>

        <div className="side-stack">
          <article className="glass-panel panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Dashboard</p>
                <h2>Progression hebdomadaire</h2>
              </div>
            </div>
            <div className="weekly-meter">
              <div><span>Completion</span><strong>{data.weeklyProgress.completion}%</strong></div>
              <div><span>Momentum</span><strong>{data.weeklyProgress.momentum}%</strong></div>
              <div><span>Consistance</span><strong>{data.weeklyProgress.consistency}%</strong></div>
            </div>
            <div className="task-list">
              {client.tasks.map((task) => (
                <div className="task-item" key={task.id}>
                  <input checked={task.done} readOnly type="checkbox" />
                  <span>{task.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="glass-panel panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Profil</p>
                <h2>Fiche personnelle</h2>
              </div>
            </div>
            <div className="profile-card-grid">
              <div className="profile-emphasis">
                <span>Objectif</span>
                <strong>{data.profile.goal}</strong>
              </div>
              <div className="profile-emphasis">
                <span>Score discipline</span>
                <strong>{data.profile.disciplineScore}/100</strong>
              </div>
            </div>
            <div className="mini-grid two stat-tile-grid">
              {data.profile.stats.map((stat) => (
                <div key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="bottom-grid">
        <article className="glass-panel panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Progression</p>
              <h2>Poids du corps & performance</h2>
            </div>
          </div>
          <div className="chart-stack">
            <ChartBlock title="Poids du corps" unit="kg" points={client.trend} valueKey="weightKg" />
            <ChartBlock title="Performance" unit="pts" points={client.trend} valueKey="performance" />
          </div>
          <div className="history-list">
            {data.history.map((entry) => (
              <article className="history-item" key={entry.id}>
                <div>
                  <strong>{formatDate(entry.date, { day: "2-digit", month: "short" })}</strong>
                  <p>{entry.note}</p>
                </div>
                <div className="history-values">
                  <span>{entry.weightKg} kg</span>
                  <span>{entry.performance ?? "--"} pts</span>
                  <span>{entry.workoutCompletion}%</span>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="glass-panel panel" id="client-messages">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Messagerie</p>
              <h2>Chat temps reel avec le coach</h2>
            </div>
          </div>
          <div className="message-list rich-message-list">
            {client.messages.map((message) => (
              <article className={`message-card ${message.senderRole}`} key={message.id}>
                <div className="card-head">
                  <strong>{message.senderRole === "coach" ? data.coach.name : "Vous"}</strong>
                  <span>{formatDate(message.createdAt)}</span>
                </div>
                {message.content ? <p>{message.content}</p> : null}
                {message.mediaUrl && message.mediaType === "image" ? (
                  <img alt="Piece jointe discussion" className="message-media" src={message.mediaUrl} />
                ) : null}
                {message.mediaUrl && message.mediaType === "video" ? (
                  <video className="message-media" controls src={message.mediaUrl} />
                ) : null}
              </article>
            ))}
          </div>
          <form className="stack-form" onSubmit={handleSendMessage}>
            <label>
              <span>Nouveau message</span>
              <textarea name="content" placeholder="Partage ton ressenti, une question, un retour de seance..." rows={4} />
            </label>
            <label className="file-field">
              <span>Image ou video</span>
              <input accept="image/*,video/*" onChange={handleAttachmentChange} type="file" />
            </label>
            {messageAttachment ? (
              <div className="attachment-chip">
                <span>{messageAttachment.kind === "video" ? "Video" : "Image"} : {messageAttachment.name}</span>
              </div>
            ) : null}
            <button className="button button-primary" type="submit">
              Envoyer au coach
            </button>
          </form>
        </article>
      </section>

      {validationTarget !== null && exercises[validationTarget] ? (
        <div className="validation-modal-backdrop" role="presentation">
          <div aria-modal="true" className="validation-modal" role="dialog">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Validation obligatoire</p>
                <h2>Pourquoi l'exercice n'est pas termine ?</h2>
              </div>
            </div>
            <p className="muted-text">
              Selectionne au moins une raison ou renseigne une autre justification pour passer a l'exercice suivant.
            </p>
            <div className="validation-reason-grid">
              {abandonReasons.map((reason) => (
                <button
                  className={`reason-chip ${validationForm.reasons.includes(reason) ? "active" : ""}`}
                  key={reason}
                  onClick={() => handleToggleValidationReason(reason)}
                  type="button"
                >
                  {reason}
                </button>
              ))}
            </div>
            <label className="stack-form">
              <span>Autre raison</span>
              <textarea
                onChange={(event) =>
                  setValidationForm((current) => ({ ...current, otherReason: event.target.value }))
                }
                placeholder="Precise le contexte si besoin"
                rows={4}
                value={validationForm.otherReason}
              />
            </label>
            <div className="hero-actions compact-actions">
              <button
                className="button button-ghost"
                onClick={() => {
                  setValidationTarget(null);
                  setValidationForm({ reasons: [], otherReason: "" });
                }}
                type="button"
              >
                Retour
              </button>
              <button className="button button-primary" onClick={handleConfirmValidation} type="button">
                Valider et passer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ProgressPillar({ label, value }) {
  return (
    <div className="progress-pillar">
      <span>{label}</span>
      <strong>{value}%</strong>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function ChartBlock({ points, title, valueKey, unit }) {
  const values = points?.map((point) => Number(point[valueKey] ?? 0)) ?? [];

  if (!values.length) {
    return <div className="empty-card">Aucune donnee de progression.</div>;
  }

  const width = 640;
  const height = 180;
  const padding = 24;
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = Math.max(maxValue - minValue, 1);
  const stepX = (width - padding * 2) / Math.max(values.length - 1, 1);
  const coords = points.map((point, index) => {
    const x = padding + index * stepX;
    const normalized = (Number(point[valueKey]) - minValue) / range;
    const y = height - padding - normalized * (height - padding * 2);
    return { x, y, point };
  });
  const path = coords.map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x},${coord.y}`).join(" ");

  return (
    <div className="chart-block">
      <div className="chart-label-row">
        <strong>{title}</strong>
        <span>{values.at(-1)} {unit}</span>
      </div>
      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`${valueKey}Gradient`} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#C0C0C0" />
            <stop offset="100%" stopColor="#F5F5F5" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke={`url(#${valueKey}Gradient)`} strokeWidth="4" />
        {coords.map((coord) => (
          <circle cx={coord.x} cy={coord.y} fill="#F5F5F5" key={`${valueKey}-${coord.point.date}`} r="4" />
        ))}
      </svg>
    </div>
  );
}
