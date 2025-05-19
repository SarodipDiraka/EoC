export class FPSDisplay extends Phaser.GameObjects.Text {
    private lastUpdateTime: number = 0;
    private fpsValues: number[] = [];
    private avgFPS: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {

        super(scene, x, y, '', { 
            fontFamily: 'Arial', 
            fontSize: '12px',
            color: '#ffffff',
            padding: { x: 2, y: 2 }
        });
        
        scene.add.existing(this);
        this.setOrigin(1, 1) // Привязываем к правому нижнему углу
            .setDepth(1000)
            .setAlpha(0.7); // Полупрозрачный
        this.lastUpdateTime = Date.now();
    }

    update(): void {
        const now = Date.now();
        const delta = now - this.lastUpdateTime;
        this.lastUpdateTime = now;
        
        if (delta > 0) {
            const currentFPS = Math.round(1000 / delta);
            this.fpsValues.push(currentFPS);
            
            // Ограничиваем количество значений для усреднения
            if (this.fpsValues.length > 10) {
                this.fpsValues.shift();
            }
            
            // Вычисляем среднее значение
            this.avgFPS = Math.round(
                this.fpsValues.reduce((sum, val) => sum + val, 0) / this.fpsValues.length
            );
            
            this.setText(`FPS: ${this.avgFPS}`);
        }
    }
}