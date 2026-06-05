import { Router } from 'express';
import { query } from '../db/connection';
import { estimateValue } from '../services/estimator';
import { insertEstimate, listEstimatesForItem, getLatestEstimate } from '../services/estimates';

const router = Router();

// List all items
router.get('/', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM items ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
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
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create item (auto-estimates value on save)
router.post('/', async (req, res) => {
  try {
    const {
      year, make, model, vin, miles, location_address, seller_account_number,
      data_capture_status, title_received, seller_name_matches, lien_search,
      clean_title_check, odometer_reading_check, review_status, published
    } = req.body;

    const result = await query(
      `INSERT INTO items (
        year, make, model, vin, miles, location_address, seller_account_number,
        data_capture_status, title_received, seller_name_matches, lien_search,
        clean_title_check, odometer_reading_check, review_status, published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        year, make, model, vin, miles, location_address, seller_account_number,
        data_capture_status, title_received, seller_name_matches, lien_search,
        clean_title_check, odometer_reading_check, review_status, published
      ]
    );

    const item = result.rows[0];

    // Try to estimate value — best-effort, don't fail item creation if it errors
    let estimate = null;
    try {
      const estimateResult = await estimateValue({
        year: item.year,
        make: item.make,
        model: item.model,
        mileage: item.miles,
        location: item.location_address,
      });
      estimate = await insertEstimate(item.id, estimateResult);
    } catch (estErr) {
      console.error('Estimate failed for item', item.id, estErr);
    }

    res.status(201).json({ ...item, estimate });
  } catch (error) {
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
    res.json(result.rows[0]);
  } catch (error) {
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
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
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
    res.json(result.rows[0]);
  } catch (error) {
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
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to unpublish item' });
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
    res.status(500).json({ error: 'Failed to delete item' });
  }
});


// Manual re-estimate
router.post('/:id/estimates', async (req, res) => {
  try {
    const itemResult = await query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    const item = itemResult.rows[0];

    const estimateResult = await estimateValue({
      year: item.year,
      make: item.make,
      model: item.model,
      mileage: item.miles,
      location: item.location_address,
    });
    const estimate = await insertEstimate(item.id, estimateResult);

    res.status(201).json(estimate);
  } catch (error) {
    console.error('Re-estimate failed', error);
    res.status(500).json({ error: 'Failed to create estimate' });
  }
});

// List all estimates for an item (history)
router.get('/:id/estimates', async (req, res) => {
  try {
    const estimates = await listEstimatesForItem(req.params.id);
    res.json(estimates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch estimates' });
  }
});

// Get latest estimate for an item
router.get('/:id/estimates/latest', async (req, res) => {
  try {
    const estimate = await getLatestEstimate(req.params.id);
    if (!estimate) {
      return res.status(404).json({ error: 'No estimate found' });
    }
    res.json(estimate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch estimate' });
  }
});




export default router;
