import { DatabaseService } from "@/lib/database"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("Testing database connection...")

  // Test database access by ensuring tables are initialized and fetching sidebar items
  console.log("Initializing tables...")
  await DatabaseService.initializeTables()
  console.log("Tables initialized successfully")

  // Test getting sidebar items
  console.log("Getting sidebar items...")
  const items = await DatabaseService.getSidebarItems()
  console.log("Sidebar items count:", items.length)

    return NextResponse.json({
      success: true,
      message: "Database test successful",
  connection: { sidebarCount: items.length },
      sidebarItems: items,
    })
  } catch (error: any) {
    console.error("Database test failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
