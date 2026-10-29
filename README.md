# Arena 60

Jogo de arena 2D para navegador, desenvolvido com TypeScript, Phaser e Vite. O projeto combina partidas curtas com testes de regras, cenários BDD e testes de interface.

## Modos de jogo

- **Solo:** sobreviver durante 60 segundos, desviando dos inimigos e coletando moedas.
- **Multiplayer:** dois jogadores participam simultaneamente de um duelo de 60 segundos; vence quem coletar mais moedas.

## Tecnologias

| Área                    | Ferramentas                   |
| ----------------------- | ----------------------------- |
| Jogo                    | TypeScript e Phaser           |
| Desenvolvimento e build | Vite                          |
| Comunicação multiplayer | PeerJS e WebRTC               |
| Testes de regras        | Vitest                        |
| Cenários BDD            | Cucumber                      |
| Testes de interface     | Playwright                    |
| Integração e publicação | GitHub Actions e GitHub Pages |

## Executar localmente

Use Node.js e npm. O workflow do repositório utiliza Node.js 24.

```bash
git clone https://github.com/diogoposs/arena-60.git
cd arena-60
npm ci
npm run dev
```

Abra o endereço informado pelo Vite no terminal.

## Multiplayer

1. No menu, selecione **Criar sala**.
2. Use **Copiar convite** e envie o link ao segundo jogador.
3. Aguarde **Adversário conectado**.
4. O anfitrião seleciona **Iniciar duelo**.

Os dois jogadores usam as setas para mover seus personagens. O placar do adversário aparece durante a partida.

O serviço público do PeerJS faz a sinalização inicial; a conexão da partida utiliza WebRTC. Redes corporativas, VPNs e restrições de rede podem impedir a conexão.

## Testes

Instale o navegador antes dos testes de interface:

```bash
npx playwright install chromium
```

| Comando                   | Finalidade                                                  |
| ------------------------- | ----------------------------------------------------------- |
| `npm test`                | Testes de regras com Vitest                                 |
| `npm run test:bdd`        | Cenários Cucumber                                           |
| `npm run test:bdd:report` | Cenários e relatório HTML em `reports/cucumber-report.html` |
| `npm run test:e2e`        | Testes no navegador                                         |
| `npm run test:e2e:report` | Abrir o relatório do Playwright                             |
| `npm run test:all`        | Executar as três suítes                                     |

Os arquivos estão em [tests](tests), com regras em testes unitários, especificações Gherkin em [tests/features](tests/features) e jornadas de navegador em [tests/e2e](tests/e2e).

## Build e publicação

```bash
npm run build
npm run preview
```

O build é gerado em `dist/`. O [workflow de publicação](.github/workflows/deploy-pages.yml) instala dependências, executa as suítes, compila o jogo e solicita a publicação no GitHub Pages.

## Escopo

Protótipo pessoal com foco em partidas curtas, regras testáveis e experimentação de multiplayer no navegador. A existência do workflow não comprova o resultado da execução mais recente; consulte a aba [Actions](https://github.com/diogoposs/arena-60/actions) para verificar os checks.
