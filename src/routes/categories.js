const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY parent_id NULLS FIRST, name ASC');
    const all = result.rows;

    const mainCategories = all.filter((c) => c.parent_id === null);
    const withChildren = mainCategories.map((main) => ({
      ...main,
      subcategories: all.filter((c) => c.parent_id === main.id),
    }));

    res.json(withChildren);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
