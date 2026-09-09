"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { Star } from "lucide-react";

interface FavoritesContextValue {
  favorites: ReadonlySet<string>;
  toggleFavorite: (teamId: string, teamName: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({
  favorites,
  onToggle,
  children,
}: {
  favorites: ReadonlySet<string>;
  onToggle: (teamId: string) => void;
  children: ReactNode;
}) {
  const [announcement, setAnnouncement] = useState("");
  const toggleFavorite = useCallback(
    (teamId: string, teamName: string) => {
      const adding = !favorites.has(teamId);
      onToggle(teamId);
      setAnnouncement(
        `${teamName} ${adding ? "added to" : "removed from"} My Teams.`,
      );
    },
    [favorites, onToggle],
  );
  const value = useMemo(
    () => ({ favorites, toggleFavorite }),
    [favorites, toggleFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}

type FavoriteGestureProps = HTMLAttributes<HTMLElement> & {
  "data-favorite-gesture"?: string;
};

export function useFavoriteGesture(
  teamId: string | null | undefined,
  teamName: string,
): FavoriteGestureProps {
  const context = useFavorites();
  const lastTap = useRef(0);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerType = useRef("");
  const didFavorite = useRef(false);

  const clearNavigation = useCallback(() => {
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
    navigationTimer.current = null;
  }, []);

  if (!context || !teamId) return {};

  return {
    "data-favorite-gesture": "true",
    title: `Double-tap to ${context.favorites.has(teamId) ? "remove" : "add"} ${teamName} ${context.favorites.has(teamId) ? "from" : "to"} My Teams`,
    onPointerUp: (event) => {
      pointerType.current = event.pointerType;
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      const now = performance.now();
      didFavorite.current = now - lastTap.current < 320;
      if (didFavorite.current) {
        clearNavigation();
        lastTap.current = 0;
        context.toggleFavorite(teamId, teamName);
      } else {
        lastTap.current = now;
      }
    },
    onClick: (event) => {
      if (pointerType.current !== "touch" && pointerType.current !== "pen") return;
      event.preventDefault();
      event.stopPropagation();
      if (didFavorite.current) {
        didFavorite.current = false;
        return;
      }
      const anchor = event.currentTarget.closest("a");
      if (!anchor?.href) return;
      clearNavigation();
      navigationTimer.current = setTimeout(() => {
        window.location.assign(anchor.href);
      }, 320);
    },
  };
}

export function FavoriteButton({
  teamId,
  teamName,
  className = "favorite-shortcut-button",
}: {
  teamId: string;
  teamName: string;
  className?: string;
}) {
  const context = useFavorites();
  if (!context) return null;
  const selected = context.favorites.has(teamId);

  return (
    <button
      className={className}
      type="button"
      aria-pressed={selected}
      aria-label={`${selected ? "Remove" : "Add"} ${teamName} ${selected ? "from" : "to"} My Teams`}
      onClick={() => context.toggleFavorite(teamId, teamName)}
    >
      <Star aria-hidden="true" fill={selected ? "currentColor" : "none"} />
      <span>{selected ? "My Team" : "Add team"}</span>
    </button>
  );
}
