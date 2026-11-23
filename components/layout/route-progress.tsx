"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Timers = {
  tick?: ReturnType<typeof setInterval>;
  hide?: ReturnType<typeof setTimeout>;
  safety?: ReturnType<typeof setTimeout>;
};

// Barra fina no topo que aparece assim que uma navegação começa (clique em link, filtro, voltar...)
// e some quando a nova tela chega. Dá retorno imediato mesmo quando o servidor demora um pouco.
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<Timers>({});
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    const t = timers.current;

    function clearTimers() {
      clearInterval(t.tick);
      clearTimeout(t.hide);
      clearTimeout(t.safety);
    }

    function finish() {
      clearTimers();
      setProgress(100);
      t.hide = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }

    function start() {
      clearTimers();
      setVisible(true);
      setProgress(12);
      // Anda rápido no começo e desacelera, sem nunca chegar a 100% sozinha.
      t.tick = setInterval(() => setProgress((p) => (p < 85 ? p + (90 - p) * 0.12 : p)), 200);
      // Rede de segurança: se a URL não mudar, esconde a barra mesmo assim.
      t.safety = setTimeout(finish, 10000);
    }

    finishRef.current = finish;

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }

    // router.push/replace (filtros, formulários) não geram clique em link: observa o history.
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;
    function wrap(original: typeof window.history.pushState): typeof window.history.pushState {
      return function (this: History, data, unused, url) {
        if (url) {
          const next = new URL(String(url), window.location.href);
          if (next.pathname + next.search !== window.location.pathname + window.location.search) start();
        }
        return original.call(this, data, unused, url);
      };
    }
    window.history.pushState = wrap(originalPush);
    window.history.replaceState = wrap(originalReplace);
    window.addEventListener("popstate", start);
    document.addEventListener("click", onClick, true);

    return () => {
      clearTimers();
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
      window.removeEventListener("popstate", start);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  // A rota mudou de fato: completa a barra.
  useEffect(() => {
    finishRef.current();
  }, [routeKey]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms" }}
    >
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-violet-500 via-indigo-400 to-sky-400 shadow-[0_0_10px_oklch(0.68_0.21_285/0.8)]"
        style={{ width: `${progress}%`, transition: "width 200ms ease-out" }}
      />
    </div>
  );
}
