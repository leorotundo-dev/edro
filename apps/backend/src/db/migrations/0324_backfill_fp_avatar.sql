-- Backfill freelancer_profiles.avatar_url from people table.
-- After this, fp.avatar_url is the single source of truth for internal collaborator avatars.

UPDATE freelancer_profiles fp
SET avatar_url = COALESCE(
  -- Path 1: direct person_id link
  (SELECT p.avatar_url FROM people p WHERE p.id = fp.person_id AND p.avatar_url IS NOT NULL),
  -- Path 2: via person_identities (edro_user_id)
  (SELECT p.avatar_url
     FROM people p
     JOIN person_identities pi ON pi.person_id = p.id
     JOIN edro_users eu ON eu.id = fp.user_id
    WHERE pi.identity_type = 'edro_user_id'
      AND pi.normalized_value = LOWER(eu.id::text)
      AND p.avatar_url IS NOT NULL
    LIMIT 1)
)
WHERE fp.avatar_url IS NULL;
