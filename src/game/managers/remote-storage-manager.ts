import { GameSettings, HighScoreRecord } from '../types/interfaces';

export class RemoteStorageManager {
    private static token: string | null = null;
    private static userId: string | null = null;
    private static username: string | null = null;
    private static syncEnabled: boolean = localStorage.getItem('isSyncing') === 'true';

    static initialize(token: string, userId: string, username: string) {
        this.token = token;
        this.userId = userId;
        this.username = username;
    }

    static enableSync() {
        this.syncEnabled = true;
    }

    static disableSync() {
        this.syncEnabled = false;
    }

    static isSyncEnabled(): boolean {
        return this.syncEnabled;
    }

    static getUsername(): string | null {
        return this.username || localStorage.getItem('username');
    }

    private static get headers(): HeadersInit {
        return {
            'Content-Type': 'application/json',
            ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
        };
    }

    static async checkConnection(): Promise<boolean> {
        try {
            const response = await fetch('/api/game/ping');
            if (!response.ok) {
                this.disableSync();
                return false;
            }
            const data = await response.json();
            if (data.ok === true) {
                return true;
            } else {
                this.disableSync();
                return false;
            }
        } catch (err) {
            console.error('Ping fetch error:', err);
            this.disableSync();
            return false;
        }
    }

    static isLoggedIn(): boolean {
        return !!(this.token && this.userId);
    }


    static async isDbConnected(): Promise<boolean> {
        return await this.checkConnection();
    }


    private static async get<T>(url: string): Promise<T | null> {
        if (!this.syncEnabled || !this.token) return null;
        try {
            const response = await fetch(url, { headers: this.headers });
            if (!response.ok) throw new Error(`GET ${url} failed`);
            return await response.json();
        } catch (error) {
            console.error(`${url} fetch error:`, error);
            this.disableSync();
            return null;
        }
    }

    private static async post<T>(url: string, body: any): Promise<T | null> {
        if (!this.syncEnabled || !this.token) return null;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(body)
            });
            if (!response.ok) throw new Error(`POST ${url} failed`);
            return await response.json();
        } catch (error) {
            console.error(`${url} post error:`, error);
            return null;
        }
    }

    static async loadSettings(): Promise<GameSettings | null> {
        try {
            const response = await fetch('/api/game/settings', {
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Если сервер вернул localMode, значит БД недоступна
            if (data.localMode) {
                this.disableSync();
                return null;
            }

            // Валидация полученных данных
            if (typeof data.sound_volume !== 'number' || 
                typeof data.music_volume !== 'number' ||
                typeof data.fps !== 'boolean' ||
                !['wide', 'laser', 'rockets'].includes(data.shot_type)) {
                throw new Error('Invalid settings format received from server');
            }

            return {
                musicVolume: data.music_volume,
                sfxVolume: data.sound_volume,
                showFPS: data.fps,
                weaponType: data.shot_type
            };
        } catch (error) {
            console.error('Failed to load settings from server:', error);
            this.disableSync();
            return null;
        }
    }

    static async saveSettings(settings: GameSettings): Promise<boolean> {
        try {
            const response = await fetch('/api/game/settings', {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    sound_volume: settings.sfxVolume,
                    music_volume: settings.musicVolume,
                    shot_type: settings.weaponType,
                    fps: settings.showFPS
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.success === true;
        } catch (error) {
            console.error('Failed to save settings to server:', error);
            return false;
        }
    }

    static async loadHighScores(): Promise<HighScoreRecord[] | null> {
        const data = await this.get<any[]>('/api/game/scores');
        if (!data) return null;

        return data.map(item => ({
            name: item.entry_name,
            score: item.score,
            level: item.stage,
            date: item.date
        }));
    }

    static async addHighScore(record: Omit<HighScoreRecord, 'date'>): Promise<HighScoreRecord[] | null> {
        const body = {
            entry_name: record.name,
            stage: record.level,
            score: record.score
        };

        const data = await this.post<any[]>('/api/game/scores', body);
        if (!data) return null;

        return data.map(item => ({
            name: item.entry_name,
            score: item.score,
            level: item.stage,
            date: item.date
        }));
    }

    private static async delete(url: string): Promise<any> {
        if (!this.syncEnabled || !this.token) return null;
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.headers
            });
            if (!response.ok) throw new Error(`DELETE ${url} failed`);
            return await response.json();
        } catch (error) {
            console.error(`${url} delete error:`, error);
            return null;
        }
    }


    static async clearHighScores(): Promise<void> {
        await this.delete('/api/game/scores');
    }

    // Получить топ-10 рекордов с сервера
    static async loadGlobalLeaderboard(): Promise<HighScoreRecord[] | null> {
        try {
            const response = await fetch('/api/leaderboard/global');
            if (!response.ok) throw new Error('Failed to fetch global leaderboard');
            const data = await response.json();
            return data.map((item: any) => ({
                name: item.entry_name,
                score: item.score,
                level: item.stage,
                date: item.date,
            }));
        } catch (error) {
            console.error('Error loading global leaderboard:', error);
            return null;
        }
    }

}
