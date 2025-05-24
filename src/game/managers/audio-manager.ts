import { EventBusComponent } from '../components/events/event-bus-component';
import Phaser from 'phaser';
import { CUSTOM_EVENTS } from '../types/custom-events';
import { GameSettings } from '../types/interfaces';
import { LocalStorageManager } from '../managers/local-storage-manager';

type SoundConfig = {
    baseVolume: number; // Базовая громкость (0-1)
    loop?: boolean;
    instances?: number;
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
    private currentSettings: GameSettings;

    constructor(scene: Phaser.Scene, eventBus: EventBusComponent) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.currentSettings = LocalStorageManager.loadSettings();
        this.config = this.getDefaultConfig();
        this.init();
    }

    private getDefaultConfig(): AudioConfig {
        return {
            bgMusic: {
                'bg': { baseVolume: 1.0, loop: true },
            },
            sfx: {
                'explosion': { baseVolume: 1.0, instances: 3, overlap: false },
                'hit': { baseVolume: 1.0, instances: 1, overlap: false },
                'shot1': { baseVolume: 1.0, instances: 3, overlap: true }
            }
        };
    }

    private init(): void {
        this.preloadSounds();
        this.setupEventListeners();
        this.applyCurrentVolumes();
    }

    private applyCurrentVolumes(): void {
        // Применяем громкость для музыки
        if (this.currentMusic) {
            const musicConfig = this.config.bgMusic[this.currentMusic.key];
            if (musicConfig) {
                this.currentMusic.setVolume(musicConfig.baseVolume * this.currentSettings.musicVolume);
            }
        }

        // Применяем громкость для SFX
        this.soundPools.forEach((pool, key) => {
            const config = this.config.sfx[key];
            if (config) {
                pool.forEach(sound => {
                    (sound as Phaser.Sound.WebAudioSound).setVolume(
                        config.baseVolume * this.currentSettings.sfxVolume
                    );
                });
            }
        });
    }

    private preloadSounds(): void {
        // Предзагрузка музыки с учетом текущих настроек
        Object.keys(this.config.bgMusic).forEach(key => {
            const cfg = this.config.bgMusic[key];
            this.scene.sound.add(key, {
                ...cfg,
                volume: cfg.baseVolume * this.currentSettings.musicVolume
            });
        });

        console.log(`Not Music`);
        console.log(this.currentSettings.sfxVolume);

        // Создание пулов для SFX с учетом текущих настроек
        Object.entries(this.config.sfx).forEach(([key, cfg]) => {
            const pool: Phaser.Sound.BaseSound[] = [];
            for (let i = 0; i < (cfg.instances || 3); i++) {
                const sound = this.scene.sound.add(key, {
                    ...cfg,
                    volume: cfg.baseVolume * this.currentSettings.sfxVolume
                });
                pool.push(sound);
            }
            this.soundPools.set(key, pool);
        });
    }

    private setupEventListeners(): void {
        this.eventBus.on(CUSTOM_EVENTS.ENEMY_DESTROYED, () => 
            this.playFromPool('explosion'));
        this.eventBus.on(CUSTOM_EVENTS.PLAYER_DESTROYED, () => 
            this.playFromPool('explosion'));
        this.eventBus.on(CUSTOM_EVENTS.SHIP_HIT, () => 
            this.playFromPool('hit'));
        this.eventBus.on(CUSTOM_EVENTS.SHIP_SHOOT, () => 
            this.playFromPool('shot1'));

        this.eventBus.on(CUSTOM_EVENTS.SETTINGS_CHANGED, (settings: GameSettings) => {
            this.currentSettings = settings;
            this.applyCurrentVolumes();
        });
    }

    private playFromPool(key: string): boolean {
        const pool = this.soundPools.get(key);
        const config = this.config.sfx[key];
        
        if (!pool || !config) return false;

        console.log(`Not Music`);
        console.log(this.currentSettings.sfxVolume);

        if (config.overlap) {
            const availableSound = pool.find(s => !(s as Phaser.Sound.WebAudioSound).isPlaying);
            if (availableSound) {
                this.setSoundVolume(availableSound as Phaser.Sound.WebAudioSound, key);
                availableSound.play();
                return true;
            }
        }
        
        const soundToUse = pool[0] as Phaser.Sound.WebAudioSound;
        if (soundToUse.isPlaying && !config.overlap) {
            soundToUse.stop();
        }
        
        this.setSoundVolume(soundToUse, key);
        soundToUse.play();
        return true;
    }

    private setSoundVolume(sound: Phaser.Sound.WebAudioSound, key: string): void {
        const config = this.config.sfx[key];
        if (config) {
            sound.setVolume(config.baseVolume * this.currentSettings.sfxVolume);
        }
    }

    public playMusic(key: string): void {
        const config = this.config.bgMusic[key];
        if (!config) {
            console.error(`Music ${key} not configured`);
            return;
        }

        console.log(`Music`);
        console.log(this.currentSettings.musicVolume);

        this.stopMusic();
        this.currentMusic = this.scene.sound.add(key, {
            ...config,
            volume: config.baseVolume * this.currentSettings.musicVolume
        }) as Phaser.Sound.WebAudioSound;
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
        this.eventBus.off(CUSTOM_EVENTS.SETTINGS_CHANGED);
    }
}
