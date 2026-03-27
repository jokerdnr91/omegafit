const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value, digits = 1) {
  return Number(value.toFixed(digits));
}

function sortByDateDescending(items, key = "createdAt") {
  return [...items].sort(
    (left, right) => new Date(right[key]).getTime() - new Date(left[key]).getTime(),
  );
}

function sortByDateAscending(items, key) {
  return [...items].sort(
    (left, right) => new Date(left[key]).getTime() - new Date(right[key]).getTime(),
  );
}

export function buildClientPayload(client, programs, messages, checkIns) {
  const clientMessages = messages.filter((message) => message.clientId === client.id);
  const clientCheckIns = checkIns.filter((entry) => entry.clientId === client.id);
  const program = programs.find((entry) => entry.id === client.programId) ?? null;
  const latestCheckIn = sortByDateDescending(clientCheckIns, "createdAt")[0] ?? null;
  const latestTrend = client.trend.at(-1) ?? null;
  const previousTrend = client.trend.at(-2) ?? latestTrend;

  return {
    ...client,
    program,
    latestCheckIn,
    messages: sortByDateDescending(clientMessages),
    checkIns: sortByDateDescending(clientCheckIns, "createdAt"),
    unreadMessages: clientMessages.filter(
      (message) => !message.read && message.senderRole !== "coach",
    ).length,
    progression: latestTrend
      ? {
          performanceDelta: round(
            (latestTrend.performance ?? 0) - (previousTrend?.performance ?? 0),
            1,
          ),
          strengthDelta: round(
            (latestTrend.strength ?? 0) - (previousTrend?.strength ?? 0),
            1,
          ),
          conditioningDelta: round(
            (latestTrend.conditioning ?? 0) - (previousTrend?.conditioning ?? 0),
            1,
          ),
        }
      : {
          performanceDelta: 0,
          strengthDelta: 0,
          conditioningDelta: 0,
        },
  };
}

export function buildOverview({ coach, clients, programs, messages, activity }) {
  const adherenceValues = clients.map((client) => client.stats.adherence);
  const recoveryValues = clients.map((client) => client.stats.recovery);
  const unreadMessages = messages.filter(
    (message) => !message.read && message.senderRole !== "coach",
  ).length;
  const monthlyRevenue = clients.reduce((sum, client) => {
    const pricing = coach.planPricing[client.planTier] ?? 0;
    return sum + pricing;
  }, 0);
  const spotlightClient = [...clients].sort(
    (left, right) => right.stats.adherence - left.stats.adherence,
  )[0];

  return {
    coach,
    metrics: [
      {
        id: "clients",
        label: "Clients actifs",
        value: String(clients.length),
        detail: `${programs.length} programmes en cours`,
      },
      {
        id: "adherence",
        label: "Adherence moyenne",
        value: `${round(average(adherenceValues), 0)}%`,
        detail: "Sur les 14 derniers jours",
      },
      {
        id: "recovery",
        label: "Recuperation",
        value: `${round(average(recoveryValues), 0)}%`,
        detail: "Fatigue maitrisee",
      },
      {
        id: "messages",
        label: "Messages non lus",
        value: String(unreadMessages),
        detail: `${coach.responseTime} de delai moyen`,
      },
      {
        id: "revenue",
        label: "MRR coaching",
        value: currencyFormatter.format(monthlyRevenue),
        detail: "Portefeuille premium",
      },
    ],
    spotlightClient: spotlightClient
      ? {
          id: spotlightClient.id,
          name: spotlightClient.fullName,
          achievement: `${spotlightClient.goal} | +${spotlightClient.progression.performanceDelta} pts performance`,
          adherence: spotlightClient.stats.adherence,
          recovery: spotlightClient.stats.recovery,
          nextSessionAt: spotlightClient.nextSessionAt,
        }
      : null,
    agenda: sortByDateAscending(
      clients.map((client) => ({
        id: client.id,
        name: client.fullName,
        nextSessionAt: client.nextSessionAt,
        goal: client.goal,
        status: client.status,
      })),
      "nextSessionAt",
    ).slice(0, 4),
    performanceBreakdown: clients.map((client) => ({
      id: client.id,
      name: client.fullName,
      performance: client.trend.at(-1)?.performance ?? 0,
      recovery: client.stats.recovery,
      adherence: client.stats.adherence,
    })),
    activity: sortByDateDescending(activity).slice(0, 10),
  };
}
