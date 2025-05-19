import { EventBusComponent } from '../components/events/event-bus-component';
import Phaser from 'phaser';
import { CUSTOM_EVENTS } from '../types/custom-events';

// Конфигурация звуков
type SoundConfig = {
    volume: number;
    loop?: boolean;
    instances?: number; // Количество экземпляров для пула
    overlap?: boolean;
};

type AudioConfig = {
    bgMusic: Record<string, SoundConfig>;
    sfx: Record<string, SoundConfig>;
};

export class AudioManager {
    private scene: Phaser.Scene;
    private eventBus: EventBusComponent;
    private soundPools: Map<string, Phaser.Sound.BaseSound[]> = new Map();
    private currentMusic: Phaser.Sound.WebAudioSound | null = null;
    private config: AudioConfig;

    constructor(scene: Phaser.Scene, eventBus: EventBusComponent) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.config = this.getDefaultConfig();
        this.init();
    }

    private getDefaultConfig(): AudioConfig {
        return {
            bgMusic: {
                'bg': { volume: 0.1, loop: true },
            },
            sfx: {
                'explosion': { volume: 0.1, instances: 3, overlap: false },
                'hit': { volume: 0.1, instances: 1, overlap: false },
                'shot1': { volume: 0.05, instances: 3, overlap: true }
            }
        };
    }

    private init(): void {
        this.preloadSounds();
        this.setupEventListeners();
    }

    private preloadSounds(): void {
        // Предзагрузка музыки
        Object.keys(this.config.bgMusic).forEach(key => {
            this.scene.sound.add(key, this.config.bgMusic[key]);
        });

        // Создание пулов для SFX
        Object.entries(this.config.sfx).forEach(([key, cfg]) => {
            const pool: Phaser.Sound.BaseSound[] = [];
            for (let i = 0; i < (cfg.instances || 3); i++) {
                const sound = this.scene.sound.add(key, cfg);
                pool.push(sound);
            }
            this.soundPools.set(key, pool);
        });
    }

    private setupEventListeners(): void {
        // Уничтожение объектов
        this.eventBus.on(CUSTOM_EVENTS.ENEMY_DESTROYED, () => 
            this.playFromPool('explosion'));
        this.eventBus.on(CUSTOM_EVENTS.PLAYER_DESTROYED, () => 
            this.playFromPool('explosion'));

        // Попадания
        this.eventBus.on(CUSTOM_EVENTS.SHIP_HIT, () => 
            this.playFromPool('hit'));

        // Стрельба
        this.eventBus.on(CUSTOM_EVENTS.SHIP_SHOOT, () => 
            this.playFromPool('shot1'));
    }


    private playFromPool(key: string): boolean {
        const pool = this.soundPools.get(key);
        const config = this.config.sfx[key];
        
        if (!pool || !config) return false;

        // Для звуков с разрешенным наложением
        if (config.overlap) {
            const availableSound = pool.find(s => !(s as Phaser.Sound.WebAudioSound).isPlaying);
            if (availableSound) {
                (availableSound as Phaser.Sound.WebAudioSound).play();
                return true;
            }
        }
        
        // Для звуков без наложения
        const soundToUse = pool[0] as Phaser.Sound.WebAudioSound;
        if (soundToUse.isPlaying) {
            if (!config.overlap) {
                soundToUse.stop();
            } else {
                return false; // Не играем, если нельзя накладывать
            }
        }
        
        soundToUse.play();
        return true;
    }

    public playMusic(key: string): void {
        if (!this.config.bgMusic[key]) {
            console.error(`Music ${key} not configured`);
            return;
        }

        this.stopMusic();
        this.currentMusic = this.scene.sound.add(key, this.config.bgMusic[key]) as Phaser.Sound.WebAudioSound;
        this.currentMusic.play();
    }

    public stopMusic(fadeDuration: number = 500): void {
        if (!this.currentMusic) return;

        if (fadeDuration > 0) {
            this.scene.tweens.add({
                targets: this.currentMusic,
                volume: 0,
                duration: fadeDuration,
                onComplete: () => {
                    this.currentMusic?.stop();
                    this.currentMusic?.destroy();
                    this.currentMusic = null;
                }
            });
        } else {
            this.currentMusic.stop();
            this.currentMusic.destroy();
            this.currentMusic = null;
        }
    }

    public changeMusic(newTrack: string, fadeDuration: number = 1000): void {
        this.stopMusic(fadeDuration);
        this.scene.time.delayedCall(fadeDuration + 100, () => {
            this.playMusic(newTrack);
        });
    }

    public destroy(): void {
        this.stopMusic();
        this.soundPools.forEach(pool => {
            pool.forEach(sound => sound.destroy());
        });
        this.soundPools.clear();

        // Отписка от событий
        this.eventBus.off(CUSTOM_EVENTS.ENEMY_DESTROYED);
        this.eventBus.off(CUSTOM_EVENTS.PLAYER_DESTROYED);
        this.eventBus.off(CUSTOM_EVENTS.SHIP_HIT);
        this.eventBus.off(CUSTOM_EVENTS.SHIP_SHOOT);
    }
}
