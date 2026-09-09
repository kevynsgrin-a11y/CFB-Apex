import * as Dialog from '@radix-ui/react-dialog';
import { useState, useCallback, useMemo } from 'react';
import { Trophy, RotateCcw, Share2, Check, X } from 'lucide-react';

// ---------- Types ----------

export interface Team {
  seed: number;
  name: string;
  abbreviation: string;
  color: string;
  record: string;
}

interface Slot {
  team: Team | null;
  sourceGameIdx?: number;
}

interface Matchup {
  id: string;
  round: number;
  slots: [Slot, Slot];
  winner: Team | null;
}

// ---------- Default teams ----------

const DEFAULT_TEAMS: Team[] = [
  { seed: 1, name: 'Oregon', abbreviation: 'ORE', color: '#00A19D', record: '13-0' },
  { seed: 2, name: 'Georgia', abbreviation: 'UGA', color: '#BA0C2F', record: '12-1' },
  { seed: 3, name: 'Texas', abbreviation: 'TEX', color: '#BF5700', record: '12-1' },
  { seed: 4, name: 'Ohio State', abbreviation: 'OSU', color: '#BB0009', record: '12-1' },
  { seed: 5, name: 'Penn State', abbreviation: 'PSU', color: '#093C8E', record: '11-2' },
  { seed: 6, name: 'Notre Dame', abbreviation: 'ND', color: '#0C2340', record: '11-1' },
  { seed: 7, name: 'Tennessee', abbreviation: 'TENN', color: '#F77F00', record: '10-2' },
  { seed: 8, name: 'Indiana', abbreviation: 'IND', color: '#7D110C', record: '11-1' },
  { seed: 9, name: 'Boise State', abbreviation: 'BSU', color: '#1A4D8C', record: '12-1' },
  { seed: 10, name: 'SMU', abbreviation: 'SMU', color: '#CC0033', record: '11-2' },
  { seed: 11, name: 'Alabama', abbreviation: 'BAMA', color: '#9E1B32', record: '9-3' },
  { seed: 12, name: 'Clemson', abbreviation: 'CLEM', color: '#F66733', record: '10-3' },
];

const ROUND_NAMES = ['First Round', 'Quarterfinals', 'Semifinals', 'Championship', 'Champion'];

// ---------- Bracket construction ----------

function buildInitialBracket(teams: Team[]): Matchup[][] {
  // Sort by seed
  const sorted = [...teams].sort((a, b) => a.seed - b.seed);
  const seeds1to4 = sorted.filter((t) => t.seed <= 4);
  const seeds5to12 = sorted.filter((t) => t.seed >= 5);

  // First round: 5v12, 8v9, 7v10, 6v11
  // Standard CFP seeding: higher seed hosts
  const firstRound: Matchup[] = [
    mkMatchup('r1g1', 0, seeds5to12.find((t) => t.seed === 5)!, seeds5to12.find((t) => t.seed === 12)!),
    mkMatchup('r1g2', 0, seeds5to12.find((t) => t.seed === 8)!, seeds5to12.find((t) => t.seed === 9)!),
    mkMatchup('r1g3', 0, seeds5to12.find((t) => t.seed === 7)!, seeds5to12.find((t) => t.seed === 10)!),
    mkMatchup('r1g4', 0, seeds5to12.find((t) => t.seed === 6)!, seeds5to12.find((t) => t.seed === 11)!),
  ];

  // Quarterfinals: seeds 1-4 get byes, paired with first-round winners
  // QF1: Seed 1 vs winner(5/12), QF2: Seed 4 vs winner(8/9)
  // QF3: Seed 3 vs winner(7/10), QF4: Seed 2 vs winner(6/11)
  const quarterfinals: Matchup[] = [
    mkByeMatchup('r2g1', 1, seeds1to4.find((t) => t.seed === 1)!, 0),
    mkByeMatchup('r2g2', 1, seeds1to4.find((t) => t.seed === 4)!, 1),
    mkByeMatchup('r2g3', 1, seeds1to4.find((t) => t.seed === 3)!, 2),
    mkByeMatchup('r2g4', 1, seeds1to4.find((t) => t.seed === 2)!, 3),
  ];

  // Semifinals: QF1 vs QF2, QF3 vs QF4
  const semifinals: Matchup[] = [
    mkEmptyMatchup('r3g1', 2, 0, 1),
    mkEmptyMatchup('r3g2', 2, 2, 3),
  ];

  // Championship: SF1 vs SF2
  const championship: Matchup[] = [mkEmptyMatchup('r4g1', 3, 0, 1)];

  return [firstRound, quarterfinals, semifinals, championship];
}

