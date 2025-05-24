import { MenuInputComponent } from "../components/input/human/menu-input-component";
import { EventBus } from "../event-bus";
import { LocalStorageManager } from "../managers/local-storage-manager";
import { CUSTOM_EVENTS } from "../types/custom-events";
import { GameSettings } from "../types/interfaces";

export class OptionsScene extends Phaser.Scene {
    private menuInput!: MenuInputComponent;
    private menuItems: Phaser.GameObjects.Text[] = [];
    private settingItems: Phaser.GameObjects.Text[] = [];
    private selectedItemIndex = 0;
    private lastInputTime = 0;
    private inputDelay = 200;
    private currentSettings!: GameSettings;

    constructor() {
        super('OptionsScene');
    }

    create() {
        this.events.once('shutdown', this.shutdown, this); 
        this.currentSettings = LocalStorageManager.loadSettings();
        
        this.add.rectangle(0, 0, 50, 50, 0x000000)
            .setOrigin(0)
            .setDepth(1000);
        
        this.createBackground();
        this.createTitle();
        this.createSettingsMenu();
        this.setupInput();

        this.selectMenuItem(0);
        EventBus.emit('current-scene-ready', this);
    }

    private createBackground() {
        this.add.image(0, 0, 'background')
            .setOrigin(0)
            .setScale(1.25);
    }

