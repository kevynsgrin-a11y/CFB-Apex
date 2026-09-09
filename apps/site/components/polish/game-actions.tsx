"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  BookOpen,
  ChevronRight,
  MoreHorizontal,
  Radio,
  Trophy,
  X,
} from "lucide-react";
import {
  useCallback,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
} from "react";

const HOLD_DURATION = 520;
const MOVE_TOLERANCE = 12;

export function useGameActionSheet() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const suppressClick = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!event.isPrimary || event.button !== 0) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("button, input, select, textarea, summary")) return;
      cancel();
      suppressClick.current = false;
      origin.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(() => {
        suppressClick.current = true;
        setOpen(true);
      }, HOLD_DURATION);
    },
    [cancel],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (
        Math.hypot(
          event.clientX - origin.current.x,
          event.clientY - origin.current.y,
        ) > MOVE_TOLERANCE
      ) {
        cancel();
      }
    },
    [cancel],
  );

  const longPressProps: HTMLAttributes<HTMLElement> = {
    onPointerDown,
    onPointerMove,
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onClickCapture: (event) => {
      if (!suppressClick.current) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick.current = false;
    },
  };

  return { open, setOpen, longPressProps };
}

export function GameActionsButton({
  onClick,
  label,
  className = "game-actions-trigger",
}: {
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      className={className}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <MoreHorizontal aria-hidden="true" />
      <span className="game-actions-trigger__label">More</span>
    </button>
  );
}

export function GameActionSheet({
  open,
  onOpenChange,
  gameLabel,
  matchupHref,
  guideHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameLabel: string;
  matchupHref: string;
  guideHref: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="polish-sheet-overlay" />
        <Dialog.Content className="polish-sheet game-action-sheet">
          <div className="polish-sheet__handle" aria-hidden="true" />
          <header className="polish-sheet__header">
            <div>
              <Dialog.Title>Game actions</Dialog.Title>
              <Dialog.Description>{gameLabel}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close game actions">
                <X aria-hidden="true" />
              </button>
            </Dialog.Close>
          </header>
          <nav className="game-action-sheet__links" aria-label={`${gameLabel} actions`}>
            <a href={matchupHref}>
              <Trophy aria-hidden="true" />
              <span>
                <strong>Matchup Center</strong>
                <small>Scores, context, and team details</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </a>
            <a href="/watch">
              <Radio aria-hidden="true" />
              <span>
                <strong>Watch</strong>
                <small>TV and audio availability</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </a>
            <a href={guideHref}>
              <BookOpen aria-hidden="true" />
              <span>
                <strong>Gameday Guide</strong>
                <small>Venue, parking, and arrival notes</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </a>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
