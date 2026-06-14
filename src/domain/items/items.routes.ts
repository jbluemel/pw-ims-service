import { Router } from 'express';
import { query } from '../../db/connection';
import { estimateValue } from '../ai/estimator';
import { insertEstimate, listEstimatesForItem, getLatestEstimate } from './estimates';
import { extractFromText } from '../ai/extractor';
import { generateUniqueIcn } from './icn';
import { requestAppraisal } from './pwasClient';
import { logger } from '../../lib/logger';

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
      clean_title_check, odometer_reading_check, review_status, published,
      appraisal_requested
    } = req.body;

    const result = await query(
      `INSERT INTO items (
        icn, year, make, model, vin, miles, location_address, seller_account_number,
        data_capture_status, title_received, seller_name_matches, lien_search,
        clean_title_check, odometer_reading_check, review_status, published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        await generateUniqueIcn(),
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
      estimate = await insertEstimate(item.id, estimateResult, item);
    } catch (estErr) {
      logger.error({ err: estErr, itemId: item.id }, 'Estimate failed for item');
    }

    // If flagged, request an appraisal from PWAS — best-effort, don't fail creation.
    if (appraisal_requested) {
      try {
        await requestAppraisal(item);
      } catch (pwasErr) {
        logger.error({ err: pwasErr, itemId: item.id }, 'PWAS appraisal request failed');
      }
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
    const estimate = await insertEstimate(item.id, estimateResult, item);

    res.status(201).json(estimate);
  } catch (error) {
    logger.error({ err: error }, 'Re-estimate failed');
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





// Create item from unstructured text — extract, save, estimate
router.post('/from-text', async (req, res) => {
  try {
    const { raw_text } = req.body;

    if (!raw_text || typeof raw_text !== 'string' || raw_text.trim().length === 0) {
      return res.status(400).json({ error: 'raw_text is required' });
    }

    let extracted;
    try {
      extracted = await extractFromText(raw_text);
    } catch (extractErr) {
      logger.error({ err: extractErr }, 'Extraction failed');
      return res.status(500).json({ error: 'Failed to extract data from text' });
    }

    const result = await query(
      `INSERT INTO items (
        icn, year, make, model, vin, miles, location_address,
        raw_text, extra_attributes,
        data_capture_status, review_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        await generateUniqueIcn(),
        extracted.year,
        extracted.make,
        extracted.model,
        extracted.vin,
        extracted.miles,
        extracted.location_address,
        raw_text,
        JSON.stringify(extracted.extra_attributes),
        'todo',
        'todo',
      ]
    );

    const item = result.rows[0];

    let estimate = null;
    try {
      const estimateResult = await estimateValue({
        year: item.year,
        make: item.make,
        model: item.model,
        mileage: item.miles,
        location: item.location_address,
        extra_attributes: extracted.extra_attributes,
      });
      estimate = await insertEstimate(item.id, estimateResult, item);
    } catch (estErr) {
      logger.error({ err: estErr, itemId: item.id }, 'Estimate failed for item');
    }

    res.status(201).json({ item, extracted, estimate });
  } catch (error) {
    logger.error({ err: error }, 'from-text failed');
    res.status(500).json({ error: 'Failed to create item from text' });
  }
});

// Update an existing item by re-extracting from edited text (no estimate)
router.put('/:id/from-text', async (req, res) => {
  try {
    const { raw_text } = req.body;

    if (!raw_text || typeof raw_text !== 'string' || raw_text.trim().length === 0) {
      return res.status(400).json({ error: 'raw_text is required' });
    }

    let extracted;
    try {
      extracted = await extractFromText(raw_text);
    } catch (extractErr) {
      logger.error({ err: extractErr }, 'Extraction failed');
      return res.status(500).json({ error: 'Failed to extract data from text' });
    }

    const result = await query(
      `UPDATE items SET
        year = $1,
        make = $2,
        model = $3,
        vin = $4,
        miles = $5,
        location_address = $6,
        raw_text = $7,
        extra_attributes = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *`,
      [
        extracted.year,
        extracted.make,
        extracted.model,
        extracted.vin,
        extracted.miles,
        extracted.location_address,
        raw_text,
        JSON.stringify(extracted.extra_attributes),
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = result.rows[0];
    res.json({ item, extracted });
  } catch (error) {
    logger.error({ err: error }, 'update from-text failed');
    res.status(500).json({ error: 'Failed to update item from text' });
  }
});

export default router;
