# language: pt
Funcionalidade: Sessão de jogo
  Como jogador da Arena 60
  Quero que vidas, moedas e tempo sejam controlados
  Para saber se venci e qual foi minha pontuação

  Cenário: Iniciar uma nova sessão
    Dado que iniciei uma nova sessão
    Então devo possuir 3 vidas
    E devo possuir 0 pontos
    E devem restar 60 segundos

  Cenário: Perder uma vida ao colidir com um inimigo
    Dado que iniciei uma nova sessão
    Quando eu colidir com um inimigo
    Então devo possuir 2 vidas

  Cenário: Perder o jogo após três colisões
    Dado que iniciei uma nova sessão
    Quando eu colidir 3 vezes com inimigos
    Então a sessão deve estar perdida

  Cenário: Ganhar pontos coletando moedas
    Dado que iniciei uma nova sessão
    Quando eu coletar 4 moedas
    Então devo possuir 4 pontos

  Cenário: Vencer depois de sobreviver por sessenta segundos
    Dado que iniciei uma nova sessão
    Quando passarem 60 segundos
    Então a sessão deve estar vencida

  Cenário: Reiniciar todos os valores da sessão
    Dado que iniciei uma nova sessão
    E que perdi uma vida e coletei uma moeda
    Quando eu reiniciar a sessão
    Então devo possuir 3 vidas
    E devo possuir 0 pontos
    E devem restar 60 segundos