    private createTitle() {
        this.add.text(
            this.cameras.main.width / 2, 
            100, 
            'OPTIONS', 
            { 
                fontFamily: 'Arial', 
                fontSize: '48px', 
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
    }

    private getVolumeBars(volume: number): string {
        return '■'.repeat(Math.floor(volume * 10)) + '□'.repeat(10 - Math.floor(volume * 10));
    }

    private createSettingsMenu() {
        const centerX = this.cameras.main.width / 2;
        let y = 200;

        // Music Volume
        const musicItem = this.add.text(
            centerX,
            y,
            `Music: [${this.getVolumeBars(this.currentSettings.musicVolume)}]`,
            { fontFamily: 'Arial', fontSize: '32px', color: '#ffffff' }
        ).setOrigin(0.5);
        this.settingItems.push(musicItem);
        y += 60;

        // SFX Volume
        const sfxItem = this.add.text(
            centerX,
            y,
            `SFX: [${this.getVolumeBars(this.currentSettings.sfxVolume)}]`,
            { fontFamily: 'Arial', fontSize: '32px', color: '#ffffff' }
        ).setOrigin(0.5);
        this.settingItems.push(sfxItem);
        y += 60;

        // Show FPS
        const fpsItem = this.add.text(
            centerX,
            y,
            `Show FPS: ${this.currentSettings.showFPS ? 'ON' : 'OFF'}`,
            { fontFamily: 'Arial', fontSize: '32px', color: '#ffffff' }
        ).setOrigin(0.5);
        this.settingItems.push(fpsItem);
        y += 60;

        // Weapon Type
        const weaponItem = this.add.text(
            centerX,
            y,
            `Weapon: ${this.currentSettings.weaponType.toUpperCase()}`,
            { fontFamily: 'Arial', fontSize: '32px', color: '#ffffff' }
        ).setOrigin(0.5);
        this.settingItems.push(weaponItem);
        y += 100;

        const resetButton = this.add.text(
            centerX,
            y,
            'RESET TO DEFAULTS',
            { fontFamily: 'Arial', fontSize: '32px', color: '#ffffff' }
        ).setOrigin(0.5).setInteractive();
        this.menuItems.push(resetButton);

        resetButton.on('pointerover', () => {
            this.selectedItemIndex = this.settingItems.length;
            this.selectMenuItem(this.selectedItemIndex);
        });

        resetButton.on('pointerout', () => {
            resetButton.setColor('#ffffff');
        });

        resetButton.on('pointerdown', () => this.resetToDefaults());

        y += 60;

        // Back button
        const backButton = this.add.text(
            centerX,
            y,
            'BACK TO MENU',
            { fontFamily: 'Arial', fontSize: '32px', color: '#ffffff' }
        ).setOrigin(0.5).setInteractive();
        this.menuItems.push(backButton);

        backButton.on('pointerover', () => {
            this.selectedItemIndex = this.settingItems.length;
            this.selectMenuItem(this.selectedItemIndex);
        });

        backButton.on('pointerout', () => {
            backButton.setColor('#ffffff');
        });

        backButton.on('pointerdown', () => this.returnToMenu());
    }

    private resetToDefaults() {
        this.currentSettings = LocalStorageManager.getDefaultConfig();
        this.settingItems[0].setText(`Music: [${this.getVolumeBars(this.currentSettings.musicVolume)}]`);
        this.settingItems[1].setText(`SFX: [${this.getVolumeBars(this.currentSettings.sfxVolume)}]`);
        this.settingItems[2].setText(`Show FPS: ${this.currentSettings.showFPS ? 'ON' : 'OFF'}`);
        this.settingItems[3].setText(`Weapon: ${this.currentSettings.weaponType.toUpperCase()}`);
        this.applySettings();
    }


    private setupInput() {
        this.menuInput = new MenuInputComponent(this);
    }

    update(time: number) {
        if (!this.menuInput) return;
        this.menuInput.update();

        if (time - this.lastInputTime < this.inputDelay) return;

        // Вертикальная навигация
        if (this.menuInput.downIsDown) {
            this.changeSelectedItem(1);
            this.lastInputTime = time;
        } 
        else if (this.menuInput.upIsDown) {
            this.changeSelectedItem(-1);
            this.lastInputTime = time;
        }
        // Горизонтальное изменение настроек
        else if (this.menuInput.rightIsDown && this.selectedItemIndex < this.settingItems.length) {
            this.adjustSetting(1);
            this.lastInputTime = time;
        }
        else if (this.menuInput.leftIsDown && this.selectedItemIndex < this.settingItems.length) {
            this.adjustSetting(-1);
            this.lastInputTime = time;
        }
        // Основное действие (Enter)
        else if (this.menuInput.primaryActionIsDown) {
            const resetIndex = this.settingItems.length;
            const backIndex = this.settingItems.length + 1;

            if (this.selectedItemIndex === resetIndex) {
                this.resetToDefaults();
            } else if (this.selectedItemIndex === backIndex) {
                this.returnToMenu();
            }
        }

        this.handleSecondaryAction();
    }

    private adjustSetting(direction: number) {
        switch (this.selectedItemIndex) {
            case 0: // Music Volume
                this.currentSettings.musicVolume = Phaser.Math.Clamp(
                    this.currentSettings.musicVolume + direction * 0.1, 0, 1
                );
                this.settingItems[0].setText(`Music: [${this.getVolumeBars(this.currentSettings.musicVolume)}]`);
                break;
            
            case 1: // SFX Volume
                this.currentSettings.sfxVolume = Phaser.Math.Clamp(
                    this.currentSettings.sfxVolume + direction * 0.1, 0, 1
                );
                this.settingItems[1].setText(`SFX: [${this.getVolumeBars(this.currentSettings.sfxVolume)}]`);
                break;
            
            case 2: // Show FPS
                this.currentSettings.showFPS = !this.currentSettings.showFPS;
                this.settingItems[2].setText(`Show FPS: ${this.currentSettings.showFPS ? 'ON' : 'OFF'}`);
                break;
            
            case 3: // Weapon Type
                const types: ('wide' | 'laser' | 'rockets')[] = ['wide', 'laser', 'rockets'];
                const currentIndex = types.indexOf(this.currentSettings.weaponType);
                const newIndex = (currentIndex + direction + types.length) % types.length;
                this.currentSettings.weaponType = types[newIndex];
                this.settingItems[3].setText(`Weapon: ${this.currentSettings.weaponType.toUpperCase()}`);
                break;
        }

        this.applySettings();
    }

    private handleSecondaryAction() {
        if (this.menuInput.secondaryActionIsDown) {
            this.returnToMenu();
        }
    }

    private returnToMenu() {
        this.applySettings();
        this.scene.start('MainMenu');
    }

    private changeSelectedItem(direction: number) {
        const itemCount = this.settingItems.length + 2; // Настройки + кнопки
        this.selectedItemIndex = (this.selectedItemIndex + direction + itemCount) % itemCount;
        this.selectMenuItem(this.selectedItemIndex);
    }

    private selectMenuItem(index: number) {
        // Подсветка элементов настроек
        this.settingItems.forEach((item, i) => {
            item.setColor(i === index ? '#ff0' : '#ffffff');
        });

        // Подсветка элементов меню (BACK, RESET)
        this.menuItems.forEach((item, i) => {
            const menuIndex = this.settingItems.length + i;
            item.setColor(index === menuIndex ? '#ff0' : '#ffffff');
        });
    }


    private applySettings() {
        LocalStorageManager.saveSettings(this.currentSettings);
        EventBus.emit(CUSTOM_EVENTS.SETTINGS_CHANGED, this.currentSettings);
    }

    shutdown() {
        this.menuInput.cleanup();
        this.settingItems.forEach(item => item.destroy());
        this.menuItems.forEach(item => item.destroy());
        this.settingItems = [];
        this.menuItems = [];
        this.input.off('pointermove');
        this.selectedItemIndex = 0;
    }
}