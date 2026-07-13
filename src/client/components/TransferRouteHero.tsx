import { Fragment } from 'react';
import type { Club } from '../../shared/types';
import { cn } from '../utils';

function getClubInitials(name: string): string {
  if (!name) return '?';
  const words = name.replace(/FC|CF|AC|AS|SS|SC|RC|CD|UD|SD|SL|BSC|TSG|RB/gi, '').trim().split(/\s+/);
  if (words.length === 1) return (words[0] ?? '').slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join('').slice(0, 3).toUpperCase();
}

function CrestSlot({
  club,
  hidden,
  animate,
  shake,
  flash,
}: {
  club: Club | null;
  hidden: boolean;
  animate?: boolean;
  shake?: boolean;
  flash?: 'success' | 'error' | null;
}) {
  if (hidden) {
    return (
      <div className="crest-slot-wrap">
        <div
          className={cn(
            'crest-slot crest-slot-hidden crest-slot-mystery',
            shake && 'crest-slot-shake',
            flash === 'error' && 'crest-slot-error'
          )}
        >
          <span className="text-2xl font-bold text-white/25">?</span>
        </div>
        <span className="crest-label crest-label-hidden">???</span>
      </div>
    );
  }

  const primary = club?.primaryColor ?? '#333333';
  const secondary = club?.secondaryColor ?? '#111111';

  return (
    <div className="crest-slot-wrap">
      <div
        className={cn(
          'crest-slot crest-slot-revealed',
          animate && 'crest-slot-flip',
          flash === 'success' && 'crest-slot-success'
        )}
        style={{ borderColor: `${secondary}99` }}
      >
        <div
          className="crest-slot-bg"
          style={{
            background: `linear-gradient(145deg, ${primary} 0%, ${secondary} 100%)`,
          }}
        />
        <div className="crest-slot-glow" />
        <span className="crest-slot-initials">{getClubInitials(club?.name ?? '')}</span>
      </div>
      <span className="crest-label" title={club?.name ?? ''}>
        {club?.name ?? '???'}
      </span>
    </div>
  );
}

function RouteConnector({ active }: { active?: boolean }) {
  return (
    <div className={cn('route-connector', active && 'route-connector-active')}>
      <div className="route-connector-line" />
      <div className="route-connector-arrow" />
    </div>
  );
}

export function TransferRouteHero({
  clubs,
  animateIndex,
  shakeIndex,
  flashIndex,
  flashType,
  scorePopup,
}: {
  clubs: { index: number; club: Club | null; revealed: boolean }[];
  animateIndex: number | null;
  shakeIndex?: number | null;
  flashIndex?: number | null;
  flashType?: 'success' | 'error' | null;
  scorePopup?: { value: number; index: number } | null;
}) {
  return (
    <div className="route-hero">
      <div className="route-hero-scroll">
        <div className="route-hero-inner">
          <div className="route-track">
          {clubs.map((item, i) => {
            const nextRevealed = i < clubs.length - 1 ? (clubs[i + 1]?.revealed ?? false) : false;
            const connectorActive = item.revealed && nextRevealed;

            return (
              <Fragment key={item.index}>
                <div className="relative">
                  <CrestSlot
                    club={item.club}
                    hidden={!item.revealed}
                    animate={animateIndex === item.index}
                    shake={shakeIndex === item.index}
                    flash={flashIndex === item.index ? flashType ?? null : null}
                  />
                  {scorePopup && scorePopup.index === item.index && (
                    <span className="score-popup">+{scorePopup.value}</span>
                  )}
                </div>
                {i < clubs.length - 1 && <RouteConnector active={connectorActive} />}
              </Fragment>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
