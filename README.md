# OMEGA FIT

Plateforme premium de coaching sportif construite sur la stack demandee:

- Frontend: Next.js + React
- Backend: API routes Next.js
- Base de donnees: PostgreSQL
- Authentification: JWT en cookie httpOnly
- Synchronisation: polling client + notifications push

## Fonctionnalites

- Connexion coach securisee
- Systeme de roles avec interfaces distinctes `coach` et `client`
- Dashboard premium responsive mobile + desktop
- PWA installable Android et iOS avec mode plein ecran
- Gestion clients avec notes, checklist et statut
- Programmes et assignation rapide
- Check-ins de performance et courbe de progression
- Messagerie coach/client
- Synchronisation automatique compatible Netlify
- Service Worker avec cache, performance et mode hors ligne partiel
- Push notifications pour rappels de seance et messages coach

## Prerequis

- Node.js 20+
- PostgreSQL accessible via `DATABASE_URL`

## Variables d'environnement

Copier `.env.example` vers `.env` puis ajuster:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/omegafit
JWT_SECRET=change-me-in-production
OMEGAFIT_SEED_EMAIL=coach@omegafit.app
OMEGAFIT_SEED_PASSWORD=OmegaFit2026!
OMEGAFIT_CLIENT_SEED_PASSWORD=OmegaFitClient2026!
VAPID_PUBLIC_KEY=replace-with-your-public-key
VAPID_PRIVATE_KEY=replace-with-your-private-key
VAPID_SUBJECT=mailto:security@omegafit.app
```

## Installation

```bash
npm install
```

## Developpement

```bash
npm run dev
```

## Build production

```bash
npm run build
npm start
```

## Deploiement Netlify

Le projet est maintenant adapte a Netlify:

- build: `npm run build`
- plugin: [netlify.toml](/C:/Users/Daver/Desktop/omegafit/netlify.toml)
- pas de serveur Node custom
- base PostgreSQL recommandee: Neon ou autre PostgreSQL managé

Variables a configurer dans Netlify:

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...
OMEGAFIT_SEED_EMAIL=coach@omegafit.app
OMEGAFIT_SEED_PASSWORD=OmegaFit2026!
OMEGAFIT_CLIENT_SEED_PASSWORD=OmegaFitClient2026!
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:security@omegafit.app
```

## PWA

- Manifest: `/manifest.json`
- Service Worker: `/sw.js`
- Fallback offline: `/offline.html`
- Icones PWA: `/api/pwa/icon/192` et `/api/pwa/icon/512`
- Experience mobile: `display: fullscreen`

Les notifications push et l'installation PWA exigent HTTPS en production. `localhost` reste compatible pour le developpement.

## Tests

```bash
npm test
```

## Seed demo

Au premier demarrage, OMEGA FIT initialise le schema PostgreSQL, cree un compte coach seed et injecte des donnees de demonstration realistes.

- Coach seed: `coach@omegafit.app` / `OmegaFit2026!`
- Client seed: `sarah.mendes@example.com` / `OmegaFitClient2026!`
