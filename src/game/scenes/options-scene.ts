import { MenuInputComponent } from "../components/input/human/menu-input-component";
import { EventBus } from "../event-bus";
import { LocalStorageManager } from "../managers/local-storage-manager";
import { RemoteStorageManager } from "../managers/remote-storage-manager";
import { CUSTOM_EVENTS } from "../types/custom-events";
import { GameSettings, HighScoreRecord } from "../types/interfaces";

export class OptionsScene extends Phaser.Scene {
    private menuInput!: MenuInputComponent;
    private menuItems: Phaser.GameObjects.Text[] = [];
    private settingItems: Phaser.GameObjects.Text[] = [];
    private selectedItemIndex = 0;
    private lastInputTime = 0;
    private inputDelay = 200;
    private currentSettings!: GameSettings;

    private authStatusText!: Phaser.GameObjects.Text;
    private syncToggleText!: Phaser.GameObjects.Text;
    private isSyncing: boolean = localStorage.getItem('isSyncing') === 'true';
    private connectionStatusText!: Phaser.GameObjects.Text;

    // Логин и кнопка выхода
    private authDisplayGroup!: Phaser.GameObjects.Container;
    private authDisplayText!: Phaser.GameObjects.Text;
    private logoutButton!: Phaser.GameObjects.Text;

    constructor() {
        super('OptionsScene');
    }

    create() {
        this.events.once('shutdown', this.shutdown, this);
        this.currentSettings = LocalStorageManager.loadSettings();

        this.add.rectangle(0, 0, 50, 50, 0x000000).setOrigin(0).setDepth(1000);

        this.createConnectionStatus();
        this.createAuthDisplay();

        this.createBackground();
        this.createTitle();
        this.createSettingsMenu();
        this.setupInput();

        this.selectMenuItem(0);
        EventBus.emit('current-scene-ready', this);
    }

    private createAuthDisplay() {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        const username = localStorage.getItem('username');

        if (token && userId && username) {
            RemoteStorageManager.initialize(token, userId, username);
            RemoteStorageManager.enableSync(); // если нужно, или вручную при включении синхронизации
        }
        const padding = 20;
        const spacing = 10;

        // Удаляем старый контейнер при повторном вызове
        if (this.authDisplayGroup) {
            this.authDisplayGroup.destroy(true);
        }

        // Создаём новый контейнер
        this.authDisplayGroup = this.add.container(0, 20).setDepth(1001);

        // Создаём надпись
        const isAuthorized = !!(token && userId);
        this.authDisplayText = this.add.text(
            0,
            0,
            isAuthorized && username ? username : 'Login/Register',
            {
                fontFamily: 'Arial',
                fontSize: '20px',
                color: '#ffffff',
                backgroundColor: isAuthorized ? undefined : '#0000ff',
                padding: { x: 5, y: 2 }
            }
        ).setOrigin(0, 0);

        if (isAuthorized) {
            // Создаём кнопку выхода
            this.logoutButton = this.add.text(
                0,
                0,
                '[Logout]',
                {
                    fontFamily: 'Arial',
                    fontSize: '18px',
                    color: '#ff4444',
                    backgroundColor: '#000000',
                    padding: { x: 5, y: 2 }
                }
            ).setOrigin(0, 0).setInteractive({ useHandCursor: true });

            this.logoutButton.on('pointerdown', () => this.handleLogout());

            // Добавляем оба элемента
            this.authDisplayGroup.add(this.authDisplayText);
            this.authDisplayGroup.add(this.logoutButton);

            const totalWidth = this.authDisplayText.width + spacing + this.logoutButton.width;
            this.authDisplayText.x = 0;
            this.logoutButton.x = this.authDisplayText.width + spacing;
            this.authDisplayGroup.x = this.cameras.main.width - totalWidth - padding;
        } else {
            // Только надпись, она кликабельна
            this.authDisplayText.setInteractive({ useHandCursor: true });
            this.authDisplayText.once('pointerdown', () => this.scene.launch('AuthScene'));

            this.authDisplayGroup.add(this.authDisplayText);
            this.authDisplayGroup.x = this.cameras.main.width - this.authDisplayText.width - padding;
        }
    }


