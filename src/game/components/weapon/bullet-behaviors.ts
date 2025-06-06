import { BulletBehavior } from "./bullet-spawner-component";

/**
 * Поведение пули: синусоидальное движение
 * Пуля движется по волнообразной траектории относительно исходного направления
 */
export class SinWaveBehavior implements BulletBehavior {
    private frequency: number;  // Частота колебаний (чем больше - тем чаще волны)
    private amplitude: number; // Амплитуда колебаний (размах волны)
    private initialAngle: number; // Начальный угол для смещения фазы
    private time: number = 0;  // Внутренний таймер для расчета положения
    
    constructor(frequency: number, amplitude: number, initialAngle = 0) {
        this.frequency = frequency;
        this.amplitude = amplitude;
        this.initialAngle = initialAngle;
    }
    
    update(bullet: Phaser.Physics.Arcade.Sprite, delta: number): void {
        // Обновляем внутренний таймер
        this.time += delta;
        
        // Получаем текущий угол движения пули
        const angle = Math.atan2(bullet.body!.velocity.y, bullet.body!.velocity.x);
        
        // Рассчитываем смещение по синусоиде
        const offset = Math.sin(this.time * this.frequency + this.initialAngle) * this.amplitude;
        
        // Новый угол с учетом смещения
        const newAngle = angle + offset;
        
        // Сохраняем исходную скорость
        const speed = Math.sqrt(
            bullet.body!.velocity.x * bullet.body!.velocity.x + 
            bullet.body!.velocity.y * bullet.body!.velocity.y
        );
        
        // Применяем новый вектор скорости
        bullet.body!.velocity.x = Math.cos(newAngle) * speed;
        bullet.body!.velocity.y = Math.sin(newAngle) * speed;
    }
}

/**
 * Поведение пули: постоянное ускорение
 * Пуля постепенно увеличивает скорость с течением времени
 */
export class AcceleratingBehavior implements BulletBehavior {
    private acceleration: number; // Ускорение в пикселях/сек^2
    
    constructor(acceleration: number) {
        this.acceleration = acceleration;
    }
    
    update(bullet: Phaser.Physics.Arcade.Sprite, delta: number): void {
        // Получаем текущий угол движения
        const angle = Math.atan2(bullet.body!.velocity.y, bullet.body!.velocity.x);
        
        // Рассчитываем текущую скорость
        const speed = Math.sqrt(
            bullet.body!.velocity.x * bullet.body!.velocity.x + 
            bullet.body!.velocity.y * bullet.body!.velocity.y
        );
        
        // Увеличиваем скорость с учетом времени
        const newSpeed = speed + this.acceleration * delta / 1000;
        
        // Обновляем вектор скорости с сохранением направления
        bullet.body!.velocity.x = Math.cos(angle) * newSpeed;
        bullet.body!.velocity.y = Math.sin(angle) * newSpeed;
    }
}

/**
 * Поведение пули: самонаведение на игрока
 * Пуля постепенно меняет направление, чтобы двигаться к игроку
 */
export class HomingBehavior implements BulletBehavior {
    private turnRate: number;
    private playerGetter: () => Phaser.GameObjects.Sprite | undefined;
    private delay: number;
    private homingDuration: number;
    private elapsedTime: number = 0;
    
    constructor(turnRate: number, playerGetter: () => Phaser.GameObjects.Sprite | undefined, 
                delay = 0, homingDuration = 1500) {
        this.turnRate = turnRate;
        this.playerGetter = playerGetter;
        this.delay = delay;
        this.homingDuration = homingDuration;
    }
    
    update(bullet: Phaser.Physics.Arcade.Sprite, delta: number): void {
        this.elapsedTime += delta;
        
        if (this.delay > 0) {
            this.delay -= delta;
            return;
        }
        
        // Прекращаем наведение после заданного времени
        if (this.elapsedTime > this.homingDuration) return;
        
        const player = this.playerGetter();
        if (!player?.active) return;
        
        const angle = Phaser.Math.Angle.Between(
            bullet.x, bullet.y,
            player.x, player.y
        );
        
        const currentAngle = Math.atan2(bullet.body!.velocity.y, bullet.body!.velocity.x);
        const newAngle = Phaser.Math.Angle.RotateTo(
            currentAngle, 
            angle, 
            this.turnRate * delta / 1000
        );
        
        const speed = Math.sqrt(
            bullet.body!.velocity.x * bullet.body!.velocity.x + 
            bullet.body!.velocity.y * bullet.body!.velocity.y
        );
        
        bullet.body!.velocity.x = Math.cos(newAngle) * speed;
        bullet.body!.velocity.y = Math.sin(newAngle) * speed;
    }
}

/**
 * Поведение пули: периодическая смена направления
 * Пуля резко меняет направление через заданные интервалы времени
 */
export class DirectionChangeBehavior implements BulletBehavior {
    private interval: number;    // Интервал между сменами направления (мс)
    private angleChange: number; // Угол изменения направления (радианы)
    private timeToChange: number; // Оставшееся время до следующей смены
    
    constructor(interval: number, angleChange: number) {
        this.interval = interval;
        this.angleChange = angleChange;
        this.timeToChange = interval;
    }
    
    update(bullet: Phaser.Physics.Arcade.Sprite, delta: number): void {
        // Уменьшаем таймер
        this.timeToChange -= delta;
        
        // Если время пришло - меняем направление
        if (this.timeToChange <= 0) {
            this.timeToChange = this.interval; // Сбрасываем таймер
            
            // Текущий угол движения
            const angle = Math.atan2(bullet.body!.velocity.y, bullet.body!.velocity.x);
            
            // Новый угол с изменением
            const newAngle = angle + this.angleChange;
            
            // Сохраняем скорость
            const speed = Math.sqrt(
                bullet.body!.velocity.x * bullet.body!.velocity.x + 
                bullet.body!.velocity.y * bullet.body!.velocity.y
            );
            
            // Применяем новое направление
            bullet.body!.velocity.x = Math.cos(newAngle) * speed;
            bullet.body!.velocity.y = Math.sin(newAngle) * speed;
        }
    }
}