import type { NextApiRequest, NextApiResponse } from "next";

// Minimal API route to ensure pages-manifest is generated in mixed app/pages builds
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ ok: true });
}

