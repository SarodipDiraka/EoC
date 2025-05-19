export class HealthComponent {
  private startingLife: number;
  private currentLife: number;
  private isDeadFlag: boolean;

  constructor(life: number) {
    this.startingLife = life;
    this.currentLife = life;
    this.isDeadFlag = false;
  }

  get life(): number {
    return this.currentLife;
  }

  get isDead(): boolean {
    return this.isDeadFlag;
  }

  setLife(value: number): void {
    this.currentLife = value;
  }

  reset(): void {
    this.currentLife = this.startingLife;
    this.isDeadFlag = false;
  }

  hit(damage: number): void {
    if (this.isDeadFlag) {
      return;
    }

    this.currentLife = this.currentLife - damage;
    if (this.currentLife <= 0) {
      this.isDeadFlag = true;
    }
  }

  die(): void {
    if (this.isDeadFlag) return;
    
    this.currentLife = 0;
    this.isDeadFlag = true;
  }
}
