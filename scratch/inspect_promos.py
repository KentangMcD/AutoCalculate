import openpyxl

wb = openpyxl.load_workbook('spreadsheet.xlsx', data_only=False)
ws = wb['Result Refference ']

print("=== PROMO TABLE ROWS (6 to 67) ===")
for r in range(6, 68):
    val_b = ws.cell(r, 2).value # Kode Promo
    val_a = ws.cell(r, 1).value # Tipe Promo
    if val_b or val_a:
        row_str = " | ".join([str(ws.cell(r, c).value or '') for c in range(1, 13)])
        print(f"R{r}: {row_str}")
