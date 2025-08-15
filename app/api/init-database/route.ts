import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { createClient } = await import("@supabase/supabase-js")

    const supabaseUrl = "https://xtsczsqpetyumpkawiwl.supabase.co"
    const supabaseKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0c2N6c3FwZXR5dW1wa2F3aXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNDk4NDMsImV4cCI6MjA3MDcyNTg0M30.tEbu8QHtWQM00zLpkt5IuOwpeo61cn7LJ0N8fR6FCU4"

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Create tables using SQL
    const createTablesSQL = `
      -- Create sidebar_items table
      CREATE TABLE IF NOT EXISTS sidebar_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'folder',
        parent_id INTEGER REFERENCES sidebar_items(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create dynamic_tables table
      CREATE TABLE IF NOT EXISTS dynamic_tables (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(255) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        sidebar_item_id INTEGER REFERENCES sidebar_items(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create table_columns table
      CREATE TABLE IF NOT EXISTS table_columns (
        id SERIAL PRIMARY KEY,
        dynamic_table_id INTEGER NOT NULL REFERENCES dynamic_tables(id) ON DELETE CASCADE,
        column_name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        data_type VARCHAR(50) NOT NULL DEFAULT 'text',
        is_required BOOLEAN DEFAULT FALSE,
        default_value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(dynamic_table_id, column_name)
      );

      -- Create table_data table
      CREATE TABLE IF NOT EXISTS table_data (
        id SERIAL PRIMARY KEY,
        dynamic_table_id INTEGER NOT NULL REFERENCES dynamic_tables(id) ON DELETE CASCADE,
        row_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_sidebar_items_parent_id ON sidebar_items(parent_id);
      CREATE INDEX IF NOT EXISTS idx_dynamic_tables_sidebar_item_id ON dynamic_tables(sidebar_item_id);
      CREATE INDEX IF NOT EXISTS idx_table_columns_dynamic_table_id ON table_columns(dynamic_table_id);
      CREATE INDEX IF NOT EXISTS idx_table_data_dynamic_table_id ON table_data(dynamic_table_id);

      -- Insert sample data
      INSERT INTO sidebar_items (name, type, parent_id) VALUES 
        ('Sample Customers', 'table', NULL)
      ON CONFLICT DO NOTHING;

      INSERT INTO dynamic_tables (table_name, display_name, sidebar_item_id) VALUES 
        ('sample_customers', 'Sample Customers', 1)
      ON CONFLICT (table_name) DO NOTHING;

      INSERT INTO table_columns (dynamic_table_id, column_name, display_name, data_type, is_required) VALUES 
        (1, 'name', 'Customer Name', 'text', true),
        (1, 'email', 'Email Address', 'email', true),
        (1, 'phone', 'Phone Number', 'text', false),
        (1, 'company', 'Company', 'text', false)
      ON CONFLICT (dynamic_table_id, column_name) DO NOTHING;

      INSERT INTO table_data (dynamic_table_id, row_data) VALUES 
        (1, '{"name": "John Doe", "email": "john@example.com", "phone": "555-0123", "company": "Acme Corp"}'),
        (1, '{"name": "Jane Smith", "email": "jane@example.com", "phone": "555-0456", "company": "Tech Solutions"}')
      ON CONFLICT DO NOTHING;
    `

    // Execute the SQL using a stored procedure approach
    const { data, error } = await supabase.rpc("exec_sql", { sql: createTablesSQL })

    if (error) {
      console.error("Database initialization error:", error)
  return NextResponse.json(
        {
          success: false,
          error: "Failed to initialize database. Please run the SQL script manually in Supabase SQL Editor.",
          details: error.message,
        },
        { status: 500 },
      )
    }

  return NextResponse.json({
      success: true,
      message: "Database initialized successfully with all required tables and sample data.",
    })
  } catch (error) {
    console.error("Database initialization error:", error)
  return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize database. Please run the SQL script manually in Supabase SQL Editor.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
