import { describe, expect, it } from 'vitest';
import { createInviteUrl, getMatchResult, getRoomIdFromUrl } from '../src/multiplayer.ts';

describe('regras do multiplayer', () => {
  it('define o vencedor pela maior pontuação', () => {
    expect(getMatchResult(5, 3)).toBe('win');
    expect(getMatchResult(2, 4)).toBe('loss');
    expect(getMatchResult(4, 4)).toBe('draw');
  });

  it('cria e lê o link de convite', () => {
    const roomId = 'arena60-sala-de-teste';
    const invite = createInviteUrl(new URL('https://exemplo.com/arena-60/?antigo=1#menu'), roomId);

    expect(invite).toBe('https://exemplo.com/arena-60/?room=arena60-sala-de-teste');
    expect(getRoomIdFromUrl(new URL(invite))).toBe(roomId);
  });

  it('ignora identificadores que não pertencem ao Arena 60', () => {
    expect(getRoomIdFromUrl(new URL('https://exemplo.com/?room=outra-sala'))).toBeNull();
  });
});