    private createConnectionStatus() {
        const x = 20;
        const y = 20;

        this.connectionStatusText = this.add.text(
            x,
            y,
            'Checking server status...',
            {
                fontFamily: 'Arial',
                fontSize: '20px',
                color: '#ffff00'
            }
        ).setOrigin(0).setDepth(1001);

        const updateStatus = async () => {
            this.connectionStatusText.setText('Checking connection...');
            this.connectionStatusText.setColor('#ffff00');

            const connected = await RemoteStorageManager.isDbConnected();

            if (connected) {
                this.connectionStatusText.setText('Server: Connected ✅');
                this.connectionStatusText.setColor('#00ff00');
            } else {
                this.connectionStatusText.setText('Server: Local Mode ⚠️');
                this.connectionStatusText.setColor('#ffff00');
            }
        };

        updateStatus();
        const intervalId = setInterval(updateStatus, 5000);

        this.connectionStatusText.setInteractive();
        this.connectionStatusText.on('pointerdown', async () => {
            this.connectionStatusText.setText('Checking...');
            this.connectionStatusText.setColor('#ffff00');
            await updateStatus();
        });

        // Очистка интервала при выключении сцены
        this.events.once('shutdown', () => clearInterval(intervalId));
    }


    private handleLogout() {
        RemoteStorageManager.disableSync();
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        this.isSyncing = false;
        localStorage.setItem('isSyncing','false');
        this.updateSettingsDisplay();
        this.createAuthDisplay();
    }


    private async syncData() {
        if (!this.isSyncing) return;

        const isConnected = await RemoteStorageManager.checkConnection();
        if (!isConnected) {
            this.isSyncing = false;
            localStorage.setItem('isSyncing','false');
            RemoteStorageManager.disableSync();
            this.updateSettingsDisplay();
            return;
        }

        try {
            // 1. Сначала загружаем настройки с сервера
            const remoteSettings = await RemoteStorageManager.loadSettings();
            
            if (remoteSettings) {
                // 2. Объединяем настройки с приоритетом серверных значений
                this.currentSettings = {
                    ...this.currentSettings, // локальные настройки
                    ...remoteSettings       // перезаписываем серверными
                };
                
                // 3. Сохраняем объединенные настройки и локально, и на сервере
                LocalStorageManager.saveSettings(this.currentSettings);
                await RemoteStorageManager.saveSettings(this.currentSettings);
                
                // 4. Обновляем UI
                this.updateSettingsDisplay();
            }

            // 5. Синхронизируем таблицу рекордов
            // Загружаем серверные рекорды
            const remoteScores = await RemoteStorageManager.loadHighScores();

            // Загружаем локальные
            const localScores = LocalStorageManager.loadHighScores();

            let mergedScores: HighScoreRecord[] = [];

            if (remoteScores && remoteScores.length > 0) {
                // Объединяем и сортируем
                mergedScores = this.mergeAndSortScores(localScores, remoteScores);
                await RemoteStorageManager.clearHighScores();
                for (const score of mergedScores) {
                    await RemoteStorageManager.addHighScore(score);
                }
            } else {
                // Если серверных нет или массив пуст, отправляем локальные на сервер
                mergedScores = localScores;
                for (const score of localScores) {
                    await RemoteStorageManager.addHighScore(score);
                }
            }

            // Сохраняем объединённые данные локально и (если нужно) на сервере
            LocalStorageManager.saveHighScores(mergedScores);

            console.log('Synchronization completed successfully');
        } catch (error) {
            console.error('Synchronization failed:', error);
            this.isSyncing = false;
            localStorage.setItem('isSyncing','false');
            RemoteStorageManager.disableSync();
            this.updateSettingsDisplay();
        }
    }

