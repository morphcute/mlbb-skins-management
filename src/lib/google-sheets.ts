import { google } from "googleapis";

// Define the shape of the order data needed for the sheet
export interface OrderSheetData {
  orderId: string;
  mlbbId: string;
  serverId: string;
  ign: string;
  skinName: string;
  diamondPrice: number;
  status: string;
  createdAt: Date;
}

/**
 * Appends a new order row to a Google Sheet.
 * 
 * @param spreadsheetId The ID of the Google Sheet.
 * @param order The order data to append.
 */
export async function appendOrderToSheet(spreadsheetId: string, order: OrderSheetData) {
  try {
    // Authenticate using Service Account credentials from environment variables
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Format the date
    const dateStr = order.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD

    // Prepare the row data
    // Columns: Order ID | Date | MLBB ID | Server ID | IGN | Skin Name | Price | Status
    const values = [
      [
        order.orderId,
        dateStr,
        order.mlbbId,
        order.serverId,
        order.ign,
        order.skinName,
        order.diamondPrice,
        order.status,
      ],
    ];

    // Append the data to the first sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:H", // Assumes the first sheet is named "Sheet1" and we append to columns A-H
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    });

    console.log(`Order ${order.orderId} appended to sheet ${spreadsheetId}`);
  } catch (error) {
    console.error("Error appending to Google Sheet:", error);
    // We don't want to throw here to avoid failing the order creation if sheet sync fails
    // But in a real production app, you might want to queue this or handle it more robustly
  }
}

/**
 * Updates an existing order in a Google Sheet.
 *
 * @param spreadsheetId The ID of the Google Sheet.
 * @param order The order data to update.
 */
export async function updateOrderInSheet(spreadsheetId: string, order: Partial<OrderSheetData> & { orderId: string }) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 1. Find the row index by searching for the Order ID in Column A
    // We'll read Column A
    const range = "Sheet1!A:A";
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.warn(`No data found in sheet ${spreadsheetId}`);
      return;
    }

    // Find the index of the row with the matching Order ID
    // Note: row indices are 1-based in A1 notation, but array indices are 0-based.
    // So if it's at index 5 in the array, it's row 6 in the sheet (assuming start at row 1).
    // Actually, response.data.values returns an array of arrays.
    // If we read A:A, index 0 is A1.
    const rowIndex = rows.findIndex((row) => row[0] === order.orderId);

    if (rowIndex === -1) {
      console.warn(`Order ${order.orderId} not found in sheet ${spreadsheetId}`);
      return;
    }

    // The row number in Sheets (1-based) is rowIndex + 1.
    const sheetRowNumber = rowIndex + 1;

    // 2. Update the row
    // We need to construct the update.
    // However, we might not have all fields.
    // If we only have status, we should only update the Status column (Column H).
    // But updateOrderInSheet is called with `order` which might be partial.
    // Let's assume we update specific columns based on what's provided, or just update the whole row if we have data.
    // For simplicity, let's update specific cells if we can mapping them.
    // Column Mapping:
    // A: Order ID
    // B: Date
    // C: MLBB ID
    // D: Server ID
    // E: IGN
    // F: Skin Name
    // G: Price
    // H: Status

    // If we have status, update H{sheetRowNumber}
    if (order.status) {
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Sheet1!H${sheetRowNumber}`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [[order.status]],
            },
        });
    }

    // If we have other fields, we could update them too, but currently only status update is critical for sync.
    // If we wanted to update everything, we would need the full object.
    
    console.log(`Order ${order.orderId} updated in sheet ${spreadsheetId} at row ${sheetRowNumber}`);

  } catch (error) {
    console.error("Error updating Google Sheet:", error);
  }
}
