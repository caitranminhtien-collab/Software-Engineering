"use strict";

const fixture = require("./fixture.cjs");

async function prepareFixture(write) {
  const staff = await write(
    `INSERT INTO public.staff_accounts
       (email, password_hash, full_name, role, is_active)
     VALUES ($1, $2, $3, 'editor', FALSE)
     RETURNING staff_id`,
    [
      "be08-fixture@example.invalid",
      "not-a-login-hash",
      "BE08 Synthetic Fixture",
    ],
    "fixture staff account"
  );
  const staffId = staff.rows[0].staff_id;
  const attractionIds = [];

  for (const attraction of fixture.attractions) {
    const result = await write(
      `INSERT INTO public.attractions
         (slug, area_code, latitude, longitude, status,
          created_by, approved_by, published_at)
       VALUES ($1, 'BE08_TEST', $2, $3, 'published', $4, $4, NOW())
       RETURNING attraction_id`,
      [
        attraction.slug,
        attraction.latitude,
        attraction.longitude,
        staffId,
      ],
      `fixture attraction ${attraction.slug}`
    );
    const attractionId = result.rows[0].attraction_id;
    attractionIds.push(attractionId);

    await write(
      `INSERT INTO public.attraction_localizations
         (attraction_id, language_code, name, description,
          source_references, status, approved_by, published_at)
       VALUES ($1, 'vi', $2, 'Synthetic BE08 content', '[]',
               'published', $3, NOW())`,
      [attractionId, attraction.name, staffId],
      `fixture localization ${attraction.slug}`
    );
  }

  const route = await write(
    `INSERT INTO public.routes
       (slug, name_vi, description_vi, area_code, estimated_minutes,
        verified_at, status, created_by, approved_by, published_at)
     VALUES ($1, 'BE08 Walking Route', 'Synthetic BE08 route',
             'BE08_TEST', 60, NOW(), 'published', $2, $2, NOW())
     RETURNING route_id`,
    [fixture.routeSlug, staffId],
    "fixture route"
  );

  for (const [index, attractionId] of attractionIds.entries()) {
    await write(
      `INSERT INTO public.route_stops
         (route_id, attraction_id, stop_order,
          visit_minutes, travel_minutes_from_previous)
       VALUES ($1, $2, $3, 20, $4)`,
      [route.rows[0].route_id, attractionId, index + 1, index * 5],
      `fixture stop ${index + 1}`
    );
  }

  const mediaPath =
    `/uploads/media/${attractionIds[0]}/${fixture.mediaName}`;

  await write(
    `INSERT INTO public.attraction_media
       (attraction_id, media_type, file_url, credit, rights_reference,
        status, approved_by, published_at)
     VALUES ($1, 'image', $2, 'BE08 synthetic pixel', 'Test fixture',
             'published', $3, NOW())`,
    [attractionIds[0], mediaPath, staffId],
    "fixture media"
  );

  return mediaPath;
}

module.exports = { prepareFixture };
