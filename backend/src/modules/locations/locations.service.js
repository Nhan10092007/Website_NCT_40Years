import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

/**
 * Tìm địa điểm theo ID số hoặc Slug
 */
export async function resolveLocation(identifier) {
  const isNumeric = /^\d+$/.test(String(identifier));
  let res;

  if (isNumeric) {
    res = await query(
      'SELECT id, slug, name, description, panorama_url, created_at FROM locations WHERE id = $1',
      [Number(identifier)]
    );
  } else {
    res = await query(
      'SELECT id, slug, name, description, panorama_url, created_at FROM locations WHERE slug = $1',
      [String(identifier).trim()]
    );
  }

  return res.rows[0] ?? null;
}

/**
 * Lấy danh sách tất cả các địa điểm kèm theo số liệu thống kê (likes, checkins, memories)
 */
export async function listLocations(currentUserId = null) {
  const sql = `
    SELECT
      l.id,
      l.slug,
      l.name,
      l.description,
      l.panorama_url,
      l.created_at,
      COUNT(DISTINCT c.user_id)::int AS checkin_count,
      COUNT(DISTINCT ll.user_id)::int AS like_count,
      COUNT(DISTINCT lp.id)::int AS photo_count,
      COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'approved')::int AS memory_count
      ${
        currentUserId
          ? `,
        BOOL_OR(c.user_id = $1) AS has_checked_in,
        BOOL_OR(ll.user_id = $1) AS has_liked`
          : `,
        FALSE AS has_checked_in,
        FALSE AS has_liked`
      }
    FROM locations l
    LEFT JOIN checkins c ON c.location_id = l.id
    LEFT JOIN location_likes ll ON ll.location_id = l.id
    LEFT JOIN location_photos lp ON lp.location_id = l.id
    LEFT JOIN memories m ON m.location_id = l.id
    GROUP BY l.id
    ORDER BY l.id ASC
  `;

  const params = currentUserId ? [currentUserId] : [];
  const { rows } = await query(sql, params);
  return rows;
}

/**
 * Lấy chi tiết 1 địa điểm theo Slug hoặc ID kèm ảnh cũ/mới, liên kết 360 và tương tác
 */
export async function getLocationByIdentifier(identifier, currentUserId = null) {
  const location = await resolveLocation(identifier);
  if (!location) return null;

  const [photosRes, linksRes, statsRes, userStatusRes] = await Promise.all([
    query(
      `SELECT id, url, kind, year
       FROM location_photos
       WHERE location_id = $1
       ORDER BY year ASC NULLS LAST, id ASC`,
      [location.id]
    ),
    query(
      `SELECT l.id, l.yaw, l.pitch, t.id AS to_id, t.slug AS to_slug, t.name AS to_name
       FROM location_links l
       JOIN locations t ON t.id = l.to_location_id
       WHERE l.from_location_id = $1
       ORDER BY l.id ASC`,
      [location.id]
    ),
    query(
      `SELECT
         COUNT(DISTINCT c.user_id)::int AS checkin_count,
         COUNT(DISTINCT ll.user_id)::int AS like_count,
         COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'approved')::int AS memory_count
       FROM locations l
       LEFT JOIN checkins c ON c.location_id = l.id
       LEFT JOIN location_likes ll ON ll.location_id = l.id
       LEFT JOIN memories m ON m.location_id = l.id
       WHERE l.id = $1
       GROUP BY l.id`,
      [location.id]
    ),
    currentUserId
      ? Promise.all([
          query('SELECT 1 FROM checkins WHERE location_id = $1 AND user_id = $2', [
            location.id,
            currentUserId,
          ]),
          query('SELECT 1 FROM location_likes WHERE location_id = $1 AND user_id = $2', [
            location.id,
            currentUserId,
          ]),
        ])
      : Promise.resolve([{ rows: [] }, { rows: [] }]),
  ]);

  const allPhotos = photosRes.rows;
  const oldPhotos = allPhotos.filter((p) => p.kind === 'old');
  const currentPhotos = allPhotos.filter((p) => p.kind === 'current');

  const stats = statsRes.rows[0] || { checkin_count: 0, like_count: 0, memory_count: 0 };
  const hasCheckedIn = (userStatusRes[0]?.rows?.length ?? 0) > 0;
  const hasLiked = (userStatusRes[1]?.rows?.length ?? 0) > 0;

  return {
    ...location,
    stats,
    userStatus: {
      hasCheckedIn,
      hasLiked,
    },
    photos: {
      all: allPhotos,
      old: oldPhotos,
      current: currentPhotos,
    },
    links: linksRes.rows,
  };
}

