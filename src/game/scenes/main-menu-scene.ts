import Phaser from 'phaser';
import { EventBus } from '../event-bus';
import { MenuInputComponent } from '../components/input/human/menu-input-component';

export class MainMenu extends Phaser.Scene {
    private menuInput!: MenuInputComponent;
    private menuItems: Phaser.GameObjects.Text[] = [];
    private selectedItemIndex = 0;
    private lastInputTime = 0;
    private inputDelay = 200;
    private title!: Phaser.GameObjects.Text;

    constructor() {
        super('MainMenu');
    }

    create() {
        // Сохраняем выбранный индекс при перезаходе
        this.selectedItemIndex = this.registry.get('selectedMenuItemIndex') || 0;
        
        this.add.rectangle(0, 0, 50, 50, 0x000000)
            .setOrigin(0)
            .setDepth(1000);
            
        this.createBackground();
        this.createTitle();
        this.createMenuItems();
        this.setupInput();
        this.selectMenuItem(this.selectedItemIndex);

        EventBus.emit('current-scene-ready', this);
    }

    private createBackground() {
        this.add.image(0, 0, 'background')
            .setOrigin(0)
            .setScale(1.25);
    }

    private createTitle() {
        this.title = this.add.text(
            this.cameras.main.width / 2, 
            150, 
            'End of Course', 
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
            this.createMenuItem(300, 'Game Start', () => {
                this.registry.set('selectedMenuItemIndex', 0);
                this.scene.start('GameScene');
            }),
            this.createMenuItem(400, 'Records', () => {
                this.registry.set('selectedMenuItemIndex', 1);
                this.scene.start('RecordsScene');
            }),
            this.createMenuItem(500, 'Options', () => {
                this.registry.set('selectedMenuItemIndex', 2);
                this.scene.start('OptionsScene');
            })
        ];
    }

    private createMenuItem(y: number, text: string, action: () => void): Phaser.GameObjects.Text {
        const menuItem = this.add.text(
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

        menuItem.on('pointerover', () => {
            this.selectedItemIndex = this.menuItems.indexOf(menuItem);
            this.selectMenuItem(this.selectedItemIndex);
        });

        menuItem.on('pointerout', () => {
            menuItem.setColor('#ffffff');
        });

        menuItem.on('pointerdown', action);

        return menuItem;
    }

    private setupInput() {
        this.menuInput = new MenuInputComponent(this);
        
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
            // Дополнительное действие (например, выход в главное меню)
            console.log('Secondary action triggered');
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
        this.input.off('pointermove');
    }
}
