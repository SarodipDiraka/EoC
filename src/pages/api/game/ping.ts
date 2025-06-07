import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            await query('SELECT 1'); // проверка соединения с БД
            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error('Database ping failed:', error);
            return res.status(503).json({ ok: false, message: 'Database unavailable' });
        }
    }
    return res.status(405).json({ message: 'Method not allowed' });
}
