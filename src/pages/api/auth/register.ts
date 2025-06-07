import { NextApiRequest, NextApiResponse } from 'next';
import { hash } from 'bcryptjs';
import { query } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { username, password } = req.body;

    try {
        // Проверка существования пользователя
        const userExists = await query('SELECT id FROM users WHERE username = $1', [username]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Хеширование пароля
        const hashedPassword = await hash(password, 12);

        // Создание пользователя
        const result = await query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
            [username, hashedPassword]
        );

        const userId = result.rows[0].id;

        // Создание настроек по умолчанию
        await query(
            'INSERT INTO user_settings (user_id) VALUES ($1)',
            [userId]
        );

        return res.status(201).json({ success: true, userId });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}