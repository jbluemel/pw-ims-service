import { Router } from 'express';
import { query } from '../db/connection';
import { publishItemEvent } from '../nats/publisher';

const router = Router();

// List all items
router.get('/', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM items ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('List items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create item
router.post('/', async (req, res) => {
  try {
    const {
      year, make, model, vin, miles, location_address, seller_account_number,
      data_capture_status, title_received, seller_name_matches, lien_search,
      clean_title_check, odometer_reading_check, review_status, published,
      universal_id, origin_system, icn
    } = req.body;

    const result = await query(
      `INSERT INTO items (
        year, make, model, vin, miles, location_address, seller_account_number,
        data_capture_status, title_received, seller_name_matches, lien_search,
        clean_title_check, odometer_reading_check, review_status, published,
        universal_id, origin_system, icn
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        year, make, model, vin, miles, location_address, seller_account_number,
        data_capture_status, title_received, seller_name_matches, lien_search,
        clean_title_check, odometer_reading_check, review_status, published,
        universal_id || null, origin_system || 'IMS', icn
      ]
    );

    const item = result.rows[0];
    publishItemEvent('ITEM_CREATED', item);

    res.status(201).json(item);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update item
router.put('/:id', async (req, res) => {
  try {
    const {
      year, make, model, vin, miles, location_address, seller_account_number,
      data_capture_status, title_received, seller_name_matches, lien_search,
      clean_title_check, odometer_reading_check, review_status, published
    } = req.body;

    const result = await query(
      `UPDATE items SET
        year = $1, make = $2, model = $3, vin = $4, miles = $5,
        location_address = $6, seller_account_number = $7,
        data_capture_status = $8, title_received = $9, seller_name_matches = $10,
        lien_search = $11, clean_title_check = $12, odometer_reading_check = $13,
        review_status = $14, published = $15, updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *`,
      [
        year, make, model, vin, miles, location_address, seller_account_number,
        data_capture_status, title_received, seller_name_matches, lien_search,
        clean_title_check, odometer_reading_check, review_status, published,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = result.rows[0];
    publishItemEvent('ITEM_UPDATED', item);

    res.json(item);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Partial update item
router.patch('/:id', async (req, res) => {
  try {
    const fields = Object.keys(req.body);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    const values = fields.map(field => req.body[field]);

    const result = await query(
      `UPDATE items SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = result.rows[0];
    publishItemEvent('ITEM_UPDATED', item);

    res.json(item);
  } catch (error) {
    console.error('Patch item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM items WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Publish item
router.post('/:id/publish', async (req, res) => {
  try {
    const result = await query(
      `UPDATE items SET published = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = result.rows[0];
    publishItemEvent('ITEM_PUBLISHED', item);

    res.json(item);
  } catch (error) {
    console.error('Publish item error:', error);
    res.status(500).json({ error: 'Failed to publish item' });
  }
});

// Unpublish item
router.post('/:id/unpublish', async (req, res) => {
  try {
    const result = await query(
      `UPDATE items SET published = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = result.rows[0];
    publishItemEvent('ITEM_UNPUBLISHED', item);

    res.json(item);
  } catch (error) {
    console.error('Unpublish item error:', error);
    res.status(500).json({ error: 'Failed to unpublish item' });
  }
});

export default router;