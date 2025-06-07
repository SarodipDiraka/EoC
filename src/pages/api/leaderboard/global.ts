import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const result = await query(
                `SELECT entry_name, stage, score, date 
                 FROM user_scores
                 ORDER BY score DESC 
                 LIMIT 10`
            );

            return res.status(200).json(result.rows);
        } catch (error) {
            console.error('Error fetching global leaderboard:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    } else {
        return res.status(405).json({ message: 'Method not allowed' });
    }
}
