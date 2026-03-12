import { Router } from 'express';
import { isEnabled, getDishes, getDishesWithTag, getTags } from '../services/platestack.js';

const router = Router();

// Check if PlateStack integration is enabled
router.get('/status', (req, res, next) => {
  try {
    res.json({ enabled: isEnabled() });
  } catch (err) {
    next(err);
  }
});

// Get all dishes, optionally filtered by tag
router.get('/dishes', (req, res, next) => {
  try {
    const { tag } = req.query;
    const dishes = tag ? getDishesWithTag(tag) : getDishes();
    res.json(dishes);
  } catch (err) {
    next(err);
  }
});

// Get all tags
router.get('/tags', (req, res, next) => {
  try {
    const tags = getTags();
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

export default router;