    private mergeAndSortScores(
        localScores: HighScoreRecord[], 
        remoteScores: HighScoreRecord[]
    ): HighScoreRecord[] {
        // Объединяем массивы
        const combined = [...localScores, ...remoteScores];

        // Удаляем дубликаты по имени, уровню и очкам (если необходимо)
        const uniqueMap = new Map<string, HighScoreRecord>();

        for (const rec of combined) {
            // Ключ для уникальности: name + score + level
            const key = `${rec.name}_${rec.score}_${rec.level}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, rec);
            }
        }

        // Получаем уникальный массив
        const uniqueScores = Array.from(uniqueMap.values());

        // Сортируем по убыванию очков
        const sorted = uniqueScores.sort((a, b) => b.score - a.score);

        // Берём топ-10
        return sorted.slice(0, 10);
    }


    private updateSettingsDisplay() {
        this.settingItems[0].setText(`Music: [${this.getVolumeBars(this.currentSettings.musicVolume)}]`);
        this.settingItems[1].setText(`SFX: [${this.getVolumeBars(this.currentSettings.sfxVolume)}]`);
        this.settingItems[2].setText(`Show FPS: ${this.currentSettings.showFPS ? 'ON' : 'OFF'}`);
        this.settingItems[3].setText(`Weapon: ${this.currentSettings.weaponType.toUpperCase()}`);
        this.settingItems[4].setText(`Sync: ${this.isSyncing ? 'ON' : 'OFF'}`);
    }

    private applySettings() {
        // Сохраняем локально
        LocalStorageManager.saveSettings(this.currentSettings);
        
        // Если синхронизация включена - сохраняем на сервере
        if (this.isSyncing) {
            RemoteStorageManager.saveSettings(this.currentSettings)
                .then(success => {
                    if (!success) {
                        this.isSyncing = false;
                        localStorage.setItem('isSyncing','false');
                        RemoteStorageManager.disableSync();
                        this.updateSettingsDisplay();
                    }
                })
                .catch(error => {
                    console.error('Failed to sync settings:', error);
                    this.isSyncing = false;
                    localStorage.setItem('isSyncing','false');
                    RemoteStorageManager.disableSync();
                    this.updateSettingsDisplay();
                });
        }
        
        EventBus.emit(CUSTOM_EVENTS.SETTINGS_CHANGED, this.currentSettings);
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
        y += 60;

        this.syncToggleText = this.add.text(
            centerX,
            y,
            `Sync: ${this.isSyncing ? 'ON' : 'OFF'}`,
            { fontFamily: 'Arial', fontSize: '32px', color: '#ffffff' }
        ).setOrigin(0.5);
        this.settingItems.push(this.syncToggleText);
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
            this.selectedItemIndex = this.settingItems.length + 1;
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
        const oldSettings = {...this.currentSettings};
        
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
            case 4: // Sync Toggle
                if (!RemoteStorageManager.isLoggedIn()) {
                    alert('Please login to enable sync');
                    return;
                }
                this.isSyncing = !this.isSyncing;
                if (this.isSyncing) {
                    RemoteStorageManager.enableSync();
                    this.syncData()
                        .then(() => {
                            this.isSyncing = true;
                            localStorage.setItem('isSyncing', 'true');
                            this.settingItems[4].setText(`Sync: ON`);
                        })
                        .catch(error => {
                            console.error('Failed to enable sync:', error);
                            RemoteStorageManager.disableSync();
                            this.isSyncing = false;
                            localStorage.setItem('isSyncing','false');
                            this.settingItems[4].setText(`Sync: OFF`);
                            alert('Failed to enable synchronization. Please try again later.');
                        });
                } else {
                    RemoteStorageManager.disableSync();
                    this.isSyncing = false;
                    localStorage.setItem('isSyncing','false');
                    this.settingItems[4].setText(`Sync: OFF`);
                }
                return;
        }
        this.updateSettingsDisplay();

        this.applySettings();

        // Если синхронизация включена и настройки звука изменились
        if (this.isSyncing && (
            oldSettings.musicVolume !== this.currentSettings.musicVolume ||
            oldSettings.sfxVolume !== this.currentSettings.sfxVolume
        )) {
            // Дополнительная проверка для звуковых настроек
            RemoteStorageManager.saveSettings(this.currentSettings)
                .catch(error => {
                    console.error('Failed to sync audio settings:', error);
                });
        }
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

    shutdown() {
        this.menuInput.cleanup();
        this.settingItems.forEach(item => item.destroy());
        this.menuItems.forEach(item => item.destroy());
        this.settingItems = [];
        this.menuItems = [];
        this.authDisplayGroup?.destroy(true);
        this.authStatusText?.destroy();
        this.syncToggleText?.destroy();
        this.connectionStatusText?.destroy();
        this.logoutButton?.destroy();
        this.input.off('pointermove');
        this.selectedItemIndex = 0;
    }
}