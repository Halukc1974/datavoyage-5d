import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://xtsczsqpetyumpkawiwl.supabase.co"
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0c2N6c3FwZXR5dW1wa2F3aXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNDk4NDMsImV4cCI6MjA3MDcyNTg0M30.tEbu8QHtWQM00zLpkt5IuOwpeo61cn7LJ0N8fR6FCU4"

// Create Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export { supabase }

// Database types (unchanged)
export interface SidebarItem {
  id: number
  name: string
  parent_id: number | null
  item_type: "folder" | "table"
  icon?: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DynamicTable {
  id: number
  sidebar_item_id: number
  table_name: string
  display_name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface TableColumn {
  id: number
  table_id: number
  column_name: string
  display_name: string
  data_type: "text" | "number" | "date" | "boolean" | "decimal" | "double" | "checkbox"
  is_required: boolean
  default_value?: string
  sort_order: number
  width: number
  created_at: string
  updated_at: string
}

export interface TableData {
  id: number
  table_id: number
  row_data: Record<string, any>
  created_at: string
  updated_at: string
}

// Database operations using Supabase
export class DatabaseService {
  static async initializeTables(): Promise<void> {
    try {
      // Check if tables exist by trying to query sidebar_items
      const { data: existingItems, error: checkError } = await supabase
        .from("sidebar_items")
        .select("count", { count: "exact" })
        .limit(1)

      if (
        checkError &&
        (checkError.message.includes('relation "sidebar_items" does not exist') ||
          checkError.message.includes("Could not find the table"))
      ) {
        throw new Error(`
Database tables do not exist. Please create them by following these steps:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your 'datavoyage' project  
3. Go to the SQL Editor
4. Copy and paste the content from 'scripts/supabase-setup.sql' and run it

OR

Use the 'Run Script' button in v0 for the 'scripts/supabase-setup.sql' file.

This will create all required tables (sidebar_items, dynamic_tables, table_columns, table_data) with sample data.
        `)
      }

      // If tables exist but are empty, seed initial data
      if (existingItems && existingItems.length === 0) {
        await this.seedInitialData()
      }
    } catch (error) {
      console.error("Error initializing database tables:", error)
      throw error
    }
  }

  static async seedInitialData(): Promise<void> {
    try {
      // Create root "Tables" folder
      const { data: tablesFolder, error: folderError } = await supabase
        .from("sidebar_items")
        .insert({
          name: "Tables",
          parent_id: null,
          item_type: "folder", // Changed from 'type' to 'item_type' to match SQL schema
          icon: "folder",
          sort_order: 1,
        })
        .select()
        .single()

      if (folderError) throw folderError

      // Create sample table sidebar item
      const { data: sampleTableItem, error: tableItemError } = await supabase
        .from("sidebar_items")
        .insert({
          name: "Sample Customers",
          parent_id: tablesFolder.id,
          item_type: "table", // Changed from 'type' to 'item_type' to match SQL schema
          icon: "table",
          sort_order: 1,
        })
        .select()
        .single()

      if (tableItemError) throw tableItemError

      // Create the dynamic table
      const { data: dynamicTable, error: dynamicTableError } = await supabase
        .from("dynamic_tables")
        .insert({
          sidebar_item_id: sampleTableItem.id,
          table_name: "sample_customers",
          display_name: "Sample Customers",
          description: "A sample customer table to get you started",
        })
        .select()
        .single()

      if (dynamicTableError) throw dynamicTableError

      // Create sample columns
      const columns = [
        {
          table_id: dynamicTable.id,
          column_name: "name",
          display_name: "Customer Name",
          data_type: "text",
          is_required: true,
          sort_order: 0,
          width: 200,
        },
        {
          table_id: dynamicTable.id,
          column_name: "email",
          display_name: "Email Address",
          data_type: "text",
          is_required: true,
          sort_order: 1,
          width: 250,
        },
        {
          table_id: dynamicTable.id,
          column_name: "phone",
          display_name: "Phone Number",
          data_type: "text",
          is_required: false,
          sort_order: 2,
          width: 150,
        },
        {
          table_id: dynamicTable.id,
          column_name: "active",
          display_name: "Active",
          data_type: "checkbox",
          is_required: false,
          sort_order: 3,
          width: 100,
        },
        {
          table_id: dynamicTable.id,
          column_name: "created_date",
          display_name: "Created Date",
          data_type: "date",
          is_required: false,
          sort_order: 4,
          width: 150,
        },
      ]

      const { error: columnsError } = await supabase.from("table_columns").insert(columns)

      if (columnsError) throw columnsError

      // Create sample data
      const sampleData = [
        {
          table_id: dynamicTable.id,
          row_data: {
            name: "John Doe",
            email: "john@example.com",
            phone: "+1-555-0123",
            active: true,
            created_date: "2024-01-15",
          },
        },
        {
          table_id: dynamicTable.id,
          row_data: {
            name: "Jane Smith",
            email: "jane@example.com",
            phone: "+1-555-0124",
            active: true,
            created_date: "2024-01-16",
          },
        },
        {
          table_id: dynamicTable.id,
          row_data: {
            name: "Bob Johnson",
            email: "bob@example.com",
            phone: "+1-555-0125",
            active: false,
            created_date: "2024-01-17",
          },
        },
      ]

      const { error: dataError } = await supabase.from("table_data").insert(sampleData)

      if (dataError) throw dataError
    } catch (error) {
      console.error("Error seeding initial data:", error)
      throw error
    }
  }

  static async getSidebarItems(): Promise<SidebarItem[]> {
    try {
      await this.initializeTables()

      const { data, error } = await supabase
        .from("sidebar_items")
        .select("id, name, parent_id, item_type, icon, sort_order, created_at, updated_at") // Changed 'type' to 'item_type' to match SQL schema
        .order("parent_id", { nullsFirst: true })
        .order("name")

      if (error) throw error

      return (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        parent_id: item.parent_id,
        item_type: item.item_type, // Direct mapping since column names match
        icon: item.icon || (item.item_type === "table" ? "table" : "folder"), // Use item.item_type
        sort_order: item.sort_order || 0, // Use actual sort_order from database
        created_at: item.created_at,
        updated_at: item.updated_at,
      })) as SidebarItem[]
    } catch (error) {
      console.error("Error getting sidebar items:", error)
      throw error
    }
  }

