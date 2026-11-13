import openpyxl

wb = openpyxl.load_workbook('spreadsheet.xlsx', data_only=False)
ws = wb['Result Refference ']

print("=== EDIT ORDER (92-98) ===")
for r in range(92, 99):
    print(f"R{r}: " + " | ".join([f"{openpyxl.utils.get_column_letter(c)}: {ws.cell(r, c).value}" for c in range(1, 10) if ws.cell(r, c).value is not None]))

print("\n=== DETAIL TRANSAKSI 1 (100-111) ===")
for r in range(100, 111):
    print(f"R{r}: " + " | ".join([f"{openpyxl.utils.get_column_letter(c)}: {ws.cell(r, c).value}" for c in range(1, 10) if ws.cell(r, c).value is not None]))

print("\n=== DETAIL TRANSAKSI 2 (158-180) ===")
for r in range(158, 180):
    print(f"R{r}: " + " | ".join([f"{openpyxl.utils.get_column_letter(c)}: {ws.cell(r, c).value}" for c in range(1, 10) if ws.cell(r, c).value is not None]))
