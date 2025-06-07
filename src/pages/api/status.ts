import { NextApiRequest, NextApiResponse } from "next";
import { isDbConnected } from "../../../lib/db";



export default function handler(req: NextApiRequest, res: NextApiResponse) {
    res.status(200).json({ dbConnected: isDbConnected() });
}