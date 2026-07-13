import { WAGER_OPTIONS } from '../../shared/scoring';
import { cn } from '../utils';

export function WagerChips({
  selected,
  locked,
  onSelect,
  disabled,
}: {
  selected: number;
  locked: boolean;
  onSelect: (wager: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="wager-tray">
      <div className="wager-tray-header">
        <span className="wager-tray-title">Wager</span>
        {locked ? (
          <span className="wager-tray-locked">🔒 Locked</span>
        ) : (
          <span className="wager-tray-hint">Pick before first guess</span>
        )}
      </div>
      <div className="wager-chips">
        {WAGER_OPTIONS.map((wager) => {
          const active = selected === wager;
          return (
            <button
              key={wager}
              className={cn(
                'wager-chip',
                active && 'wager-chip-active',
                (locked || disabled) && !active && 'wager-chip-disabled'
              )}
              onClick={() => onSelect(wager)}
              disabled={locked || disabled}
            >
              <span className="wager-chip-ring" />
              <span className="wager-chip-value">×{wager}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
