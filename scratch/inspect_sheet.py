import openpyxl

wb = openpyxl.load_workbook('spreadsheet.xlsx', data_only=False)
ws = wb['Result Refference ']

print("--- SECTIONS IN RESULT REFFERENCE ---")
for r in range(1, 185):
    row_text = " | ".join([str(ws.cell(r, c).value) for c in range(1, 10) if ws.cell(r, c).value is not None])
    if any(keyword in row_text for keyword in ['SIMULASI', 'Tipe Promo', 'SALES', 'EDIT ORDER', 'Detail Transaksi', 'FULFILLMENT', 'REFUND', 'Total Pembayaran', 'Total Harga']):
        print(f"Row {r:3d}: {row_text[:100]}")
