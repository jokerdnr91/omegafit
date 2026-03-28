import { useEffect, useState } from "react";

function formatDate(value, options = { dateStyle: "medium", timeStyle: "short" }) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("fr-FR", options).format(new Date(value));
}

function statusTone(value) {
  return String(value ?? "").toLowerCase().replaceAll(" ", "-");
}

function getClientActivityState(client) {
  if (!client?.lastCheckInAt) {
    return "Inactive";
  }

  const daysSinceCheckIn =
    (Date.now() - new Date(client.lastCheckInAt).getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceCheckIn <= 7 ? "Actif" : "Inactif";
}

function buildClientHistory(client) {
  return [
    ...(client.messages ?? []).slice(0, 4).map((message) => ({
      id: `message-${message.id}`,
      title: message.senderRole === "coach" ? "Message coach" : "Message client",
      detail:
        message.content ||
        (message.mediaType === "video" ? "Video partagee" : "Image partagee"),
      createdAt: message.createdAt,
    })),
    ...(client.checkIns ?? []).slice(0, 4).map((entry) => ({
      id: `checkin-${entry.id}`,
      title: "Check-in",
      detail: `${entry.workoutCompletion}% de completion, energie ${entry.energy}/10`,
      createdAt: entry.createdAt,
    })),
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 6);
}

function buildBehaviorInsights(client) {
  const latestCheckIn = client.latestCheckIn;
  const incompleteTasks = client.tasks.filter((task) => !task.done).length;
  const adherence = Number(client.stats.adherence ?? 0);
  const recovery = Number(client.stats.recovery ?? 0);
  const unreadMessages = Number(client.unreadMessages ?? 0);

  return [
    {
      label: "Discipline",
      value: `${adherence}/100`,
      detail:
        adherence >= 90 ? "Execution elite, peu de friction." : "Execution a consolider sur la semaine.",
    },
    {
      label: "Recuperation",
      value: `${recovery}%`,
      detail:
        recovery >= 80 ? "Etat de forme stable." : "Surveillance charge, sommeil et stress.",
    },
    {
      label: "Engagement",
      value: `${10 - incompleteTasks}/10`,
      detail:
        unreadMessages > 0
          ? `${unreadMessages} message(s) en attente cote coach.`
          : "Dialogue fluide et reactif.",
    },
    {
      label: "Signal du moment",
      value: latestCheckIn ? `${latestCheckIn.motivation}/10` : "--",
      detail: latestCheckIn?.note || "Pas encore de note comportementale recente.",
    },
  ];
}

function createProgramExerciseRow() {
  return {
    id: crypto.randomUUID(),
    dayLabel: "Jour 1",
    name: "",
    videoUrl: "",
    targetSets: "4",
    targetReps: "10",
    targetWeightKg: "",
  };
}

export function HeroSection({
  coach,
  isPending,
  onOpenCoachMenu,
  onLogout,
  spotlightClient,
  syncStatus,
  user,
  agenda,
}) {
  return (
    <header className="dashboard-hero glass-panel">
      <div className="hero-copy">
        <div className="brand-lockup">
          <button className="brand-mark brand-mark-button" onClick={onOpenCoachMenu} type="button">
            {"\u03A9"}
          </button>
          <div>
            <p className="eyebrow">OMEGA FIT</p>
            <p className="brand-subtitle">Luxury Performance Platform</p>
          </div>
        </div>
        <h1>Le cockpit premium du coaching sportif.</h1>
        <p className="hero-lead">{coach.tagline}</p>
        <div className="hero-actions">
          <button
            className="button button-primary"
            onClick={() => document.getElementById("clients-panel")?.scrollIntoView({ behavior: "smooth" })}
            type="button"
          >
            Ouvrir le roster
          </button>
          <button className="button button-ghost" onClick={onLogout} type="button">
            Deconnexion
          </button>
        </div>
      </div>

      <aside className="hero-side">
        <div className="live-badge">
          <span className="live-dot"></span>
          {isPending ? "Synchronisation..." : syncStatus}
        </div>
        <div className="coach-summary">
          <div>
            <p className="section-kicker">Coach</p>
            <h2>{coach.name || user.name}</h2>
            <p className="muted-text">{coach.title}</p>
          </div>
          <div className="coach-mini-stats">
            <div>
              <span>Reponse</span>
              <strong>{coach.responseTime}</strong>
            </div>
            <div>
              <span>NPS</span>
              <strong>{coach.nps}</strong>
            </div>
          </div>
        </div>
        {spotlightClient ? (
          <div className="spotlight-card">
            <span>Client spotlight</span>
            <h3>{spotlightClient.name}</h3>
            <p className="muted-text">{spotlightClient.achievement}</p>
            <div className="mini-grid">
              <div>
                <span>Adherence</span>
                <strong>{spotlightClient.adherence}%</strong>
              </div>
              <div>
                <span>Recup</span>
                <strong>{spotlightClient.recovery}%</strong>
              </div>
            </div>
          </div>
        ) : null}
        <div className="agenda-list">
          {agenda.map((item) => (
            <article className="activity-card" key={item.id}>
              <div className="card-head">
                <strong>{item.name}</strong>
                <span>{formatDate(item.nextSessionAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p>{item.goal}</p>
              <span className={`status-pill status-${statusTone(item.status)}`}>{item.status}</span>
            </article>
          ))}
        </div>
      </aside>
    </header>
  );
}

export function MetricGridSection({ metrics }) {
  return (
    <section className="metric-grid">
      {metrics.map((metric) => (
        <article className="metric-card" key={metric.id}>
          <p>{metric.label}</p>
          <h3>{metric.value}</h3>
          <span>{metric.detail}</span>
        </article>
      ))}
    </section>
  );
}

export function ClientsSection({
  clients,
  comparison,
  latestCredentials,
  onBackToList,
  onDeleteClient,
  onSaveClient,
  onSearchChange,
  onSelectClient,
  search,
  selectedClient,
  showClientList = true,
}) {
  async function handleSave(event) {
    event.preventDefault();
    if (!selectedClient) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    await onSaveClient(selectedClient.id, {
      fullName: String(formData.get("fullName") ?? selectedClient.fullName),
      email: String(formData.get("email") ?? selectedClient.email),
      phone: String(formData.get("phone") ?? selectedClient.phone),
      city: String(formData.get("city") ?? selectedClient.city),
      age: Number(formData.get("age") ?? selectedClient.age),
      goal: String(formData.get("goal") ?? selectedClient.goal),
      planTier: String(formData.get("planTier") ?? selectedClient.planTier),
      nextSessionAt: String(formData.get("nextSessionAt") ?? selectedClient.nextSessionAt),
      tags: String(formData.get("tags") ?? selectedClient.tags.join(", ")),
      weightKg: Number(formData.get("weightKg") ?? selectedClient.stats.weightKg),
      bodyFat: Number(formData.get("bodyFat") ?? selectedClient.stats.bodyFat),
      calories: Number(formData.get("calories") ?? selectedClient.nutrition.calories),
      protein: Number(formData.get("protein") ?? selectedClient.nutrition.protein),
      carbs: Number(formData.get("carbs") ?? selectedClient.nutrition.carbs),
      fats: Number(formData.get("fats") ?? selectedClient.nutrition.fats),
      loginPassword: String(formData.get("loginPassword") ?? ""),
      status: String(formData.get("status") ?? selectedClient.status),
      notes: String(formData.get("notes") ?? selectedClient.notes),
    });
  }

  const history = selectedClient ? buildClientHistory(selectedClient) : [];
  const behavior = selectedClient ? buildBehaviorInsights(selectedClient) : [];

  return (
    <article className="glass-panel panel" id="clients-panel">
      <div className="panel-head">
        <div>
          <p className="section-kicker">Clients</p>
          <h2>Roster actif</h2>
        </div>
        <input
          className="search-input"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Rechercher un client..."
          value={search}
        />
      </div>

      <div className={`client-layout ${showClientList ? "" : "client-layout-detail-only"}`}>
        {showClientList ? (
          <div className="client-list">
            {clients.map((client) => {
              const activityState = getClientActivityState(client);

              return (
                <button
                  className={`client-card ${selectedClient?.id === client.id ? "active" : ""}`}
                  key={client.id}
                  onClick={() => onSelectClient(client.id)}
                  type="button"
                >
                  <div className="client-card-top">
                    <span className="avatar">{client.initials}</span>
                    <div>
                      <strong>{client.fullName}</strong>
                      <p>{client.goal}</p>
                    </div>
                  </div>
                  <div className="coach-roster-meta">
                    <span className={`status-pill status-${statusTone(activityState)}`}>{activityState}</span>
                    {client.unreadMessages ? <span className="alert-badge">{client.unreadMessages} notif.</span> : null}
                  </div>
                  <div className="mini-grid">
                    <div>
                      <span>Adherence</span>
                      <strong>{client.stats.adherence}%</strong>
                    </div>
                    <div>
                      <span>Recup</span>
                      <strong>{client.stats.recovery}%</strong>
                    </div>
                    <div>
                      <span>Statut</span>
                      <strong>{client.status}</strong>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className={`client-detail ${showClientList ? "" : "client-detail-standalone"}`}>
          {selectedClient ? (
            <div className="client-detail-stack">
              <section className="detail-card" id="client-edit-panel">
                <div className="card-head">
                  <div>
                    <p className="section-kicker">Profil</p>
                    <h3>{selectedClient.fullName}</h3>
                    <p className="muted-text">
                      {selectedClient.goal} · {selectedClient.planTier} · {selectedClient.city}
                    </p>
                  </div>
                  <div className="coach-roster-meta">
                    {!showClientList ? (
                      <button className="button button-ghost" onClick={onBackToList} type="button">
                        Retour
                      </button>
                    ) : null}
                    <span className={`status-pill status-${statusTone(selectedClient.status)}`}>{selectedClient.status}</span>
                    <span className={`status-pill status-${statusTone(getClientActivityState(selectedClient))}`}>
                      {getClientActivityState(selectedClient)}
                    </span>
                  </div>
                </div>
                <div className="tag-row">
                  {selectedClient.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mini-grid">
                  <div><span>Poids</span><strong>{selectedClient.stats.weightKg} kg</strong></div>
                  <div><span>Body fat</span><strong>{selectedClient.stats.bodyFat}%</strong></div>
                  <div><span>HRV</span><strong>{selectedClient.stats.hrv}</strong></div>
                </div>
                <div className="access-card">
                  <div>
                    <span>Connexion eleve</span>
                    <strong>{selectedClient.email}</strong>
                  </div>
                  <p className="muted-text">Tu peux definir ou reinitialiser son mot de passe plus bas dans la fiche.</p>
                </div>
                {latestCredentials && latestCredentials.email === selectedClient.email ? (
                  <div className="access-card accent">
                    <div>
                      <span>Acces genere</span>
                      <strong>{latestCredentials.email}</strong>
                    </div>
                    <p className="muted-text">Mot de passe initial : <strong>{latestCredentials.password}</strong></p>
                  </div>
                ) : null}
              </section>

              <section className="detail-card">
                <div className="card-head">
                  <div>
                    <p className="section-kicker">Progression</p>
                    <h3>Tendance performance</h3>
                  </div>
                  <p className="muted-text">Dernier check-in: {formatDate(selectedClient.lastCheckInAt)}</p>
                </div>
                <TrendChart points={selectedClient.trend} valueKey="performance" />
                <div className="mini-grid four">
                  <div><span>Delta perf.</span><strong>{selectedClient.progression.performanceDelta > 0 ? "+" : ""}{selectedClient.progression.performanceDelta}</strong></div>
                  <div><span>Delta force</span><strong>{selectedClient.progression.strengthDelta > 0 ? "+" : ""}{selectedClient.progression.strengthDelta}</strong></div>
                  <div><span>Delta cardio</span><strong>{selectedClient.progression.conditioningDelta > 0 ? "+" : ""}{selectedClient.progression.conditioningDelta}</strong></div>
                  <div><span>Prochaine session</span><strong>{formatDate(selectedClient.nextSessionAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</strong></div>
                </div>
              </section>

              <section className="detail-card">
                <div className="card-head">
                  <div>
                    <p className="section-kicker">Historique</p>
                    <h3>Trace recente</h3>
                  </div>
                </div>
                <div className="coach-history-list">
                  {history.map((item) => (
                    <article className="coach-history-item" key={item.id}>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </div>
                      <span>{formatDate(item.createdAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </article>
                  ))}
                </div>
              </section>

              <section className="detail-card">
                <div className="card-head">
                  <div>
                    <p className="section-kicker">Analyse comportement</p>
                    <h3>Lecture coach</h3>
                  </div>
                </div>
                <div className="coach-insight-grid">
                  {behavior.map((item) => (
                    <article className="coach-insight-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <p>{item.detail}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="detail-card">
                <div className="card-head">
                  <div>
                    <p className="section-kicker">Analyse execution</p>
                    <h3>Termines vs abandons</h3>
                  </div>
                </div>
                <div className="coach-insight-grid">
                  <article className="coach-insight-card">
                    <span>% exercices termines</span>
                    <strong>{selectedClient.exerciseAnalysis?.completedPercent ?? 0}%</strong>
                    <p>Part des exercices valides sans abandon.</p>
                  </article>
                  <article className="coach-insight-card">
                    <span>% abandons</span>
                    <strong>{selectedClient.exerciseAnalysis?.abandonedPercent ?? 0}%</strong>
                    <p>Exercices quittes avec justification.</p>
                  </article>
                </div>
                <div className="program-exercise-preview">
                  {(selectedClient.exerciseAnalysis?.frequentReasons ?? []).length ? (
                    selectedClient.exerciseAnalysis.frequentReasons.map((item) => (
                      <span className="tag" key={item.reason}>
                        {item.reason} · {item.count}
                      </span>
                    ))
                  ) : (
                    <p className="muted-text">Aucune raison frequente enregistree pour le moment.</p>
                  )}
                </div>
              </section>

              <section className="detail-card">
                <div className="card-head">
                  <div>
                    <p className="section-kicker">Programme</p>
                    <h3>{selectedClient.program?.title ?? "Aucun programme assigne"}</h3>
                  </div>
                  <p className="muted-text">{selectedClient.program?.focus ?? "Assigne un programme depuis la colonne de droite."}</p>
                </div>
                <div className="mini-grid four">
                  <div><span>Calories</span><strong>{selectedClient.nutrition.calories}</strong></div>
                  <div><span>Proteines</span><strong>{selectedClient.nutrition.protein} g</strong></div>
                  <div><span>Glucides</span><strong>{selectedClient.nutrition.carbs} g</strong></div>
                  <div><span>Lipides</span><strong>{selectedClient.nutrition.fats} g</strong></div>
                </div>
                <PerformanceBars items={comparison} />
              </section>

              <section className="detail-card">
                <div className="card-head">
                  <div>
                    <p className="section-kicker">Edition</p>
                    <h3>Fiche client complete</h3>
                  </div>
                </div>
                <form className="stack-form" onSubmit={handleSave}>
                  <div className="inline-grid">
                    <label>
                      <span>Nom complet</span>
                      <input defaultValue={selectedClient.fullName} name="fullName" required />
                    </label>
                    <label>
                      <span>Email de connexion</span>
                      <input defaultValue={selectedClient.email} name="email" type="email" required />
                    </label>
                  </div>
                  <div className="inline-grid">
                    <label>
                      <span>Telephone</span>
                      <input defaultValue={selectedClient.phone} name="phone" />
                    </label>
                    <label>
                      <span>Ville</span>
                      <input defaultValue={selectedClient.city} name="city" />
                    </label>
                  </div>
                  <div className="inline-grid three">
                    <label>
                      <span>Age</span>
                      <input defaultValue={selectedClient.age} name="age" type="number" />
                    </label>
                    <label>
                      <span>Poids</span>
                      <input defaultValue={selectedClient.stats.weightKg} name="weightKg" step="0.1" type="number" />
                    </label>
                    <label>
                      <span>Body fat</span>
                      <input defaultValue={selectedClient.stats.bodyFat} name="bodyFat" step="0.1" type="number" />
                    </label>
                  </div>
                  <div className="inline-grid">
                    <label>
                      <span>Prochaine seance</span>
                      <input defaultValue={selectedClient.nextSessionAt?.slice(0, 16) ?? ""} name="nextSessionAt" type="datetime-local" />
                    </label>
                    <label>
                      <span>Offre</span>
                      <select defaultValue={selectedClient.planTier} name="planTier">
                        <option value="Elite">Elite</option>
                        <option value="Premium">Premium</option>
                        <option value="Essential">Essential</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    <span>Objectif</span>
                    <input defaultValue={selectedClient.goal} name="goal" required />
                  </label>
                  <label>
                    <span>Tags</span>
                    <input defaultValue={selectedClient.tags.join(", ")} name="tags" placeholder="Hyrox, Strength, Nutrition" />
                  </label>
                  <div className="inline-grid four">
                    <label><span>Calories</span><input defaultValue={selectedClient.nutrition.calories} name="calories" type="number" /></label>
                    <label><span>Proteines</span><input defaultValue={selectedClient.nutrition.protein} name="protein" type="number" /></label>
                    <label><span>Glucides</span><input defaultValue={selectedClient.nutrition.carbs} name="carbs" type="number" /></label>
                    <label><span>Lipides</span><input defaultValue={selectedClient.nutrition.fats} name="fats" type="number" /></label>
                  </div>
                  <label>
                    <span>Nouveau mot de passe eleve</span>
                    <input name="loginPassword" placeholder="Laisser vide pour conserver l'actuel" type="text" />
                  </label>
                  <label>
                    <span>Etat du suivi</span>
                    <select defaultValue={selectedClient.status} name="status">
                      <option value="On track">On track</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Attention">Attention</option>
                      <option value="Needs review">Needs review</option>
                      <option value="Onboarding">Onboarding</option>
                    </select>
                  </label>
                  <label>
                    <span>Notes coach</span>
                    <textarea defaultValue={selectedClient.notes} name="notes" rows={4} />
                  </label>
                  <div className="hero-actions compact-actions">
                    <button className="button button-primary" type="submit">Sauvegarder la fiche</button>
                    <button
                      className="button button-ghost danger"
                      onClick={() => {
                        if (window.confirm(`Supprimer ${selectedClient.fullName} du roster ?`)) {
                          void onDeleteClient(selectedClient.id);
                        }
                      }}
                      type="button"
                    >
                      Retirer le client
                    </button>
                  </div>
                </form>
              </section>
            </div>
          ) : (
            <div className="empty-card">Ajoute un client pour ouvrir sa fiche detaillee.</div>
          )}
        </div>
      </div>
    </article>
  );
}

export function SidePanels({ activity, clients, onCreateProgram, programs, selectedClient, syncStatus }) {
  const [exerciseRows, setExerciseRows] = useState([createProgramExerciseRow()]);

  useEffect(() => {
    setExerciseRows([createProgramExerciseRow()]);
  }, [selectedClient?.id]);

  async function handleProgramSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get("title") ?? ""),
      focus: String(formData.get("focus") ?? ""),
      durationWeeks: Number(formData.get("durationWeeks") ?? 8),
      intensity: String(formData.get("intensity") ?? "Medium"),
      clientId: String(formData.get("clientId") ?? ""),
      duplicateProgramId: String(formData.get("duplicateProgramId") ?? ""),
      exercises: exerciseRows,
    };

    await onCreateProgram(payload, () => {
      event.currentTarget.reset();
      setExerciseRows([createProgramExerciseRow()]);
    });
  }

  function updateExerciseRow(rowId, field, value) {
    setExerciseRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  }

  function loadProgramExercises(programId) {
    const source = programs.find((program) => program.id === programId);
    if (!source) {
      return;
    }

    setExerciseRows(
      source.exercises?.length
        ? source.exercises.map((exercise) => ({
            id: crypto.randomUUID(),
            dayLabel: exercise.dayLabel,
            name: exercise.name,
            videoUrl: exercise.videoUrl,
            targetSets: String(exercise.targetSets),
            targetReps: String(exercise.targetReps),
            targetWeightKg: exercise.targetWeightKg ?? "",
          }))
        : [createProgramExerciseRow()],
    );
  }

  return (
    <div className="side-stack">
      <article className="glass-panel panel" id="programs-panel">
        <div className="panel-head">
          <div><p className="section-kicker">Flux</p><h2>Notifications temps reel</h2></div>
          <span className="muted-text">{syncStatus}</span>
        </div>
        <div className="activity-list">
          {activity.map((item) => (
            <article className="activity-card" key={item.id}>
              <div className="card-head"><strong>{item.title}</strong><span>{formatDate(item.createdAt)}</span></div>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </article>

      <article className="glass-panel panel" id="messages-panel">
        <div className="panel-head">
          <div><p className="section-kicker">Programmes</p><h2>Creation & duplication</h2></div>
        </div>
        <div className="program-list">
          {programs.map((program) => (
            <article className="program-card" key={program.id}>
              <div className="card-head">
                <div><strong>{program.title}</strong><p>{program.focus}</p></div>
                <span className={`status-pill status-${statusTone(program.intensity)}`}>{program.intensity}</span>
              </div>
              <div className="mini-grid">
                <div><span>Duree</span><strong>{program.durationWeeks} sem.</strong></div>
                <div><span>Clients</span><strong>{program.clientIds.length}</strong></div>
                <div><span>Exercices</span><strong>{program.exercises?.length ?? 0}</strong></div>
              </div>
              {program.exercises?.length ? (
                <div className="program-exercise-preview">
                  {program.exercises.slice(0, 3).map((exercise) => (
                    <span className="tag" key={exercise.id}>
                      {exercise.dayLabel} · {exercise.name}
                    </span>
                  ))}
                </div>
              ) : null}
              <button className="button button-ghost" onClick={() => loadProgramExercises(program.id)} type="button">
                Charger les exercices
              </button>
            </article>
          ))}
        </div>
        <form className="stack-form" key={selectedClient?.id ?? "program-none"} onSubmit={handleProgramSubmit}>
          <label><span>Titre</span><input name="title" placeholder="Ex: Sprint & Strength" required /></label>
          <label><span>Focus</span><textarea name="focus" placeholder="Objectif, volume, priorites..." required rows={3} /></label>
          <div className="inline-grid">
            <label><span>Duree</span><input defaultValue="8" max="16" min="4" name="durationWeeks" type="number" /></label>
            <label><span>Intensite</span><select defaultValue="Medium" name="intensity"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select></label>
          </div>
          <label>
            <span>Client cible</span>
            <select defaultValue={selectedClient?.id ?? ""} name="clientId">
              {clients.map((client) => <option key={client.id} value={client.id}>{client.fullName}</option>)}
            </select>
          </label>
          <label>
            <span>Dupliquer depuis</span>
            <select defaultValue="" name="duplicateProgramId" onChange={(event) => loadProgramExercises(event.target.value)}>
              <option value="">Aucun</option>
              {programs.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}
            </select>
          </label>

          <div className="program-builder">
            <div className="card-head">
              <strong>Exercices du programme</strong>
              <button className="button button-ghost" onClick={() => setExerciseRows((current) => [...current, createProgramExerciseRow()])} type="button">
                Ajouter un exercice
              </button>
            </div>
            {exerciseRows.map((row, index) => (
              <div className="program-builder-row" key={row.id}>
                <div className="inline-grid">
                  <label><span>Jour</span><input onChange={(event) => updateExerciseRow(row.id, "dayLabel", event.target.value)} value={row.dayLabel} /></label>
                  <label><span>Exercice</span><input onChange={(event) => updateExerciseRow(row.id, "name", event.target.value)} value={row.name} /></label>
                </div>
                <label><span>Video</span><input onChange={(event) => updateExerciseRow(row.id, "videoUrl", event.target.value)} placeholder="https://..." value={row.videoUrl} /></label>
                <div className="inline-grid three">
                  <label><span>Series</span><input onChange={(event) => updateExerciseRow(row.id, "targetSets", event.target.value)} type="number" value={row.targetSets} /></label>
                  <label><span>Reps</span><input onChange={(event) => updateExerciseRow(row.id, "targetReps", event.target.value)} type="number" value={row.targetReps} /></label>
                  <label><span>Poids</span><input onChange={(event) => updateExerciseRow(row.id, "targetWeightKg", event.target.value)} type="number" value={row.targetWeightKg} /></label>
                </div>
                <div className="coach-builder-actions">
                  <span className="muted-text">Bloc {index + 1}</span>
                  <button
                    className="button button-ghost"
                    onClick={() =>
                      setExerciseRows((current) =>
                        current.length === 1 ? [createProgramExerciseRow()] : current.filter((entry) => entry.id !== row.id),
                      )
                    }
                    type="button"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button className="button button-primary" type="submit">Creer le programme</button>
        </form>
      </article>
    </div>
  );
}

export function BottomPanels({ latestCredentials, onCreateCheckIn, onCreateClient, onSendMessage, selectedClient }) {
  async function handleCreateClient(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    await onCreateClient(payload, () => event.currentTarget.reset());
  }

  async function handleCheckIn(event) {
    event.preventDefault();
    if (!selectedClient) return;
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    await onCreateCheckIn(
      {
        clientId: selectedClient.id,
        workoutCompletion: Number(payload.workoutCompletion),
        energy: Number(payload.energy),
        motivation: Number(payload.motivation),
        soreness: Number(payload.soreness),
        weightKg: Number(payload.weightKg),
        note: payload.note,
      },
      () => event.currentTarget.reset(),
    );
  }

  async function handleMessage(event) {
    event.preventDefault();
    if (!selectedClient) return;
    const formData = new FormData(event.currentTarget);
    await onSendMessage(
      { clientId: selectedClient.id, content: String(formData.get("content") ?? "") },
      () => event.currentTarget.reset(),
    );
  }

  return (
    <section className="bottom-grid">
      <article className="glass-panel panel">
        <div className="panel-head"><div><p className="section-kicker">Communication</p><h2>Messagerie coach</h2></div></div>
        <div className="message-list">
          {selectedClient?.messages?.length ? selectedClient.messages.map((message) => (
            <article className={`message-card ${message.senderRole}`} key={message.id}>
              <div className="card-head"><strong>{message.senderRole === "coach" ? "Coach" : selectedClient.fullName}</strong><span>{formatDate(message.createdAt)}</span></div>
              {message.content ? <p>{message.content}</p> : null}
              {message.mediaUrl && message.mediaType === "image" ? <img alt="Media conversation" className="message-media" src={message.mediaUrl} /> : null}
              {message.mediaUrl && message.mediaType === "video" ? <video className="message-media" controls src={message.mediaUrl} /> : null}
            </article>
          )) : <div className="empty-card">Selectionne un client pour voir le fil de messages.</div>}
        </div>
        <form className="stack-form" onSubmit={handleMessage}>
          <label><span>Message</span><textarea name="content" placeholder="Ton feedback coaching..." required rows={4} /></label>
          <button className="button button-primary" disabled={!selectedClient} type="submit">Envoyer</button>
        </form>
      </article>

      <article className="glass-panel panel">
        <div className="panel-head"><div><p className="section-kicker">Actions rapides</p><h2>Onboarding & check-ins</h2></div></div>
        <div className="forms-stack">
          <form className="stack-form" onSubmit={handleCreateClient}>
            <h3>Nouveau client</h3>
            <label><span>Nom complet</span><input name="fullName" placeholder="Nom du client" required /></label>
            <div className="inline-grid">
              <label><span>Email</span><input name="email" placeholder="client@example.com" type="email" /></label>
              <label><span>Telephone</span><input name="phone" placeholder="+33 6..." /></label>
            </div>
            <div className="inline-grid">
              <label><span>Ville</span><input name="city" placeholder="Paris" required /></label>
              <label><span>Age</span><input defaultValue="30" max="80" min="16" name="age" type="number" /></label>
            </div>
            <label><span>Objectif</span><input name="goal" placeholder="Transformation, Hyrox, prise de masse..." required /></label>
            <label><span>Offre</span><select defaultValue="Premium" name="planTier"><option value="Elite">Elite</option><option value="Premium">Premium</option><option value="Essential">Essential</option></select></label>
            <label><span>Mot de passe eleve</span><input name="loginPassword" placeholder="Laisser vide pour generation auto" /></label>
            <label><span>Notes</span><textarea name="notes" placeholder="Contexte, niveau, contraintes..." rows={3} /></label>
            <button className="button button-primary" type="submit">Ajouter le client</button>
            {latestCredentials ? (
              <div className="access-card accent">
                <div>
                  <span>Dernier acces genere</span>
                  <strong>{latestCredentials.email}</strong>
                </div>
                <p className="muted-text">Mot de passe : <strong>{latestCredentials.password}</strong></p>
              </div>
            ) : null}
          </form>

          <form className="stack-form" key={selectedClient?.id ?? "checkin-none"} onSubmit={handleCheckIn}>
            <h3>Nouveau check-in</h3>
            <label><span>Completion du plan (%)</span><input defaultValue={selectedClient?.latestCheckIn?.workoutCompletion ?? 90} max="100" min="0" name="workoutCompletion" type="number" /></label>
            <div className="inline-grid">
              <label><span>Energie /10</span><input defaultValue={selectedClient?.latestCheckIn?.energy ?? 8} max="10" min="1" name="energy" type="number" /></label>
              <label><span>Motivation /10</span><input defaultValue={selectedClient?.latestCheckIn?.motivation ?? 8} max="10" min="1" name="motivation" type="number" /></label>
            </div>
            <div className="inline-grid">
              <label><span>Courbatures /10</span><input defaultValue={selectedClient?.latestCheckIn?.soreness ?? 4} max="10" min="1" name="soreness" type="number" /></label>
              <label><span>Poids (kg)</span><input defaultValue={selectedClient?.stats.weightKg ?? 72} min="35" name="weightKg" step="0.1" type="number" /></label>
            </div>
            <label><span>Note coach</span><textarea name="note" placeholder="Ressenti, ajustements, points d'attention..." rows={3} /></label>
            <button className="button button-primary" disabled={!selectedClient} type="submit">Enregistrer le check-in</button>
          </form>
        </div>
      </article>
    </section>
  );
}

function TrendChart({ points, valueKey }) {
  if (!points?.length) {
    return <div className="empty-card">Aucune donnee de progression.</div>;
  }

  const width = 640;
  const height = 220;
  const padding = 26;
  const values = points.map((point) => Number(point[valueKey] ?? 0));
  const maxValue = Math.max(...values, 100);
  const minValue = Math.min(...values, 0);
  const range = Math.max(maxValue - minValue, 1);
  const stepX = (width - padding * 2) / Math.max(points.length - 1, 1);
  const coords = points.map((point, index) => {
    const x = padding + index * stepX;
    const normalized = (Number(point[valueKey]) - minValue) / range;
    const y = height - padding - normalized * (height - padding * 2);
    return { x, y, point };
  });
  const path = coords.map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x},${coord.y}`).join(" ");
  const area = `${path} L ${coords.at(-1).x},${height - padding} L ${coords[0].x},${height - padding} Z`;

  return (
    <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`lineGradient-${valueKey}`} x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#C0C0C0" />
          <stop offset="100%" stopColor="#F5F5F5" />
        </linearGradient>
        <linearGradient id={`areaGradient-${valueKey}`} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#E5E5E5" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#E5E5E5" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#areaGradient-${valueKey})`} />
      <path d={path} fill="none" stroke={`url(#lineGradient-${valueKey})`} strokeWidth="4" />
      {coords.map((coord) => <circle cx={coord.x} cy={coord.y} fill="#F5F5F5" key={`${valueKey}-${coord.point.date}`} r="4.5" />)}
    </svg>
  );
}

function PerformanceBars({ items }) {
  return (
    <div className="performance-list">
      {items.map((item) => (
        <article className="performance-item" key={item.id}>
          <div className="card-head"><strong>{item.name}</strong><span>{item.performance}/100</span></div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${item.performance}%` }} /></div>
          <p className="muted-text">Recup {item.recovery}% · Adherence {item.adherence}%</p>
        </article>
      ))}
    </div>
  );
}
