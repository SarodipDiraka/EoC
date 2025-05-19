import Phaser from 'phaser';
import { BossEnemy } from '../enemies/bosses/base-boss';
import { EventBus } from '@/game/event-bus';

export class BossUI {
    private _currentHealthBar: Phaser.GameObjects.Graphics | null = null;
    private _currentHealthBarBg: Phaser.GameObjects.Graphics | null = null;
    private _phaseIndicators: Phaser.GameObjects.Graphics[] = [];
    private _healthText: Phaser.GameObjects.Text | null = null;
    private _boss: BossEnemy | null = null;
    private _scene: Phaser.Scene;
    private _barWidth: number;
    private _barHeight: number;
    private _margin: number;
    private _indicatorSize: number;
    private _phaseTimerText: Phaser.GameObjects.Text | null = null;
    private _phaseStartTime: number = 0;

    constructor(scene: Phaser.Scene) {
        this._scene = scene;
        this._barWidth = scene.scale.width * 0.75;
        this._barHeight = 12;
        this._margin = 10;
        this._indicatorSize = 10;

        this.initEventListeners();
    }

    private initEventListeners(): void {
        EventBus.on('BOSS_HEALTH_CHANGE', this.updateUI, this);
        EventBus.on('BOSS_PHASE_CHANGE', this.handlePhaseChange, this);
        this._scene.events.on(Phaser.Scenes.Events.UPDATE, this.updatePhaseTimer, this);
    }

    private createUIElements(): void {
        this.destroyElements();
        this.createHealthBar();
        this.createTextElements();
        this.createPhaseTimer();
    }

    private handlePhaseChange = () => {
        this._phaseStartTime = this._scene.time.now;
        this.updatePhaseIndicators();
        this.updateUI();
    };

    private updatePhaseTimer = () => {
        if (!this._boss || !this._phaseTimerText) return;

        const currentPhase = this._boss.currentPhaseIndex;
        const phases = this._boss['_phases'];
        const currentPhaseData = phases[currentPhase];
        if (!currentPhaseData?.duration) {
            this._phaseTimerText?.setText('');
            return;
        }

        const elapsed = this._scene.time.now - this._phaseStartTime;
        const remaining = Math.max(0, currentPhaseData.duration - elapsed);
        this._phaseTimerText.setText(`${Math.ceil(remaining / 1000)}s`);
    };

    public setBoss(boss: BossEnemy): void {
        this._boss = boss;
        this._phaseStartTime = this._scene.time.now;
        this.createUIElements();
        this.updatePhaseIndicators();
        this.updateUI();
    }

    private createHealthBar(): void {
        this._currentHealthBarBg = this._scene.add.graphics()
            .fillStyle(0x333333, 0.8)
            .fillRect(this._margin, this._margin, this._barWidth, this._barHeight)
            .setScrollFactor(0)
            .setDepth(100);

        this._currentHealthBar = this._scene.add.graphics()
            .fillStyle(0xff0000, 1)
            .fillRect(this._margin, this._margin, this._barWidth, this._barHeight)
            .setScrollFactor(0)
            .setDepth(101);
    }

    private createTextElements(): void {
        this._healthText = this._scene.add.text(
            this._margin,
            this._margin + this._barHeight + this._indicatorSize + 10,
            'BOSS: 100%',
            {
                fontFamily: 'Arial',
                fontSize: '14px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(100);
    }

    private createPhaseTimer(): void {
        this._phaseTimerText = this._scene.add.text(
            this._margin + this._barWidth - 5,
            this._margin + this._barHeight + 6,
            '',
            {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        )
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(100);
    }

    private updateUI(): void {
        if (!this._boss || !this._boss.healthComponent) {
            this.destroy();
            return;
        }

        const currentPhase = this._boss.currentPhaseIndex;
        const phases = this._boss['_phases'];
        const currentPhaseData = phases[currentPhase];
        const healthPercent = Math.floor((this._boss.healthComponent.life / currentPhaseData.health) * 100);
        const width = (this._boss.healthComponent.life / currentPhaseData.health) * this._barWidth;

        this._currentHealthBar
            ?.clear()
            .fillStyle(this.getHealthColor(healthPercent), 1)
            .fillRect(this._margin, this._margin, width, this._barHeight);

        this._healthText?.setText(`BOSS: ${healthPercent}%`);
    }

    private updatePhaseIndicators(): void {
        if (!this._boss) return;
    
        // Очищаем старые индикаторы
        this._phaseIndicators.forEach(indicator => indicator.destroy());
        this._phaseIndicators = [];
    
        const totalPhases = this._boss['_phases'].length;
        const currentPhase = this._boss.currentPhaseIndex;
    
        // Параметры звезды
        const starColor = 0xffffff; // 0x00ff00 Зеленый
        const starSize = 12;
        const starSpacing = 15;
        const startX = this._margin;
        const yPos = this._margin + this._barHeight + 8;
    
        // Рисуем звезды для будущих фаз
        for (let i = currentPhase + 1; i < totalPhases; i++) {
            const xPos = startX + (i - currentPhase - 1) * starSpacing;
    
            const star = this._scene.add.graphics()
                .fillStyle(starColor, 1)
                .lineStyle(1, 0xffffff, 0.8);
    
            // Рисуем 5-конечную звезду
            this.drawStar(star, xPos + starSize/2, yPos + starSize/2, 5, starSize/2, starSize/4);
    
            star.setScrollFactor(0)
                .setDepth(102);
    
            this._phaseIndicators.push(star);
        }
    }
    
    // Метод для рисования звезды
    private drawStar(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        points: number,
        outerRadius: number,
        innerRadius: number
    ): void {
        const angle = Math.PI / points;
        let rotation = Math.PI / 2 * 3;
    
        graphics.beginPath();
        graphics.moveTo(x, y - outerRadius);
    
        for (let i = 0; i < points; i++) {
            // Внешняя точка
            const outerX = x + Math.cos(rotation) * outerRadius;
            const outerY = y + Math.sin(rotation) * outerRadius;
            graphics.lineTo(outerX, outerY);
            rotation += angle;
    
            // Внутренняя точка
            const innerX = x + Math.cos(rotation) * innerRadius;
            const innerY = y + Math.sin(rotation) * innerRadius;
            graphics.lineTo(innerX, innerY);
            rotation += angle;
        }
    
        graphics.lineTo(x, y - outerRadius);
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();
    }

    private getHealthColor(percent: number): number {
        if (percent > 60) return 0x00ff00;
        if (percent > 30) return 0xffff00;
        return 0xff0000;
    }

    public destroy(): void {
        EventBus.off('BOSS_HEALTH_CHANGE', this.updateUI, this);
        EventBus.off('BOSS_PHASE_CHANGE', this.handlePhaseChange, this);
        this._scene.events.off(Phaser.Scenes.Events.UPDATE, this.updatePhaseTimer, this);
        this.destroyElements();
    }

    private destroyElements(): void {
        this._currentHealthBar?.destroy();
        this._currentHealthBarBg?.destroy();
        this._healthText?.destroy();
        this._phaseTimerText?.destroy();
        this._phaseIndicators.forEach(indicator => indicator.destroy());
        
        this._currentHealthBar = null;
        this._currentHealthBarBg = null;
        this._healthText = null;
        this._phaseTimerText = null;
        this._phaseIndicators = [];
    }
}