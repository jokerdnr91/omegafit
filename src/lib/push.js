import { randomUUID } from "node:crypto";

import webpush from "web-push";

import { query, withTransaction } from "./db.js";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:security@omegafit.app";

const pushConfigured = Boolean(vapidPublicKey && vapidPrivateKey && vapidSubject);

if (pushConfigured) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export function isPushConfigured() {
  return pushConfigured;
}

export function getPushPublicKey() {
  if (!pushConfigured) {
    throw new Error("Push notifications are not configured.");
  }

  return vapidPublicKey;
}

export async function savePushSubscriptionForUser(userId, subscription) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error("Invalid push subscription.");
  }

  await withTransaction(async (db) => {
    await db.query("delete from push_subscriptions where endpoint = $1", [subscription.endpoint]);
    await db.query(
      `
        insert into push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
        values ($1, $2, $3, $4, $5, now())
      `,
      [
        randomUUID(),
        userId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
      ],
    );
  });

  return { ok: true };
}

export async function removePushSubscription(endpoint) {
  await query("delete from push_subscriptions where endpoint = $1", [endpoint]);
}

export async function sendPushToUser(userId, notification) {
  if (!pushConfigured) {
    throw new Error("Push notifications are not configured.");
  }

  const subscriptions = await query(
    "select endpoint, p256dh, auth from push_subscriptions where user_id = $1",
    [userId],
  );

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    tag: notification.tag,
    url: notification.url ?? "/dashboard",
    icon: "/api/pwa/icon/192",
    badge: "/api/pwa/icon/192",
  });

  await Promise.all(
    subscriptions.rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth,
            },
          },
          payload,
        );
      } catch (error) {
        const statusCode = error?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await removePushSubscription(row.endpoint);
        } else {
          throw error;
        }
      }
    }),
  );

  return { ok: true };
}
