import { query } from '../../config/db.js';

export async function listLocations() {
  const { rows } = await query(
    'SELECT id, slug, name, description FROM locations ORDER BY id'
  );
  return rows;
}

export async function getLocationBySlug(slug) {
  const { rows } = await query(
    'SELECT id, slug, name, description, panorama_url FROM locations WHERE slug = $1',
    [slug]
  );
  const location = rows[0];
  if (!location) return null;

  const [photos, links] = await Promise.all([
    query(
      'SELECT id, url, kind, year FROM location_photos WHERE location_id = $1 ORDER BY year NULLS LAST, id',
      [location.id]
    ),
    query(
      `SELECT l.id, l.yaw, l.pitch, t.slug AS to_slug, t.name AS to_name
       FROM location_links l
       JOIN locations t ON t.id = l.to_location_id
       WHERE l.from_location_id = $1`,
      [location.id]
    ),
  ]);

  return { ...location, photos: photos.rows, links: links.rows };
}