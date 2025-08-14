import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    console.log("Testing Supabase connection...")

    // Test environment variables
    const supabaseUrl = process.env.SUPABASE_SUPABASE_NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY

    console.log("Environment variables:", {
      url: supabaseUrl ? "Present" : "Missing",
      key: supabaseKey ? "Present" : "Missing",
    })

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error: "Missing environment variables",
          details: {
            SUPABASE_NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? "Present" : "Missing",
            SUPABASE_SUPABASE_SERVICE_ROLE_KEY: supabaseKey ? "Present" : "Missing",
          },
        },
        { status: 500 },
      )
    }

    // Test Supabase connection
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Test basic query
    const { data, error } = await supabase.from("sidebar_items").select("*").limit(1)

    if (error) {
      console.error("Supabase query error:", error)
      return NextResponse.json(
        {
          error: "Supabase query failed",
          details: error.message,
          code: error.code,
          hint: error.hint,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Supabase connection successful",
      tableExists: true,
      sampleData: data,
      rowCount: data?.length || 0,
    })
  } catch (error) {
    console.error("Supabase test error:", error)
    return NextResponse.json(
      {
        error: "Supabase test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
