// Direct PG create table script (uses node-postgres)
// Usage: DATABASE_URL='postgresql://user:pass@host:5432/db' node scripts/create-physical-table.js

const { Client } = require('pg')

function sanitizeIdentifier(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
}

async function run() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('Please set DATABASE_URL environment variable')
    process.exit(2)
  }

  const client = new Client({ connectionString: dbUrl })
  try {
    await client.connect()
    const safeName = sanitizeIdentifier(`test_table_${Date.now()}`)
    const createSql = `CREATE TABLE IF NOT EXISTS ${safeName} (\n  id serial primary key,\n  created_at timestamptz default now(),\n  updated_at timestamptz default now(),\n  row_data jsonb\n);`
    console.log('Running SQL for table:', safeName)
    const res = await client.query(createSql)
    console.log('CREATE TABLE succeeded')
  } catch (e) {
    console.error('CREATE TABLE failed:', e)
  } finally {
    try { await client.end() } catch (e) {}
  }
}

run()