/**
 * Thêm mới địa điểm (Dành cho Admin)
 */
export async function createLocation({ slug, name, description, panoramaUrl }) {
  try {
    const { rows } = await query(
      `INSERT INTO locations (slug, name, description, panorama_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, slug, name, description, panorama_url, created_at`,
      [slug, name, description || null, panoramaUrl || '/panos/test.jpg']
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(`Slug "${slug}" đã tồn tại trên hệ thống`, 409);
    }
    throw err;
  }
}

/**
 * Cập nhật địa điểm
 */
export async function updateLocation(identifier, fields) {
  const location = await resolveLocation(identifier);
  if (!location) {
    throw new AppError('Địa điểm không tồn tại', 404);
  }

  const updates = [];
  const params = [];

  if (fields.name !== undefined) {
    params.push(fields.name);
    updates.push(`name = $${params.length}`);
  }
  if (fields.slug !== undefined) {
    params.push(fields.slug);
    updates.push(`slug = $${params.length}`);
  }
  if (fields.description !== undefined) {
    params.push(fields.description);
    updates.push(`description = $${params.length}`);
  }
  if (fields.panoramaUrl !== undefined) {
    params.push(fields.panoramaUrl);
    updates.push(`panorama_url = $${params.length}`);
  }

  if (updates.length === 0) {
    return location;
  }

  params.push(location.id);
  const sql = `
    UPDATE locations
    SET ${updates.join(', ')}
    WHERE id = $${params.length}
    RETURNING id, slug, name, description, panorama_url, created_at
  `;

  try {
    const { rows } = await query(sql, params);
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(`Slug "${fields.slug}" đã bị trùng lặp`, 409);
    }
    throw err;
  }
}

/**
 * Xóa địa điểm
 */
export async function deleteLocation(identifier) {
  const location = await resolveLocation(identifier);
  if (!location) {
    throw new AppError('Địa điểm không tồn tại', 404);
  }

  await query('DELETE FROM locations WHERE id = $1', [location.id]);
  return location;
}

/**
 * Thêm ảnh tư liệu (xưa hoặc nay) vào địa điểm
 */
export async function addPhotoToLocation(identifier, { url, kind, year }) {
  const location = await resolveLocation(identifier);
  if (!location) {
    throw new AppError('Địa điểm không tồn tại', 404);
  }

  const { rows } = await query(
    `INSERT INTO location_photos (location_id, url, kind, year)
     VALUES ($1, $2, $3, $4)
     RETURNING id, location_id, url, kind, year`,
    [location.id, url, kind, year || null]
  );

  return rows[0];
}

/**
 * Xóa ảnh tư liệu
 */
export async function deletePhoto(photoId) {
  const { rows } = await query(
    'DELETE FROM location_photos WHERE id = $1 RETURNING id, location_id',
    [photoId]
  );
  return rows[0] ?? null;
}

/**
 * Thêm liên kết 360° (Hotspot di chuyển)
 */
export async function addLinkBetweenLocations(fromIdentifier, { toLocationId, yaw, pitch }) {
  const fromLocation = await resolveLocation(fromIdentifier);
  if (!fromLocation) {
    throw new AppError('Địa điểm xuất phát không tồn tại', 404);
  }

  const toLocation = await resolveLocation(toLocationId);
  if (!toLocation) {
    throw new AppError('Địa điểm đích không tồn tại', 404);
  }

  if (fromLocation.id === toLocation.id) {
    throw new AppError('Không thể tạo liên kết đến chính địa điểm này', 400);
  }

  try {
    const { rows } = await query(
      `INSERT INTO location_links (from_location_id, to_location_id, yaw, pitch)
       VALUES ($1, $2, $3, $4)
       RETURNING id, from_location_id, to_location_id, yaw, pitch`,
      [fromLocation.id, toLocation.id, yaw, pitch]
    );

    return {
      ...rows[0],
      to_slug: toLocation.slug,
      to_name: toLocation.name,
    };
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError('Liên kết giữa hai địa điểm này đã tồn tại', 409);
    }
    throw err;
  }
}

/**
 * Xóa liên kết 360°
 */
export async function deleteLink(linkId) {
  const { rows } = await query(
    'DELETE FROM location_links WHERE id = $1 RETURNING id',
    [linkId]
  );
  return rows[0] ?? null;
}