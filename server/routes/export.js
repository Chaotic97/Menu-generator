import { Router } from 'express';

const router = Router();

// PDF export placeholder
router.post('/:id/pdf', (req, res) => {
  res.status(501).json({ message: 'PDF export not yet implemented' });
});

export default router;
