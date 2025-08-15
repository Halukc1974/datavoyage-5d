import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // The route is called with the sidebar item id; resolve the dynamic_table id
    const sidebarId = Number.parseInt(params.id)
    const dynamicTable = await DatabaseService.getDynamicTableBySidebarId(sidebarId)
    if (!dynamicTable) {
      return NextResponse.json([], { status: 200 })
    }
    const data = await DatabaseService.getTableData(dynamicTable.id)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching table data:", error)
    return NextResponse.json({ error: "Failed to fetch table data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sidebarId = Number.parseInt(params.id)
    const dynamicTable = await DatabaseService.getDynamicTableBySidebarId(sidebarId)
    if (!dynamicTable) {
      return NextResponse.json({ error: "Dynamic table not found for sidebar id" }, { status: 404 })
    }
    const body = await request.json()

    const row = await DatabaseService.createTableRow(dynamicTable.id, body.data)
    return NextResponse.json(row)
  } catch (error) {
    console.error("Error creating row:", error)
    // Attempt to surface DB error details when available
    if (error && (error as any).message) {
      return NextResponse.json({ error: (error as any).message }, { status: 500 })
    }
    return NextResponse.json({ error: "Failed to create row" }, { status: 500 })
  }
}
