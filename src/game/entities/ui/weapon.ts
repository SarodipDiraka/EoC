import { EventBusComponent } from '@/game/components/events/event-bus-component';
import { CUSTOM_EVENTS } from '@/game/types/custom-events';
import Phaser from 'phaser';

export class Weapons extends Phaser.GameObjects.Container {
    private weaponTypeText: Phaser.GameObjects.Text;
    private powerText: Phaser.GameObjects.Text;
    private eventBus: EventBusComponent;

    constructor(scene: Phaser.Scene, eventBus: EventBusComponent) {
        super(scene, scene.scale.width - 80, scene.scale.height - 60);
        this.eventBus = eventBus;
        scene.add.existing(this);
        
        this.createDisplay();
        this.setupEventListeners();
    }

    private createDisplay(): void {
        this.weaponTypeText = this.scene.add.text(0, 0, 'W', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5, 0);

        this.powerText = this.scene.add.text(20, 0, '0.00', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0, 0);
        
        this.add([this.weaponTypeText, this.powerText]);
    }

    private setupEventListeners(): void {
        this.eventBus.on(CUSTOM_EVENTS.WEAPON_CHANGED, (data: { weaponType: number }) => {
            this.updateWeaponType(data.weaponType);
        });
        
        this.eventBus.on(CUSTOM_EVENTS.POWER_CHANGED, (power: number) => {
            this.updatePower(power);
        });
    }

    private updateWeaponType(type: number): void {
        let typeChar = 'W';
        switch(type) {
            case 2: typeChar = 'L'; break;
            case 3: typeChar = 'R'; break;
        }
        this.weaponTypeText.setText(typeChar);
    }

    private updatePower(power: number): void {
        const powerLevel = (power / 100).toFixed(2);
        this.powerText.setText(powerLevel);
    }

    public destroy(fromScene?: boolean): void {
        this.eventBus.off(CUSTOM_EVENTS.WEAPON_CHANGED);
        this.eventBus.off(CUSTOM_EVENTS.POWER_CHANGED);
        super.destroy(fromScene);
    }
}