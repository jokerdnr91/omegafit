"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  BottomPanels,
  ClientsSection,
  HeroSection,
  MetricGridSection,
  SidePanels,
} from "./dashboard-sections";

const emptyDashboard = {
  overview: {
    coach: {
      name: "",
      title: "",
      tagline: "",
      responseTime: "",
      nps: 0,
      planPricing: {},
    },
    metrics: [],
    spotlightClient: null,
    agenda: [],
    performanceBreakdown: [],
  },
  clients: [],
  programs: [],
  activity: [],
};

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

export function DashboardShell({ user }) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [latestCredentials, setLatestCredentials] = useState(null);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [isClientDetailOpen, setIsClientDetailOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [syncStatus, setSyncStatus] = useState("Initialisation du cockpit...");
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(search);

  const filteredClients = dashboard.clients.filter((client) => {
    if (!deferredSearch.trim()) {
      return true;
    }

    const needle = deferredSearch.trim().toLowerCase();
    return (
      client.fullName.toLowerCase().includes(needle) ||
      client.goal.toLowerCase().includes(needle) ||
      client.city.toLowerCase().includes(needle)
    );
  });

  const selectedClient =
    dashboard.clients.find((client) => client.id === selectedClientId) ??
    dashboard.clients[0] ??
    null;

  function openCoachMenu() {
    setIsCommandMenuOpen(true);
  }

  function closeCoachMenu() {
    setIsCommandMenuOpen(false);
  }

  function jumpToSection(sectionId) {
    closeCoachMenu();
    if (!sectionId) {
      return;
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function openWorkspace(workspace, sectionId) {
    if (workspace === "clients") {
      setIsClientDetailOpen(false);
    }
    setActiveWorkspace(workspace);
    jumpToSection(sectionId);
  }

  function handleSelectClient(clientId) {
    setSelectedClientId(clientId);
    setIsClientDetailOpen(true);

    if (activeWorkspace === "clients" || activeWorkspace === "edition") {
      window.requestAnimationFrame(() => {
        document.getElementById("client-edit-panel")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }

  function handleBackToClientList() {
    setIsClientDetailOpen(false);
    window.requestAnimationFrame(() => {
      document.getElementById("clients-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  useEffect(() => {
    void loadDashboard("Cockpit pret");
  }, []);

  useEffect(() => {
    if (!selectedClientId && dashboard.clients.length) {
      setSelectedClientId(dashboard.clients[0].id);
    }
  }, [dashboard.clients, selectedClientId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      startTransition(() => {
        void loadDashboard("Synchronisation automatique");
      });
    }, 12000);

    return () => window.clearInterval(interval);
  }, []);

  async function loadDashboard(message) {
    try {
      const payload = await fetchJson("/api/dashboard");
      setDashboard(payload);

      if (!selectedClientId && payload.clients[0]?.id) {
        setSelectedClientId(payload.clients[0].id);
      }

      if (selectedClientId && !payload.clients.some((client) => client.id === selectedClientId)) {
        setSelectedClientId(payload.clients[0]?.id ?? null);
      }

      setSyncStatus(message);
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : "Impossible de charger le dashboard.");
    }
  }

  async function runMutation(requestFactory, pendingMessage, successMessage, onSuccess) {
    try {
      setSyncStatus(pendingMessage);
      await requestFactory();
      onSuccess?.();

      startTransition(() => {
        void loadDashboard(successMessage);
      });
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : "Une erreur est survenue");
    }
  }

  const actions = {
    selectClient: setSelectedClientId,
    setSearch,
    logout: async () => {
      await fetchJson("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    },
    createClient: async (payload, reset) =>
      runMutation(
        async () => {
          const result = await fetchJson("/api/clients", { method: "POST", body: JSON.stringify(payload) });
          setLatestCredentials(result.credentials ?? null);
          return result;
        },
        "Creation du client...",
        "Nouveau client ajoute",
        reset,
      ),
    deleteClient: async (clientId) =>
      runMutation(
        () => fetchJson(`/api/clients/${clientId}`, { method: "DELETE" }),
        "Suppression du client...",
        "Client retire",
        () => setSelectedClientId(null),
      ),
    createProgram: async (payload, reset) =>
      runMutation(
        () => fetchJson("/api/programs", { method: "POST", body: JSON.stringify(payload) }),
        "Creation du programme...",
        "Programme cree",
        reset,
      ),
    sendMessage: async (payload, reset) =>
      runMutation(
        () => fetchJson("/api/messages", { method: "POST", body: JSON.stringify(payload) }),
        "Envoi du message...",
        "Message envoye",
        reset,
      ),
    createCheckIn: async (payload, reset) =>
      runMutation(
        () => fetchJson("/api/checkins", { method: "POST", body: JSON.stringify(payload) }),
        "Enregistrement du check-in...",
        "Check-in enregistre",
        reset,
      ),
    saveClient: async (clientId, payload) =>
      runMutation(
        () => fetchJson(`/api/clients/${clientId}`, { method: "PATCH", body: JSON.stringify(payload) }),
        "Sauvegarde de la fiche...",
        "Fiche client sauvegardee",
      ),
  };

  return (
    <main className="dashboard-page" id="dashboard-top">
      <HeroSection
        coach={dashboard.overview.coach}
        isPending={isPending}
        onOpenCoachMenu={openCoachMenu}
        onLogout={actions.logout}
        syncStatus={syncStatus}
        user={user}
      />

      {activeWorkspace ? (
        <>
          {activeWorkspace === "clients" ? (
            <section className="single-workspace-grid">
              <ClientsSection
                clients={filteredClients}
                comparison={dashboard.overview.performanceBreakdown}
                latestCredentials={latestCredentials}
                onDeleteClient={actions.deleteClient}
                onBackToList={handleBackToClientList}
                onSaveClient={actions.saveClient}
                onSearchChange={actions.setSearch}
                onSelectClient={handleSelectClient}
                search={search}
                selectedClient={selectedClient}
                showClientList={!isClientDetailOpen}
              />
            </section>
          ) : null}

          {activeWorkspace === "edition" ? (
            <>
              <MetricGridSection metrics={dashboard.overview.metrics} />
              <section className="single-workspace-grid">
                <ClientsSection
                  clients={filteredClients}
                  comparison={dashboard.overview.performanceBreakdown}
                  latestCredentials={latestCredentials}
                  onDeleteClient={actions.deleteClient}
                  onBackToList={handleBackToClientList}
                  onSaveClient={actions.saveClient}
                  onSearchChange={actions.setSearch}
                  onSelectClient={handleSelectClient}
                  search={search}
                  selectedClient={selectedClient}
                  showClientList
                />
              </section>
              <BottomPanels
                onCreateCheckIn={actions.createCheckIn}
                onCreateClient={actions.createClient}
                onSendMessage={actions.sendMessage}
                selectedClient={selectedClient}
                latestCredentials={latestCredentials}
              />
            </>
          ) : null}

          {activeWorkspace === "messages" ? (
            <BottomPanels
              onCreateCheckIn={actions.createCheckIn}
              onCreateClient={actions.createClient}
              onSendMessage={actions.sendMessage}
              selectedClient={selectedClient}
              latestCredentials={latestCredentials}
            />
          ) : null}

          {activeWorkspace === "programs" ? (
            <section className="single-workspace-grid">
              <SidePanels
                activity={dashboard.activity}
                clients={dashboard.clients}
                onCreateProgram={actions.createProgram}
                programs={dashboard.programs}
                selectedClient={selectedClient}
                syncStatus={syncStatus}
              />
            </section>
          ) : null}
        </>
      ) : null}

      {isCommandMenuOpen ? (
        <div className="coach-command-backdrop" onClick={closeCoachMenu} role="presentation">
          <aside
            aria-label="Navigation coach"
            className="coach-command-menu glass-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-head">
              <div>
                <p className="section-kicker">Omega Menu</p>
                <h2>Pilotage coach</h2>
              </div>
              <button className="button button-ghost" onClick={closeCoachMenu} type="button">
                Fermer
              </button>
            </div>

            <div className="coach-command-groups">
              <button
                className="coach-command-item"
                onClick={() => {
                  setActiveWorkspace(null);
                  jumpToSection("dashboard-top");
                }}
                type="button"
              >
                <span>Maison</span>
                <strong>Accueil premium</strong>
                <em>Hero uniquement, sans panneaux ouverts</em>
              </button>
              <button className="coach-command-item" onClick={() => openWorkspace("clients", "clients-panel")} type="button">
                <span>Clients</span>
                <strong>Roster et statut</strong>
                <em>{dashboard.clients.length} clients dans le portefeuille</em>
              </button>
              <button className="coach-command-item" onClick={() => openWorkspace("edition", "client-edit-panel")} type="button">
                <span>Edition</span>
                <strong>Modifier, ajouter, retirer</strong>
                <em>{selectedClient ? `Fiche active : ${selectedClient.fullName}` : "Selectionne un client"}</em>
              </button>
              <button className="coach-command-item" onClick={() => openWorkspace("messages", "messages-panel")} type="button">
                <span>Messages</span>
                <strong>Messagerie en direct</strong>
                <em>{selectedClient?.unreadMessages ?? 0} message(s) non lus</em>
              </button>
              <button className="coach-command-item" onClick={() => openWorkspace("programs", "programs-panel")} type="button">
                <span>Programmes</span>
                <strong>Builder & duplication</strong>
                <em>{dashboard.programs.length} programme(s) disponibles</em>
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