  static async createSidebarItem(item: Omit<SidebarItem, "id" | "created_at" | "updated_at">): Promise<SidebarItem> {
    const { data, error } = await supabase
      .from("sidebar_items")
      .insert({
        name: item.name,
        parent_id: item.parent_id,
        item_type: item.item_type, // Changed from 'type' to 'item_type' to match SQL schema
        icon: item.icon,
        sort_order: item.sort_order || 0,
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      name: data.name,
      parent_id: data.parent_id,
      item_type: data.item_type, // Direct mapping since column names match
      icon: data.icon || (data.item_type === "table" ? "table" : "folder"), // Use data.item_type
      sort_order: data.sort_order || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as SidebarItem
  }

  static async updateSidebarItem(id: number, updates: Partial<SidebarItem>): Promise<SidebarItem> {
    const updateData: any = {}

    if (updates.name) updateData.name = updates.name
    if (updates.parent_id !== undefined) updateData.parent_id = updates.parent_id
    if (updates.item_type) updateData.item_type = updates.item_type // Changed from 'type' to 'item_type' to match SQL schema
    if (updates.icon) updateData.icon = updates.icon
    if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order

    const { data, error } = await supabase.from("sidebar_items").update(updateData).eq("id", id).select().single()

    if (error) throw error

    return {
      id: data.id,
      name: data.name,
      parent_id: data.parent_id,
      item_type: data.item_type, // Direct mapping since column names match
      icon: data.icon || (data.item_type === "table" ? "table" : "folder"), // Use data.item_type
      sort_order: data.sort_order || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as SidebarItem
  }

  static async deleteSidebarItem(id: number): Promise<void> {
    const { error } = await supabase.from("sidebar_items").delete().eq("id", id)

    if (error) throw error
  }

  // Table operations
  static async getDynamicTable(id: number): Promise<DynamicTable | null> {
    const { data, error } = await supabase.from("dynamic_tables").select("*").eq("id", id).single()

    if (error) {
      if (error.code === "PGRST116") return null // No rows returned
      throw error
    }
    return data as DynamicTable
  }

  static async getDynamicTableBySidebarId(sidebarId: number): Promise<DynamicTable | null> {
    const { data, error } = await supabase.from("dynamic_tables").select("*").eq("sidebar_item_id", sidebarId).single()

    if (error) {
      if (error.code === "PGRST116") return null // No rows returned
      throw error
    }
    return data as DynamicTable
  }

  static async createDynamicTable(
    table: Omit<DynamicTable, "id" | "created_at" | "updated_at">,
  ): Promise<DynamicTable> {
    const { data, error } = await supabase
      .from("dynamic_tables")
      .insert({
        sidebar_item_id: table.sidebar_item_id,
        table_name: table.table_name,
        display_name: table.display_name,
        description: table.description,
      })
      .select()
      .single()

    if (error) throw error
    return data as DynamicTable
  }

  // Column operations
  static async getTableColumns(tableId: number): Promise<TableColumn[]> {
    const { data, error } = await supabase
      .from("table_columns")
      .select("*")
      .eq("table_id", tableId)
      .order("sort_order")
      .order("column_name")

    if (error) throw error
    return data as TableColumn[]
  }

  static async createTableColumn(column: Omit<TableColumn, "id" | "created_at" | "updated_at">): Promise<TableColumn> {
    const { data, error } = await supabase
      .from("table_columns")
      .insert({
        table_id: column.table_id,
        column_name: column.column_name,
        display_name: column.display_name,
        data_type: column.data_type,
        is_required: column.is_required,
        default_value: column.default_value,
        sort_order: column.sort_order,
        width: column.width,
      })
      .select()
      .single()

    if (error) throw error
    // If a default value was provided, set it on existing rows that don't have this column
    try {
      if (column.default_value !== undefined && column.default_value !== null && column.default_value !== "") {
        const columnName = column.column_name
        const { data: existingRows, error: fetchError } = await supabase
          .from("table_data")
          .select("id, row_data")
          .eq("table_id", column.table_id)

        if (!fetchError && existingRows && existingRows.length > 0) {
          for (const row of existingRows) {
            const updatedRowData = { ...(row.row_data || {}) }
            if (!(columnName in updatedRowData)) {
              updatedRowData[columnName] = column.default_value
              const { error: updateError } = await supabase
                .from("table_data")
                .update({ row_data: updatedRowData, updated_at: new Date().toISOString() })
                .eq("id", row.id)

              if (updateError) {
                console.error(`Error setting default for row ${row.id}:`, updateError)
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Error applying default values to existing rows:", e)
    }

    return data as TableColumn
  }

  static async updateTableColumn(id: number, updates: Partial<TableColumn>): Promise<TableColumn> {
    const { data: currentColumn, error: fetchError } = await supabase
      .from("table_columns")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError) throw fetchError

    const oldColumnName = currentColumn.column_name
    const newColumnName = updates.column_name

    // Update the column metadata
    const { data, error } = await supabase
      .from("table_columns")
      .update({
        ...(updates.column_name && { column_name: updates.column_name }),
        ...(updates.display_name && { display_name: updates.display_name }),
        ...(updates.data_type && { data_type: updates.data_type }),
        ...(updates.is_required !== undefined && { is_required: updates.is_required }),
        ...(updates.default_value !== undefined && { default_value: updates.default_value }),
        ...(updates.sort_order !== undefined && { sort_order: updates.sort_order }),
        ...(updates.width !== undefined && { width: updates.width }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    if (newColumnName && oldColumnName !== newColumnName) {
      // Get all data rows for this table
      const { data: tableData, error: dataFetchError } = await supabase
        .from("table_data")
        .select("*")
        .eq("table_id", currentColumn.table_id)

      if (dataFetchError) throw dataFetchError

      // Update each row to rename the column key in row_data
      for (const row of tableData) {
        const updatedRowData = { ...row.row_data }

        // If the old column name exists in the data, rename it to the new column name
        if (oldColumnName in updatedRowData) {
          updatedRowData[newColumnName] = updatedRowData[oldColumnName]
          delete updatedRowData[oldColumnName]

          // Update the row with the new column name
          const { error: updateRowError } = await supabase
            .from("table_data")
            .update({
              row_data: updatedRowData,
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id)

          if (updateRowError) {
            console.error(`Error updating row ${row.id}:`, updateRowError)
          }
        }
      }
    }

    return data as TableColumn
  }

  static async deleteTableColumn(id: number): Promise<void> {
    const { error } = await supabase.from("table_columns").delete().eq("id", id)

    if (error) throw error
  }

  // Data operations
  static async getTableData(tableId: number, limit = 100, offset = 0): Promise<TableData[]> {
    const { data, error } = await supabase
      .from("table_data")
      .select("*")
      .eq("table_id", tableId)
      .order("id")
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data as TableData[]
  }

  static async createTableRow(tableId: number, rowData: Record<string, any>): Promise<TableData> {
    const { data, error } = await supabase
      .from("table_data")
      .insert({
        table_id: tableId,
        row_data: rowData,
      })
      .select()
      .single()

    if (error) throw error
    return data as TableData
  }

  static async updateTableRow(id: number, rowData: Record<string, any>): Promise<TableData> {
    const { data, error } = await supabase
      .from("table_data")
      .update({
        row_data: rowData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data as TableData
  }

  static async deleteTableRow(id: number): Promise<void> {
    const { error } = await supabase.from("table_data").delete().eq("id", id)

    if (error) throw error
  }
}
