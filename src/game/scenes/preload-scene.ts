import Phaser from 'phaser';
import { EventBus } from '../event-bus';
import { getAssetPath } from '@/asset-paths';

interface AnimationData {
    key: string;
    assetKey: string;
    frames?: number[];
    frameRate: number;
    repeat: number;
}

export class PreloadScene extends Phaser.Scene {
    private loadingBar!: Phaser.GameObjects.Graphics;
    private progressBar!: Phaser.GameObjects.Graphics;

    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload(): void {
        this.createLoadingVisuals();
        
        // Загрузка основного пакета ассетов
        // this.load.pack('asset_pack', 'assets/data/assets.json');
        const baseURL = process.env.ASSET_PREFIX || '/';
        this.load.setBaseURL(baseURL);
        this.load.pack('asset_pack', getAssetPath('assets/data/assets.json'));
        
        // Обработчики прогресса
        this.load.on('progress', this.updateLoadingBar, this);
        this.load.on('complete', this.onLoadComplete, this);

    }

    create(): void {
        EventBus.emit('current-scene-ready', this);
        this.createAnimations();
    }

    private createLoadingVisuals(): void {
        const { width, height } = this.cameras.main;
        const loadingBarWidth = width * 0.6;
        
        this.loadingBar = this.add.graphics()
            .fillStyle(0x444444, 1)
            .fillRect(
                (width - loadingBarWidth) / 2,
                height / 2 - 20,
                loadingBarWidth,
                20
            );
            
        this.progressBar = this.add.graphics();
    }

    private updateLoadingBar = (value: number): void => {
        const { width, height } = this.cameras.main;
        const loadingBarWidth = width * 0.6;
        
        this.progressBar
            .clear()
            .fillStyle(0xffffff, 1)
            .fillRect(
                (width - loadingBarWidth) / 2,
                height / 2 - 20,
                loadingBarWidth * value,
                20
            );
    };

    private onLoadComplete = (): void => {
        this.loadingBar.destroy();
        this.progressBar.destroy();
        this.scene.start('MainMenu');
    };

    private createAnimations(): void {
        const data = this.cache.json.get('animations_json') as AnimationData[];
        
        data.forEach((animation: AnimationData) => {
            const frames = animation.frames
                ? this.anims.generateFrameNumbers(animation.assetKey, { frames: animation.frames })
                : this.anims.generateFrameNumbers(animation.assetKey);
            
            this.anims.create({
                key: animation.key,
                frames,
                frameRate: animation.frameRate,
                repeat: animation.repeat,
                yoyo: animation.repeat === -1 // Для бесконечных анимаций
            });
        });
    }
}
