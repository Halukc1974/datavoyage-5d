"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export function DatabaseInit() {
  const [isInitializing, setIsInitializing] = useState(false)
  const [initResult, setInitResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleInitialize = async () => {
    setIsInitializing(true)
    setInitResult(null)

    try {
      const response = await fetch("/api/init-database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()
      setInitResult(result)
    } catch (error) {
      setInitResult({
        success: false,
        message: "Failed to initialize database. Please try again or run the SQL script manually.",
      })
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Database Setup Required
        </CardTitle>
        <CardDescription>
          The required database tables don't exist yet. Initialize your Supabase database to get started.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">What will be created:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• sidebar_items (folder/table hierarchy)</li>
            <li>• dynamic_tables (table metadata)</li>
            <li>• table_columns (column definitions)</li>
            <li>• table_data (actual data storage)</li>
            <li>• Sample "Customers" table with demo data</li>
          </ul>
        </div>

        <Button onClick={handleInitialize} disabled={isInitializing} className="w-full">
          {isInitializing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Initializing Database...
            </>
          ) : (
            "Initialize Database"
          )}
        </Button>

        {initResult && (
          <Alert className={initResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <div className="flex items-center gap-2">
              {initResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={initResult.success ? "text-green-800" : "text-red-800"}>
                {initResult.message}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Alternative:</strong> You can also run the SQL script manually:
          </p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Go to your Supabase dashboard</li>
            <li>Open the SQL Editor</li>
            <li>
              Copy and paste the content from <code>scripts/supabase-setup.sql</code>
            </li>
            <li>Click "Run" to execute</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
