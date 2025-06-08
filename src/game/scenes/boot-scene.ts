import Phaser from 'phaser';
import { EventBus } from '../event-bus';
import { getAssetPath } from '@/asset-paths';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload(): void {
        // Загрузка конфигурации анимаций
        // this.load.json('animations_json', 'assets/data/animations.json');
        this.load.json('animations_json', getAssetPath('assets/data/animations.json'));
        
        this.createProgressBar();
    }

    create(): void {
        
        EventBus.emit('current-scene-ready', this);
        // Переход к сцене загрузки
        this.scene.start('PreloadScene');
    }

    private createProgressBar(): void {
        const { width, height } = this.cameras.main;
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 4, height / 2 - 30, width / 2, 50);
        
        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(
                width / 4 + 10,
                height / 2 - 20,
                (width / 2 - 20) * value,
                30
            );
        });
    }

}
