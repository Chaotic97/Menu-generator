import { Router } from 'express';
import { isEnabled, getDishes, getDishesWithTag, getTags } from '../services/platestack.js';

const router = Router();

// Check if PlateStack integration is enabled
router.get('/status', (req, res) => {
  res.json({ enabled: isEnabled() });
});

// Get all dishes, optionally filtered by tag
router.get('/dishes', (req, res) => {
  const { tag } = req.query;
  const dishes = tag ? getDishesWithTag(tag) : getDishes();
  res.json(dishes);
});

// Get all tags
router.get('/tags', (req, res) => {
  const tags = getTags();
  res.json(tags);
});

export default router;
