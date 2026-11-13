import openpyxl

wb = openpyxl.load_workbook('spreadsheet.xlsx', data_only=False)
ws = wb['Result Refference ']

print("=== SALES ROW 69 ALL HEADERS ===")
headers = []
for c in range(1, 55):
    val = ws.cell(69, c).value
    col_letter = openpyxl.utils.get_column_letter(c)
    if val:
        headers.append((col_letter, val.replace('\n', ' ')))
for h in headers:
    print(f"{h[0]}: {h[1]}")
