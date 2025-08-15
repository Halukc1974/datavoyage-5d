import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

function sanitizeIdentifier(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sidebarItemId = Number.parseInt(params.id)
    const dynamicTable = await DatabaseService.getDynamicTableBySidebarId(sidebarItemId)

    if (!dynamicTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 })
    }

    const safeName = sanitizeIdentifier(dynamicTable.table_name || dynamicTable.display_name || `table_${dynamicTable.id}`)

    const createSql = `CREATE TABLE IF NOT EXISTS ${safeName} (\n  id serial primary key,\n  created_at timestamptz default now(),\n  updated_at timestamptz default now(),\n  row_data jsonb\n);`

    return NextResponse.json({ sql: createSql, table_name: safeName })
  } catch (error) {
    console.error("Error generating create table SQL:", error)
    return NextResponse.json({ error: "Failed to generate SQL" }, { status: 500 })
  }
}
