import openpyxl

wb = openpyxl.load_workbook('spreadsheet.xlsx', data_only=False)
ws = wb['Result Refference ']

print("=== FULFILLMENT SALES HEADERS (113) ===")
for c in range(1, 45):
    val = ws.cell(113, c).value
    if val:
        print(f"{openpyxl.utils.get_column_letter(c)}: {val}")

print("\n=== REFUND HEADERS (136) ===")
for c in range(1, 45):
    val = ws.cell(136, c).value
    if val:
        print(f"{openpyxl.utils.get_column_letter(c)}: {val}")
