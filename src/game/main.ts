import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';

export const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1280,
    height: 960,
    parent: 'game-container',
    backgroundColor: '#1a1a1a',
    scene: [MainScene],
    dom: {
        createContainer: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0, x: 0 },
            debug: false
        }
    }
};

export const createGame = () => {
    return new Phaser.Game(config);
};
