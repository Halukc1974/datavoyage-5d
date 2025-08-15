// Lightweight test runner to exercise createDynamicTable path
// Usage: DATABASE_URL='postgres://user:pass@host:5432/db' node scripts/test-create-table.js

const { DatabaseService } = require('../lib/database')

async function run() {
  try {
    // Create a temporary dynamic table metadata row to exercise the createDynamicTable logic
    const table = {
      sidebar_item_id: -1,
      table_name: `test_table_${Date.now()}`,
      display_name: `Test Table ${Date.now()}`,
      description: 'Temporary test table created by script',
    }

    const created = await DatabaseService.createDynamicTable(table)
    console.log('createDynamicTable result:', created)
    process.exit(0)
  } catch (e) {
    console.error('Error running create test:', e)
    process.exit(1)
  }
}

run()
