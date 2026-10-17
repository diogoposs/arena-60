# Arena 60

Jogo de arena 2D feito com TypeScript, Phaser e Vite. No modo multiplayer, um jogador cria uma sala e envia o link de convite; os dois jogam simultaneamente por 60 segundos e vence quem coletar mais moedas.

## Multiplayer

1. Abra o menu e clique em **Criar sala**.
2. Clique em **Copiar convite** e envie o link ao segundo jogador.
3. Quando aparecer **Adversário conectado**, o anfitrião clica em **Iniciar duelo**.
4. Cada jogador controla seu personagem com as setas. O placar do adversário aparece no HUD.

A conexão usa WebRTC por meio do PeerJS. O serviço público do PeerJS faz a apresentação inicial entre os navegadores; os estados da partida seguem diretamente entre os jogadores. Algumas redes corporativas ou VPNs podem bloquear conexões WebRTC.

Jogo de arena 2D para navegador criado com TypeScript, Phaser e Vite. O objetivo é sobreviver por 60 segundos, desviando dos inimigos e coletando moedas.

## Executar localmente

```bash
npm install
npm run dev
```

## Testes

```bash
npm run test
npm run test:bdd
npm run test:e2e
npm run test:all
```

## Build

```bash
npm run build
```
