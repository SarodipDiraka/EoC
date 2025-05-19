import Phaser from 'phaser';
import { MenuInputComponent } from '../components/input/human/menu-input-component';
import { EventBus } from '../event-bus';

export class PauseMenu extends Phaser.Scene {
    private menuInput!: MenuInputComponent;
    private menuItems: Phaser.GameObjects.Text[] = [];
    private selectedItemIndex = 0;
    private lastInputTime = 0;
    private inputDelay = 200;

    constructor() {
        super('PauseMenu');
    }

    init(data: { 
        onResume: () => void,
        onRestart: () => void,
        onMainMenu: () => void
    }) {
        this.selectedItemIndex = 0;
        this.lastInputTime = 0;
        this.registry.set('onResume', data.onResume);
        this.registry.set('onRestart', data.onRestart);
        this.registry.set('onMainMenu', data.onMainMenu);
    }

    create() {
        this.createBackground();
        this.createTitle();
        this.createMenuItems();
        this.setupInput();
        this.selectMenuItem(0);

        EventBus.emit('current-scene-ready', this);
    }

    private createBackground() {
        this.add.rectangle(0, 0, 
            this.cameras.main.width, 
            this.cameras.main.height, 
            0x000000, 0.7
        ).setOrigin(0);
    }

    private createTitle() {
        this.add.text(
            this.cameras.main.width / 2, 
            200, 
            'PAUSE', 
            { 
                fontFamily: 'Arial', 
                fontSize: '48px', 
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
    }

    private createMenuItems() {
        this.menuItems = [
            this.createButton('CONTINUE', 300, () => this.registry.get('onResume')()),
            this.createButton('RESTART', 400, () => this.registry.get('onRestart')()),
            this.createButton('MAIN MENU', 500, () => this.registry.get('onMainMenu')())
        ];
    }

    private createButton(text: string, y: number, action: () => void): Phaser.GameObjects.Text {
        const button = this.add.text(
            this.cameras.main.width / 2, 
            y, 
            text, 
            { 
                fontFamily: 'Arial', 
                fontSize: '32px', 
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setInteractive();

        button.on('pointerover', () => {
            this.selectedItemIndex = this.menuItems.indexOf(button);
            this.selectMenuItem(this.selectedItemIndex);
        });

        button.on('pointerout', () => {
            button.setColor('#ffffff');
        });

        button.on('pointerdown', action);

        return button;
    }

    private setupInput() {
        this.menuInput = new MenuInputComponent(this);
        
        // Добавляем поддержку мыши
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return;
            
            const item = this.menuItems.find(item => 
                item.getBounds().contains(pointer.x, pointer.y)
            );
            
            if (item) {
                this.selectedItemIndex = this.menuItems.indexOf(item);
                this.selectMenuItem(this.selectedItemIndex);
                item.emit('pointerdown');
            }
        });
    }

    update(time: number) {
        if (!this.menuInput) return;

        this.menuInput.update();

        this.handleNavigation(time);
        this.handleSelection();
        this.handleSecondaryAction();
        this.handleTrirdAction();
    }

    private handleNavigation(time: number) {
        if (time - this.lastInputTime < this.inputDelay) return;

        if (this.menuInput.downIsDown) {
            this.changeSelectedItem(1);
            this.lastInputTime = time;
        } 
        else if (this.menuInput.upIsDown) {
            this.changeSelectedItem(-1);
            this.lastInputTime = time;
        }
    }

    private changeSelectedItem(direction: number) {
        this.selectedItemIndex = (this.selectedItemIndex + direction + this.menuItems.length) % this.menuItems.length;
        this.selectMenuItem(this.selectedItemIndex);
    }

    private handleSelection() {
        if (this.menuInput.primaryActionIsDown) {
            this.menuItems[this.selectedItemIndex].emit('pointerdown');
        }
    }

    private handleSecondaryAction() {
        if (this.menuInput.secondaryActionIsDown) {
            this.registry.get('onResume')();
        }
    }

    private handleTrirdAction() {
        if (this.menuInput.thirdActionIsDown) {
            this.registry.get('onRestart')();
        }
    }

    private selectMenuItem(index: number) {
        this.menuItems.forEach((item, i) => {
            item.setColor(i === index ? '#ff0' : '#fff');
            item.setScale(i === index ? 1.1 : 1.0);
        });
    }

    shutdown() {
        this.menuInput.cleanup();
        this.registry.remove('onResume');
        this.registry.remove('onRestart');
        this.registry.remove('onMainMenu');
        this.input.off('pointermove');
    }
}