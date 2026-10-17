import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { Difficulty } from './gameRules.ts';

export type MultiplayerRole = 'host' | 'guest';
export type PlayerState = Readonly<{
  score: number;
  lives: number;
  remainingSeconds: number;
  finished: boolean;
}>;

type MultiplayerMessage =
  | { type: 'start'; difficulty: Difficulty }
  | { type: 'state'; state: PlayerState };

type MultiplayerCallbacks = Readonly<{
  onConnected: (role: MultiplayerRole) => void;
  onDisconnected: () => void;
  onStart: (difficulty: Difficulty) => void;
  onState: (state: PlayerState) => void;
  onError: (message: string) => void;
}>;

/**
 * Cuida somente da comunicação entre navegadores.
 * Assim como um client do REST Assured, esta classe não conhece Phaser nem a tela.
 */
export class MultiplayerClient {
  private peer?: Peer;
  private connection?: DataConnection;
  private currentRole?: MultiplayerRole;

  constructor(private readonly callbacks: MultiplayerCallbacks) {}

  get role(): MultiplayerRole | undefined {
    return this.currentRole;
  }

  get connected(): boolean {
    return this.connection?.open === true;
  }

  createRoom(): Promise<string> {
    this.destroy();
    this.currentRole = 'host';
    const roomId = `arena60-${crypto.randomUUID()}`;

    return new Promise((resolve, reject) => {
      void import('peerjs').then(({ default: PeerConstructor }) => {
        this.peer = new PeerConstructor(roomId);
        this.peer.once('open', () => resolve(roomId));
        this.peer.once('error', (error) => {
          this.callbacks.onError(this.describeError(error));
          reject(error);
        });
        this.peer.on('connection', (connection) => {
          if (this.connection?.open) {
            connection.close();
            return;
          }
          this.attachConnection(connection);
        });
      }).catch(reject);
    });
  }

  async joinRoom(roomId: string): Promise<void> {
    this.destroy();
    this.currentRole = 'guest';
    const { default: PeerConstructor } = await import('peerjs');
    this.peer = new PeerConstructor();
    this.peer.on('open', () => {
      const connection = this.peer?.connect(roomId, { reliable: true });
      if (connection) {
        this.attachConnection(connection);
      }
    });
    this.peer.on('error', (error) => this.callbacks.onError(this.describeError(error)));
  }

  sendStart(difficulty: Difficulty): void {
    this.send({ type: 'start', difficulty });
  }

  sendState(state: PlayerState): void {
    this.send({ type: 'state', state });
  }

  destroy(): void {
    this.connection?.close();
    this.peer?.destroy();
    this.connection = undefined;
    this.peer = undefined;
    this.currentRole = undefined;
  }

  private attachConnection(connection: DataConnection): void {
    this.connection = connection;
    connection.on('open', () => this.callbacks.onConnected(this.currentRole!));
    connection.on('data', (data) => this.handleMessage(data));
    connection.on('close', () => this.callbacks.onDisconnected());
    connection.on('error', (error) => this.callbacks.onError(this.describeError(error)));
  }

  private handleMessage(data: unknown): void {
    if (!data || typeof data !== 'object' || !('type' in data)) {
      return;
    }

    const message = data as MultiplayerMessage;
    if (message.type === 'start') {
      this.callbacks.onStart(message.difficulty);
    } else if (message.type === 'state') {
      this.callbacks.onState(message.state);
    }
  }

  private send(message: MultiplayerMessage): void {
    if (this.connection?.open) {
      this.connection.send(message);
    }
  }

  private describeError(error: unknown): string {
    return error instanceof Error ? error.message : 'Não foi possível conectar à sala.';
  }
}

export function getRoomIdFromUrl(url: URL): string | null {
  const roomId = url.searchParams.get('room');
  return roomId?.startsWith('arena60-') ? roomId : null;
}

export function createInviteUrl(currentUrl: URL, roomId: string): string {
  const inviteUrl = new URL(currentUrl.href);
  inviteUrl.search = '';
  inviteUrl.hash = '';
  inviteUrl.searchParams.set('room', roomId);
  return inviteUrl.toString();
}

export function getMatchResult(localScore: number, opponentScore: number): 'win' | 'loss' | 'draw' {
  if (localScore === opponentScore) return 'draw';
  return localScore > opponentScore ? 'win' : 'loss';
}
