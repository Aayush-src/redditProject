import { cn } from '../utils';

export function PlayerCard({
  name = '???',
  flag,
  country,
  mystery = false,
  rating,
}: {
  name?: string;
  flag?: string | null;
  country?: string | null;
  mystery?: boolean;
  rating?: number;
}) {
  const displayRating = rating ?? (mystery ? '??' : 88);
  const displayFlag = flag ?? '⚽';

  return (
    <div className={cn('player-card', mystery && 'player-card-mystery')}>
      <div className="player-card-inner">
        <div className="player-card-top">
          <span className="player-card-rating">{displayRating}</span>
          <span className="player-card-pos">ST</span>
        </div>
        <div className="player-card-body">
          <div className="player-card-silhouette">
            {mystery ? (
              <span className="text-3xl font-bold text-white/30">?</span>
            ) : (
              <span className="player-card-flag">{displayFlag}</span>
            )}
          </div>
          <h3 className="player-card-name">{mystery ? '???' : name}</h3>
          {!mystery && country && (
            <span className="player-card-nation">{country}</span>
          )}
        </div>
        <div className="player-card-footer">
          <span className="player-card-tier">{mystery ? 'CLASSIFIED' : 'LEGEND'}</span>
        </div>
      </div>
    </div>
  );
}