function mkMatchup(id: string, round: number, a: Team, b: Team): Matchup {
  return {
    id,
    round,
    slots: [{ team: a, sourceGameIdx: undefined }, { team: b, sourceGameIdx: undefined }],
    winner: null,
  };
}

function mkByeMatchup(id: string, round: number, byeTeam: Team, sourceGameIdx: number): Matchup {
  return {
    id,
    round,
    slots: [{ team: byeTeam, sourceGameIdx: undefined }, { team: null, sourceGameIdx }],
    winner: null,
  };
}

function mkEmptyMatchup(id: string, round: number, src1: number, src2: number): Matchup {
  return {
    id,
    round,
    slots: [{ team: null, sourceGameIdx: src1 }, { team: null, sourceGameIdx: src2 }],
    winner: null,
  };
}

// ---------- Component ----------

interface CFPBracketProps {
  teams?: Team[];
}

export default function CFPBracket({ teams = DEFAULT_TEAMS }: CFPBracketProps) {
  const [rounds, setRounds] = useState<Matchup[][]>(() => buildInitialBracket(teams));
  const [shareText, setShareText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const champion = rounds[3][0].winner;

  const advanceTeam = useCallback(
    (gameId: string, team: Team) => {
      setRounds((prev) => {
        const next = prev.map((r) => r.map((g) => ({ ...g, slots: [...g.slots] as [Slot, Slot], winner: g.winner })));

        // Set winner on clicked game
        const game = findGame(next, gameId);
        if (!game) return prev;
        game.winner = team;

        // Propagate to downstream rounds
        propagate(next, game);

        return next;
      });
      setAnimKey((k) => k + 1);
    },
    []
  );

  const resetBracket = useCallback(() => {
    setRounds(buildInitialBracket(teams));
    setShareText(null);
    setCopied(false);
  }, [teams]);

  const generateShareText = useCallback(() => {
    const lines: string[] = ['🏆 COLLEGE FOOTBALL PLAYOFF — MY PICKS 🏆', ''];

    const roundLabels = ['First Round', 'Quarterfinals', 'Semifinals', 'Championship'];
    rounds.slice(0, 4).forEach((games, rIdx) => {
      lines.push(`▶ ${roundLabels[rIdx]}`);
      games.forEach((g) => {
        const [s1, s2] = g.slots;
        const t1 = s1.team ? `#${s1.team.seed} ${s1.team.name}` : 'TBD';
        const t2 = s2.team ? `#${s2.team.seed} ${s2.team.name}` : 'TBD';
        const w = g.winner ? `  → Winner: #${g.winner.seed} ${g.winner.name}` : '';
        lines.push(`  ${t1} vs ${t2}${w}`);
      });
      lines.push('');
    });

    if (champion) {
      lines.push(`👑 NATIONAL CHAMPION: #${champion.seed} ${champion.name} (${champion.record})`);
    } else {
      lines.push('👑 National Champion: TBD');
    }

    setShareText(lines.join('\n'));
    setCopied(false);
  }, [rounds, champion]);

  const copyShareText = useCallback(async () => {
    if (!shareText) return;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [shareText]);

  const allPicksMade = useMemo(() => rounds.slice(0, 4).every((r) => r.every((g) => g.winner !== null)), [rounds]);

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: '#0A0F1A' }}>
      {/* Header */}
      <header className="border-b border-white/5 bg-gradient-to-r from-[#0A0F1A] via-[#0D1424] to-[#0A0F1A]">
        <div className="mx-auto max-w-[1920px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#F5B942] to-[#d49a2e] shadow-lg shadow-[#F5B942]/20">
                <Trophy className="h-6 w-6 text-[#0A0F1A]" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="font-condensed text-2xl font-bold uppercase tracking-wide text-white sm:text-3xl">
                  College Football Playoff
                </h1>
                <p className="text-xs font-medium tracking-wider text-[#22D3EE]/80 sm:text-sm">
                  12-TEAM BRACKET • INTERACTIVE PREDICTOR
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={resetBracket}
                className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/70 transition-all hover:border-[#22D3EE]/40 hover:bg-[#22D3EE]/10 hover:text-[#22D3EE] sm:px-4"
              >
                <RotateCcw className="h-4 w-4 transition-transform group-hover:rotate-[-180deg] duration-300" />
                <span className="hidden sm:inline">Reset Bracket</span>
                <span className="sm:hidden">Reset</span>
              </button>
              <button
                type="button"
                onClick={generateShareText}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#F5B942] to-[#e0a836] px-3 py-2 text-sm font-bold text-[#0A0F1A] shadow-lg shadow-[#F5B942]/20 transition-all hover:shadow-[#F5B942]/40 hover:brightness-110 sm:px-4"
              >
                <Share2 className="h-4 w-4" />
                <span>Share Picks</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Bracket */}
      <main className="mx-auto max-w-[1920px] px-3 py-6 sm:px-4 sm:py-8 lg:px-8">
        <div className="cfp-scroll overflow-x-auto pb-4 lg:overflow-x-visible">
          <div className="flex min-w-[1100px] gap-6 lg:min-w-0 lg:gap-0">
            {/* Render rounds */}
            {rounds.map((games, roundIdx) => (
              <RoundColumn
                key={roundIdx}
                roundIdx={roundIdx}
                games={games}
                allRounds={rounds}
                onAdvance={advanceTeam}
                animKey={animKey}
              />
            ))}

            {/* Champion column */}
            <ChampionColumn champion={champion} animKey={animKey} allPicksMade={allPicksMade} />
          </div>
        </div>

        {/* Mobile hint */}
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/30 lg:hidden">
          <span>← Swipe horizontally to view all rounds →</span>
        </div>
      </main>

      {/* Share modal */}
      {shareText && (
        <ShareModal text={shareText} copied={copied} onCopy={copyShareText} onClose={() => setShareText(null)} />
      )}
    </div>
  );
}

