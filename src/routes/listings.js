const express = require('express');
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// GET all listings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, seller_id, category_id, title, description, price, address,
        is_featured, status, created_at,
        ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude
      FROM listings
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET nearby listings
router.get('/nearby', async (req, res) => {
  const { lat, lng, radius_km } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }
  const radius = radius_km || 5;
  try {
    const result = await pool.query(`
      SELECT 
        id, title, description, price, address,
        ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude,
        ROUND((ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000)::numeric, 2) AS distance_km
      FROM listings
      WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3 * 1000)
      ORDER BY distance_km ASC
    `, [lng, lat, radius]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET single listing by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        id, seller_id, category_id, title, description, price, address,
        is_featured, status, created_at,
        ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude
      FROM listings
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE a listing (requires login + seller role)
router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Only sellers can create listings' });
  }

  const { category_id, title, description, price, latitude, longitude, address } = req.body;
  const seller_id = req.user.id;

  if (!title || !price || !latitude || !longitude) {
    return res.status(400).json({ error: 'title, price, latitude, and longitude are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO listings (seller_id, category_id, title, description, price, location, address)
       VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326), $8)
       RETURNING id, title, description, price, address, created_at`,
      [seller_id, category_id || null, title, description || null, price, longitude, latitude, address || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
