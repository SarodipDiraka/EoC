import { RemoteStorageManager } from "../managers/remote-storage-manager";

export class AuthScene extends Phaser.Scene {
    private loginForm!: Phaser.GameObjects.DOMElement;
    private registerForm!: Phaser.GameObjects.DOMElement;
    private currentForm: 'login' | 'register' = 'login';

    private menuItems: Phaser.GameObjects.Text[] = [];

    constructor() {
        super('AuthScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');

        this.createLoginForm();
        this.createRegisterForm();
        this.showCurrentForm();

        // Центрирование форм
        this.loginForm.setOrigin(0.5);
        this.registerForm.setOrigin(0.5);

        // Массив кнопок меню
        this.menuItems = [];

        // Меню кнопок в стиле MainMenu
        const centerX = this.cameras.main.width / 2;
        const startY = this.cameras.main.height - 120; // чуть выше низа

        // Кнопка переключения формы
        const switchText = this.createMenuItem(
            centerX, startY,
            this.currentForm === 'login' ? 'Switch to Register' : 'Switch to Login',
            () => {
                this.currentForm = this.currentForm === 'login' ? 'register' : 'login';
                switchText.setText(this.currentForm === 'login' ? 'Switch to Register' : 'Switch to Login');
                this.showCurrentForm();
            }
        );
        this.menuItems.push(switchText);

        // Кнопка возврата, под кнопкой переключения (отступ 50px)
        const backText = this.createMenuItem(
            centerX, startY + 50,
            'Back',
            () => this.scene.start('OptionsScene')
        );
        this.menuItems.push(backText);

    }

    private createMenuItem(x: number, y: number, text: string, action: () => void): Phaser.GameObjects.Text {
        const menuItem = this.add.text(
            x,
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
            menuItem.setColor('#ffff00');
            menuItem.setScale(1.1);
        });

        menuItem.on('pointerout', () => {
            menuItem.setColor('#ffffff');
            menuItem.setScale(1.0);
        });

        menuItem.on('pointerdown', action);

        return menuItem;
    }

    private showCurrentForm() {
        this.loginForm.setVisible(this.currentForm === 'login');

        this.registerForm.setVisible(this.currentForm === 'register');
    }

    private createLoginForm() {
        this.loginForm = this.add.dom(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 50
        ).createFromCache('loginForm');
        
        this.loginForm.addListener('click');
        this.loginForm.on('click', (event: any) => {
            if (event.target.name === 'loginButton') {
                const username = (this.loginForm.getChildByName('username') as HTMLInputElement).value;
                const password = (this.loginForm.getChildByName('password') as HTMLInputElement).value;
                
                this.handleLogin(username, password);
            }
        });
    }

    private createRegisterForm() {
        this.registerForm = this.add.dom(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 50
        ).createFromCache('registerForm');
        
        this.registerForm.addListener('click');
        this.registerForm.on('click', (event: any) => {
            if (event.target.name === 'registerButton') {
                const username = (this.registerForm.getChildByName('username') as HTMLInputElement).value;
                const password = (this.registerForm.getChildByName('password') as HTMLInputElement).value;
                const confirmPassword = (this.registerForm.getChildByName('confirmPassword') as HTMLInputElement).value;
                
                if (password !== confirmPassword) {
                    alert('Passwords do not match!');
                    return;
                }
                
                this.handleRegister(username, password);
            }
        });
    }

    private async handleLogin(username: string, password: string) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                RemoteStorageManager.initialize(data.token, data.userId, data.username);
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('username', data.username);
                alert('Login successful!');
                this.scene.start('OptionsScene');
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login');
        }
    }

    private async handleRegister(username: string, password: string) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('Registration successful! Please login.');
                this.currentForm = 'login';
                this.showCurrentForm();
            } else {
                alert(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('An error occurred during registration');
        }
    }
}