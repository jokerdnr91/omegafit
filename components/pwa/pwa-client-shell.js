"use client";

import { useEffect, useState } from "react";

function isIosSafari() {
  if (typeof window === "undefined") {
    return false;
  }

  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua);
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replaceAll("-", "+").replaceAll("_", "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

export function PwaClientShell() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [permission, setPermission] = useState("default");
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [isLoginScreen, setIsLoginScreen] = useState(false);

  const shouldRender =
    Boolean(deferredPrompt) ||
    permission !== "granted" ||
    !isStandalone ||
    pushSubscribed ||
    Boolean(feedback);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setPermission(window.Notification?.permission ?? "default");
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true);
    setIsOnline(window.navigator.onLine);
    setIsLoginScreen(window.location.pathname.startsWith("/login"));
    setPushSupported(
      "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window &&
        (window.isSecureContext || window.location.hostname === "localhost"),
    );

    if ("serviceWorker" in navigator && (window.isSecureContext || window.location.hostname === "localhost")) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(async (registration) => {
          const subscription = await registration.pushManager.getSubscription();
          setPushSubscribed(Boolean(subscription));
        })
        .catch(() => {
          setFeedback("Service Worker indisponible sur cet appareil.");
        });
    }

    function handleInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }

    function handleConnectionChange() {
      setIsOnline(window.navigator.onLine);
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("online", handleConnectionChange);
    window.addEventListener("offline", handleConnectionChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsStandalone(true);
  }

  async function handleEnableNotifications() {
    if (!pushSupported) {
      setFeedback("Notifications push disponibles uniquement en HTTPS ou localhost.");
      return;
    }

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        setFeedback("Les notifications n'ont pas ete autorisees.");
        return;
      }

      const keyResponse = await fetch("/api/push/public-key");
      if (!keyResponse.ok) {
        const error = await keyResponse.json().catch(() => ({}));
        throw new Error(error.error ?? "Cle VAPID indisponible.");
      }

      const { publicKey } = await keyResponse.json();
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const subscribeResponse = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      if (!subscribeResponse.ok) {
        const error = await subscribeResponse.json().catch(() => ({}));
        throw new Error(error.error ?? "Enregistrement push impossible.");
      }

      setPushSubscribed(true);
      setFeedback("Notifications activees.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Activation impossible.");
    }
  }

  async function handlePushTest(type) {
    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Envoi test impossible.");
      }

      setFeedback(type === "message" ? "Notification message envoyee." : "Notification rappel envoyee.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Envoi test impossible.");
    }
  }

  if (!shouldRender) {
    return null;
  }

  return (
    <aside className="pwa-shell" aria-live="polite">
      <div className="pwa-head">
        <span className="pwa-mark" aria-hidden="true">
          Ω
        </span>
        <div>
          <strong>Mode App</strong>
          <p>{isOnline ? "Pret pour installation" : "Mode hors ligne partiel actif"}</p>
        </div>
      </div>

      {!isStandalone && deferredPrompt ? (
        <button className="button button-primary" onClick={handleInstall} type="button">
          Installer OMEGA FIT
        </button>
      ) : null}

      {!isStandalone && !deferredPrompt && isIosSafari() ? (
        <p className="pwa-tip">Sur iPhone/iPad: partage puis "Sur l'ecran d'accueil".</p>
      ) : null}

      {!isLoginScreen && permission !== "granted" ? (
        <button className="button button-ghost" onClick={handleEnableNotifications} type="button">
          Activer les notifications
        </button>
      ) : null}

      {!isLoginScreen && pushSubscribed ? (
        <div className="pwa-actions">
          <button className="button button-ghost" onClick={() => handlePushTest("reminder")} type="button">
            Tester rappel
          </button>
          <button className="button button-ghost" onClick={() => handlePushTest("message")} type="button">
            Tester message
          </button>
        </div>
      ) : null}

      {feedback ? <p className="pwa-tip">{feedback}</p> : null}
    </aside>
  );
}
