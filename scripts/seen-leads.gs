/**
 * Seen Leads UX — Google Apps Script
 *
 * Attached to the Facebook Leads Google Sheet.
 *
 * onEdit(e): Moves a lead row to the "Seen" tab when its column F checkbox is checked.
 * addCheckboxesToAllGroups(): One-time utility to add checkboxes to all existing lead rows.
 *
 * Deployment: Paste into Extensions > Apps Script on the target sheet.
 * After pasting, run addCheckboxesToAllGroups() once from the script editor.
 */

/**
 * Simple onEdit trigger. Fires on every cell edit.
 * When a checkbox in column F is checked (TRUE), moves the row to the "Seen" tab
 * and deletes it from the source group tab.
 *
 * @param {Object} e - The onEdit event object.
 */
function onEdit(e) {
  // Guard: exit early if event object is missing or malformed
  if (!e || !e.range) return;

  var range = e.range;
  var sourceSheet = range.getSheet();
  var sheetName = sourceSheet.getName();

  // Guard: never process edits on the Seen tab itself
  if (sheetName === "Seen") return;

  // Guard: ignore the default Sheet1 tab
  if (sheetName === "Sheet1") return;

  // Guard: only act on column F (column 6)
  if (range.getColumn() !== 6) return;

  var row = range.getRow();

  // Guard: skip header row
  if (row === 1) return;

  // Guard: only act when checkbox is checked (TRUE)
  if (e.value !== "TRUE") return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get or create the "Seen" tab
  var seenSheet = ss.getSheetByName("Seen");
  if (!seenSheet) {
    seenSheet = ss.insertSheet("Seen");
    seenSheet.getRange(1, 1, 1, 6).setValues([
      ["Post ID", "Author", "Post Link", "Post Date", "Scraped At", "Source Group"]
    ]);
  }

  // Read columns A-E from the edited row
  var rowData = sourceSheet.getRange(row, 1, 1, 5).getValues()[0];

  // Build the Seen row: original 5 columns + source group tab name
  var seenRow = [rowData[0], rowData[1], rowData[2], rowData[3], rowData[4], sheetName];

  // Append to the Seen tab
  seenSheet.appendRow(seenRow);

  // Delete the original row from the source sheet
  sourceSheet.deleteRow(row);
}

/**
 * One-time utility to add checkboxes in column F to all existing lead rows
 * across all group tabs. Also sets the F1 header to "Seen" on each tab.
 *
 * Run this once from the Apps Script editor after pasting the script.
 */
function addCheckboxesToAllGroups() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();

  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var name = sheet.getName();

    // Skip the Seen tab and the default Sheet1 tab
    if (name === "Seen" || name === "Sheet1") continue;

    var lastRow = sheet.getLastRow();

    // Skip tabs with no data rows (only header or empty)
    if (lastRow < 2) continue;

    // Set the F1 header to "Seen"
    sheet.getRange(1, 6).setValue("Seen");

    // Add checkbox data validation to F2:F{lastRow}
    var rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet.getRange(2, 6, lastRow - 1, 1).setDataValidation(rule);
  }
}
