import Phaser from 'phaser';
import { GameScene } from './GameScene.ts';
import './style.css';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: 'game',
  backgroundColor: '#ff1e00',
  scene: GameScene,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
