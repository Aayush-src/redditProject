import { afterEach, describe, expect, it, vi } from 'vitest';

let requestExpandedModeMock: ReturnType<typeof vi.fn>;

vi.mock('@devvit/web/client', () => {
  requestExpandedModeMock = vi.fn();

  return {
    context: {
      username: 'test-user',
    },
    requestExpandedMode: requestExpandedModeMock,
  };
});

afterEach(() => {
  requestExpandedModeMock?.mockReset();
});

describe('Splash', () => {
  it('clicking Play Now calls requestExpandedMode with game entrypoint', async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import('./splash');
    await new Promise((r) => setTimeout(r, 0));

    const playButton = Array.from(document.querySelectorAll('button')).find(
      (b) => /play now/i.test(b.textContent ?? '')
    );
    expect(playButton).toBeTruthy();

    playButton!.click();

    expect(requestExpandedModeMock).toHaveBeenCalledTimes(1);
    expect(requestExpandedModeMock).toHaveBeenCalledWith(
      expect.any(Event),
      'game'
    );
  });
});