// ---------- Sub-components ----------

function RoundColumn({
  roundIdx,
  games,
  allRounds,
  onAdvance,
  animKey,
}: {
  roundIdx: number;
  games: Matchup[];
  allRounds: Matchup[][];
  onAdvance: (gameId: string, team: Team) => void;
  animKey: number;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-stretch lg:px-4"
      style={{
        gap: roundIdx === 0 ? '12px' : roundIdx === 1 ? '12px' : roundIdx === 2 ? '24px' : '48px',
      }}
    >
      {/* Round label */}
      <div className="mb-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#F5B942]/30 to-[#F5B942]/40" />
        <span className="font-condensed whitespace-nowrap text-xs font-semibold uppercase tracking-[0.15em] text-[#F5B942] sm:text-sm">
          {ROUND_NAMES[roundIdx]}
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#F5B942]/30 to-[#F5B942]/40" />
      </div>

      {/* Matchup cards with vertical distribution */}
      <div className="flex flex-1 flex-col justify-around" style={{ gap: '8px' }}>
        {games.map((game, gIdx) => (
          <div
            key={game.id}
            className="relative flex flex-1 items-center"
            style={{ minHeight: roundIdx === 3 ? 'auto' : '110px' }}
          >
            {/* Connecting lines to previous round (desktop) */}
            {roundIdx > 0 && (
              <ConnectingLines
                roundIdx={roundIdx}
                gameIdx={gIdx}
                totalGames={games.length}
                prevTotalGames={allRounds[roundIdx - 1].length}
              />
            )}

            <MatchupCard game={game} onAdvance={onAdvance} animKey={animKey} isChampionship={roundIdx === 3} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchupCard({
  game,
  onAdvance,
  animKey,
  isChampionship,
}: {
  game: Matchup;
  onAdvance: (gameId: string, team: Team) => void;
  animKey: number;
  isChampionship?: boolean;
}) {
  return (
    <div
      className={`group relative w-full overflow-hidden rounded-xl border bg-gradient-to-b from-white/[0.06] to-white/[0.02] transition-all duration-300 ${
        isChampionship
          ? 'border-[#F5B942]/30 shadow-lg shadow-[#F5B942]/10'
          : 'border-white/10 hover:border-white/20'
      }`}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {isChampionship && (
        <div className="flex items-center justify-center gap-2 border-b border-[#F5B942]/20 bg-[#F5B942]/5 py-1.5">
          <Trophy className="h-3.5 w-3.5 text-[#F5B942]" />
          <span className="font-condensed text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F5B942]">
            National Championship
          </span>
          <Trophy className="h-3.5 w-3.5 text-[#F5B942]" />
        </div>
      )}
      {game.slots.map((slot, sIdx) => {
        const team = slot.team;
        const isWinner = game.winner && team && game.winner.seed === team.seed;
        const canClick = team !== null;
        const isLoser = game.winner && team && game.winner.seed !== team.seed;

        return (
          <button
            type="button"
            key={sIdx}
            disabled={!canClick}
            className={`relative flex w-full items-center gap-2.5 bg-transparent px-3 py-2.5 text-left transition-all duration-200 ${
              sIdx === 0 ? 'border-b border-white/5' : ''
            } ${canClick ? 'cursor-pointer hover:bg-white/[0.04]' : 'opacity-50'}`}
            onClick={() => team && onAdvance(game.id, team)}
          >
            {/* Seed number */}
            <div
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold transition-colors ${
                isWinner
                  ? 'bg-[#F5B942] text-[#0A0F1A]'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {team ? team.seed : '-'}
            </div>

            {/* Logo placeholder */}
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md transition-transform group-hover:scale-105"
              style={{
                backgroundColor: team ? team.color : '#1a2132',
                boxShadow: team ? `0 2px 8px ${team.color}40` : 'none',
              }}
            >
              {team ? team.abbreviation : '?'}
            </div>

            {/* Team name + record */}
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span
                className={`font-condensed truncate text-sm font-semibold uppercase tracking-wide transition-colors ${
                  isWinner ? 'text-white' : 'text-white/70'
                }`}
              >
                {team ? team.name : 'TBD'}
              </span>
              {team && (
                <span className="flex-shrink-0 text-[10px] font-medium text-white/30">
                  {team.record}
                </span>
              )}
            </div>

            {/* Winner check */}
            {isWinner && (
              <div
                key={animKey}
                className="animate-advance-in flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#F5B942]/20"
              >
                <Check className="h-3 w-3 text-[#F5B942]" strokeWidth={3} />
              </div>
            )}

            {/* Loser dim overlay */}
            {isLoser && <div className="absolute inset-0 bg-[#0A0F1A]/30" />}

            {/* Hover gold glow border */}
            {canClick && !isWinner && (
              <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent transition-all duration-200 hover:border-[#F5B942]/40 hover:shadow-[0_0_12px_rgba(245,185,66,0.15)]" />
            )}
          </button>
        );
      })}

      {/* TBD empty state for both slots null */}
      {!game.slots[0].team && !game.slots[1].team && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/20">Awaiting teams</span>
        </div>
      )}
    </div>
  );
}

function ChampionColumn({
  champion,
  animKey,
  allPicksMade,
}: {
  champion: Team | null;
  animKey: number;
  allPicksMade: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-stretch lg:px-4" style={{ maxWidth: '280px' }}>
      <div className="mb-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#F5B942]/50" />
        <span className="font-condensed whitespace-nowrap text-xs font-semibold uppercase tracking-[0.15em] text-[#F5B942] sm:text-sm">
          Champion
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#F5B942]/50" />
      </div>

      <div className="flex flex-1 items-center">
        <div
          className={`relative w-full overflow-hidden rounded-2xl p-[2px] transition-all duration-500 ${
            champion
              ? 'bg-gradient-to-br from-[#F5B942] via-[#FFD700] to-[#d49a2e] shadow-2xl shadow-[#F5B942]/30'
              : 'bg-gradient-to-br from-white/10 to-white/5'
          }`}
          style={{ minHeight: '160px' }}
        >
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl bg-[#0A0F1A] px-6 py-6">
            {champion ? (
              <div key={animKey} className="animate-advance-in flex flex-col items-center gap-3">
                {/* Large trophy */}
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-[#F5B942]/20 blur-xl" />
                  <Trophy className="relative h-12 w-12 text-[#F5B942] drop-shadow-[0_0_8px_rgba(245,185,66,0.5)]" strokeWidth={1.8} />
                </div>

                <span className="font-condensed text-[10px] font-semibold uppercase tracking-[0.25em] text-[#F5B942]/80">
                  National Champions
                </span>

                {/* Team display */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold text-white shadow-xl"
                    style={{
                      backgroundColor: champion.color,
                      boxShadow: `0 4px 20px ${champion.color}60, 0 0 0 3px rgba(245,185,66,0.3)`,
                    }}
                  >
                    {champion.abbreviation}
                  </div>
                  <span className="font-condensed text-xl font-bold uppercase tracking-wide text-white">
                    {champion.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#F5B942]/15 px-2 py-0.5 text-[10px] font-bold text-[#F5B942]">
                      #{champion.seed} SEED
                    </span>
                    <span className="text-[10px] font-medium text-white/40">{champion.record}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 opacity-60">
                <Trophy className="h-10 w-10 text-white/20" strokeWidth={1.5} />
                <span className="font-condensed text-xs font-medium uppercase tracking-[0.2em] text-white/30">
                  {allPicksMade ? 'Select Champion' : 'Complete bracket'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectingLines({
  roundIdx,
  gameIdx,
  totalGames,
  prevTotalGames,
}: {
  roundIdx: number;
  gameIdx: number;
  totalGames: number;
  prevTotalGames: number;
}) {
  // For each game in this round, it draws from either:
  // - a single bye team (no line needed, team already placed) 
  // - two source games from previous round
  // We draw a simple horizontal connector to the left edge of the card.
  // Complex bracket lines would need precise coordinates; we use pseudo-element approach.

  // Calculate vertical centering offsets for visual bracket lines
  // Each round doubles the spacing, so we approximate connector positions
  const cardHeight = 110;
  const baseGap = 8;
  
  // Calculate the vertical offset to the source games
  const prevGameSpacing = cardHeight + baseGap;
  const currentGameSpacing = (prevGameSpacing * prevTotalGames) / totalGames;

  // For quarterfinals, some games have a bye (source is just the bye team, no line needed)
  // and one slot comes from a first-round game
  if (roundIdx === 1) {
    // QF games: bye team on top, winner from R1 on bottom
    // Only draw a line to the first-round game
    return (
      <>
        <div
          className="bracket-line-h"
          style={{
            left: '-24px',
            top: '75%',
            width: '24px',
          }}
        />
        <div
          className="bracket-line-v"
          style={{
            left: '-24px',
            top: `calc(75% - ${gameIdx % 2 === 0 ? prevGameSpacing / 2 : 0}px)`,
            height: `${prevGameSpacing / 2}px`,
          }}
        />
      </>
    );
  }

  // For semifinals and championship, draw bracket connectors
  if (roundIdx === 2) {
    // Each SF connects to 2 QF games
    const offset = gameIdx === 0 ? -prevGameSpacing / 2 : prevGameSpacing / 2;
    return (
      <>
        <div
          className="bracket-line-h"
          style={{
            left: '-24px',
            top: '50%',
            width: '12px',
            transform: 'translateY(-50%)',
          }}
        />
        <div
          className="bracket-line-v"
          style={{
            left: '-12px',
            top: gameIdx === 0 ? `calc(50% - ${prevGameSpacing / 2}px)` : '50%',
            height: `${prevGameSpacing / 2}px`,
          }}
        />
        <div
          className="bracket-line-h"
          style={{
            left: '-24px',
            top: gameIdx === 0 ? `calc(50% - ${prevGameSpacing / 2}px)` : `calc(50% + ${prevGameSpacing / 2}px)`,
            width: '12px',
          }}
        />
      </>
    );
  }

  if (roundIdx === 3) {
    // Championship connects to both SFs
    const sfSpacing = prevGameSpacing * 2;
    return (
      <>
        <div
          className="bracket-line-h"
          style={{
            left: '-24px',
            top: '50%',
            width: '12px',
            transform: 'translateY(-50%)',
          }}
        />
        <div
          className="bracket-line-v"
          style={{
            left: '-12px',
            top: `calc(50% - ${sfSpacing / 2}px)`,
            height: `${sfSpacing}px`,
          }}
        />
        <div
          className="bracket-line-h"
          style={{
            left: '-24px',
            top: `calc(50% - ${sfSpacing / 2}px)`,
            width: '12px',
          }}
        />
        <div
          className="bracket-line-h"
          style={{
            left: '-24px',
            top: `calc(50% + ${sfSpacing / 2}px)`,
            width: '12px',
          }}
        />
      </>
    );
  }

  return null;
}

function ShareModal({
  text,
  copied,
  onCopy,
  onClose,
}: {
  text: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="animate-fade-up fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[#F5B942]/20 bg-[#0D1424] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <Dialog.Title className="font-condensed text-lg font-semibold uppercase tracking-wide text-[#F5B942]">
              Share Your Picks
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Copy a text summary of your playoff bracket picks.
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close share dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
        </div>

        <div className="p-5">
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-[#0A0F1A] p-4 text-xs leading-relaxed text-white/80">
            {text}
          </pre>

          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/60 transition-all hover:border-white/20 hover:text-white"
              >
                Close
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={onCopy}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#F5B942] to-[#e0a836] px-4 py-2 text-sm font-bold text-[#0A0F1A] transition-all hover:brightness-110"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied!
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" /> Copy to clipboard
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------- Helpers ----------

function findGame(rounds: Matchup[][], gameId: string): Matchup | null {
  for (const round of rounds) {
    const g = round.find((m) => m.id === gameId);
    if (g) return g;
  }
  return null;
}

function propagate(rounds: Matchup[][], changedGame: Matchup): void {
  const round = changedGame.round;

  // Find which game in the next round depends on this game
  if (round >= 3) return; // championship has no next round

  for (const nextGame of rounds[round + 1]) {
    for (let i = 0; i < 2; i++) {
      if (nextGame.slots[i].sourceGameIdx !== undefined) {
        // Check if this slot is fed by the changed game
        // For round 0 -> round 1: sourceGameIdx refers to first-round game index
        // For round 1 -> round 2: sourceGameIdx refers to quarterfinal game index
        // For round 2 -> round 3: sourceGameIdx refers to semifinal game index
        const sourceIdx = nextGame.slots[i].sourceGameIdx;
        const sourceGames = rounds[round];
        if (sourceIdx !== undefined && sourceIdx < sourceGames.length) {
          const sourceGame = sourceGames[sourceIdx];
          if (sourceGame.id === changedGame.id) {
            // If the changed game's winner changed, update the slot
            // But only if the new winner differs from what's already there
            nextGame.slots[i].team = changedGame.winner;

            // If this team was previously set as winner of the next game, clear it
            if (nextGame.winner && (!changedGame.winner || nextGame.winner.seed !== changedGame.winner.seed)) {
              nextGame.winner = null;
              // Recursively propagate the clearing
              propagate(rounds, nextGame);
            } else if (nextGame.winner && changedGame.winner && nextGame.winner.seed === changedGame.winner.seed) {
              // The winner of nextGame is the same team but might now be in a different slot
              // Check if winner is still one of the slots
              const stillInSlot = nextGame.slots.some(
                (s) => s.team && nextGame.winner && s.team.seed === nextGame.winner.seed
              );
              if (!stillInSlot) {
                nextGame.winner = null;
                propagate(rounds, nextGame);
              }
            }
          }
        }
      }
    }
  }
}
