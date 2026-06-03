import { Pool } from '@neondatabase/serverless'

let pool

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

export async function query(text, values = []) {
  const client = await getPool().connect()
  try {
    return await client.query(text, values)
  } finally {
    client.release()
  }
}

export async function ensureUserProfile({
  authUserId,
  email = null,
  name = null,
  currentLevel = 'N5',
  targetExam = 'JLPT',
  targetLevel = 'N3',
}) {
  if (!authUserId) {
    throw new Error('authUserId is required')
  }

  const result = await query(
    `insert into user_profiles (auth_user_id, email, name, current_level, target_exam, target_level, updated_at)
     values ($1, $2, $3, $4, $5, $6, now())
     on conflict (auth_user_id) do update
     set email = coalesce(excluded.email, user_profiles.email),
         name = coalesce(excluded.name, user_profiles.name),
         updated_at = now()
     returning *`,
    [authUserId, email, name, currentLevel, targetExam, targetLevel]
  )

  return result.rows[0]
}
