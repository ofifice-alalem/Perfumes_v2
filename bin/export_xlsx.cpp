/*
 * High-Performance Native C++ Exporter for Perfumes_v2
 * Direct TSV Stream Engine with Customer Summaries, Customer Subtotals,
 * Grand Total (الإجمالي الكلي), Item Aggregation & Dinar (د.ل) Currency
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <set>
#include <sstream>
#include <xlsxwriter.h>

struct ItemRow {
    int invoiceId;
    std::string invoiceDate;
    double invoiceTotal;
    int itemCount;
    std::string productName;
    std::string sizeLabel;
    double quantity;
    double unitPrice;
    double lineTotal;
};

void renderCustomerBlock(
    lxw_worksheet *worksheet,
    uint32_t &r,
    const std::string &customerName,
    const std::vector<ItemRow> &items,
    double &grandTotalSum,
    lxw_format *customer_format,
    lxw_format *inv_id_format,
    lxw_format *inv_date_format,
    lxw_format *inv_total_format,
    lxw_format *header_format,
    lxw_format *row_format,
    lxw_format *row_center_format,
    lxw_format *subtotal_format
) {
    if (items.empty()) return;

    // Calculate customer total & unique invoice count
    std::set<int> customerInvoices;
    double customerTotalSum = 0.0;

    for (size_t i = 0; i < items.size(); i++) {
        if (customerInvoices.find(items[i].invoiceId) == customerInvoices.end()) {
            customerInvoices.insert(items[i].invoiceId);
            customerTotalSum += items[i].invoiceTotal;
        }
    }

    grandTotalSum += customerTotalSum;

    // Customer Bar: منصور — 100 فاتورة — 94,500.00 د.ل
    char custBuf[1024];
    snprintf(custBuf, sizeof(custBuf), "العميل: %s — %zu فاتورة — %.2f د.ل",
             customerName.c_str(), customerInvoices.size(), customerTotalSum);
    worksheet_write_string(worksheet, r, 0, custBuf, customer_format);
    r++;

    int currentInvoiceId = -1;

    for (size_t i = 0; i < items.size(); i++) {
        const ItemRow &row = items[i];

        // Invoice Header Row (3 Separate Columns)
        if (currentInvoiceId != row.invoiceId) {
            currentInvoiceId = row.invoiceId;

            char invIdBuf[128];
            snprintf(invIdBuf, sizeof(invIdBuf), "فاتورة: %d", row.invoiceId);
            worksheet_write_string(worksheet, r, 0, invIdBuf, inv_id_format);

            worksheet_write_string(worksheet, r, 1, row.invoiceDate.c_str(), inv_date_format);

            char invTotalBuf[128];
            snprintf(invTotalBuf, sizeof(invTotalBuf), "الإجمالي: %.2f د.ل", row.invoiceTotal);
            worksheet_write_string(worksheet, r, 2, invTotalBuf, inv_total_format);
            r++;

            worksheet_write_string(worksheet, r, 0, "العدد", header_format);
            worksheet_write_string(worksheet, r, 1, "المنتج", header_format);
            worksheet_write_string(worksheet, r, 2, "الحجم", header_format);
            worksheet_write_string(worksheet, r, 3, "السعر", header_format);
            worksheet_write_string(worksheet, r, 4, "الإجمالي", header_format);
            r++;
        }

        // Item Data Row
        if (row.itemCount > 1) {
            worksheet_write_number(worksheet, r, 0, row.itemCount, row_center_format);
        } else {
            worksheet_write_string(worksheet, r, 0, "", row_center_format);
        }

        worksheet_write_string(worksheet, r, 1, row.productName.c_str(), row_format);
        worksheet_write_string(worksheet, r, 2, row.sizeLabel.c_str(), row_format);
        worksheet_write_number(worksheet, r, 3, row.unitPrice, row_format);
        worksheet_write_number(worksheet, r, 4, row.lineTotal, row_format);
        r++;
    }

    // Customer Subtotal Row
    worksheet_write_string(worksheet, r, 0, "إجمالي العميل", subtotal_format);
    worksheet_write_string(worksheet, r, 1, "", subtotal_format);
    worksheet_write_string(worksheet, r, 2, "", subtotal_format);
    worksheet_write_string(worksheet, r, 3, "", subtotal_format);

    char subtotalBuf[128];
    snprintf(subtotalBuf, sizeof(subtotalBuf), "%.2f د.ل", customerTotalSum);
    worksheet_write_string(worksheet, r, 4, subtotalBuf, subtotal_format);
    r += 2; // Extra space between customers
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: export_xlsx <output_path.xlsx> [date_from] [date_to] [data_tsv_file] [product_names] [created_at]\n");
        return 1;
    }

    const char *outputPath   = argv[1];
    const char *dateFrom     = (argc >= 3 && strlen(argv[2]) > 0 && strcmp(argv[2], "null") != 0) ? argv[2] : NULL;
    const char *dateTo       = (argc >= 4 && strlen(argv[3]) > 0 && strcmp(argv[3], "null") != 0) ? argv[3] : NULL;
    const char *tsvFilePath  = (argc >= 5 && strlen(argv[4]) > 0) ? argv[4] : NULL;
    const char *pNamesStr    = (argc >= 6 && strlen(argv[5]) > 0 && strcmp(argv[5], "null") != 0) ? argv[5] : "الكل";
    const char *createdAtStr = (argc >= 7 && strlen(argv[6]) > 0 && strcmp(argv[6], "null") != 0) ? argv[6] : "";

    lxw_workbook  *workbook  = workbook_new(outputPath);
    lxw_worksheet *worksheet = workbook_add_worksheet(workbook, "فواتير العملاء");

    // Enable Right-To-Left (RTL) Arabic layout
    worksheet_right_to_left(worksheet);

    // Column Widths
    worksheet_set_column(worksheet, 0, 0, 16, NULL); // Column A: العدد / فاتورة رقم
    worksheet_set_column(worksheet, 1, 1, 48, NULL); // Column B: المنتج / اسم العميل / التاريخ
    worksheet_set_column(worksheet, 2, 2, 22, NULL); // Column C: الحجم / الإجمالي
    worksheet_set_column(worksheet, 3, 3, 22, NULL); // Column D: السعر
    worksheet_set_column(worksheet, 4, 4, 28, NULL); // Column E: الإجمالي

    // Formats
    lxw_format *title_format = workbook_add_format(workbook);
    format_set_font_name(title_format, "Tajawal");
    format_set_font_size(title_format, 15);
    format_set_bold(title_format);
    format_set_font_color(title_format, LXW_COLOR_WHITE);
    format_set_bg_color(title_format, 0x1565C0);
    format_set_align(title_format, LXW_ALIGN_CENTER);

    lxw_format *info_label_format = workbook_add_format(workbook);
    format_set_font_name(info_label_format, "Tajawal");
    format_set_font_size(info_label_format, 13);
    format_set_bold(info_label_format);
    format_set_bg_color(info_label_format, 0xE3F2FD);

    lxw_format *info_val_format = workbook_add_format(workbook);
    format_set_font_name(info_val_format, "Tajawal");
    format_set_font_size(info_val_format, 13);
    format_set_bg_color(info_val_format, 0xE3F2FD);

    lxw_format *customer_format = workbook_add_format(workbook);
    format_set_font_name(customer_format, "Tajawal");
    format_set_font_size(customer_format, 14);
    format_set_bold(customer_format);
    format_set_font_color(customer_format, LXW_COLOR_WHITE);
    format_set_bg_color(customer_format, 0x1565C0);

    lxw_format *inv_id_format = workbook_add_format(workbook);
    format_set_font_name(inv_id_format, "Tajawal");
    format_set_font_size(inv_id_format, 13);
    format_set_bold(inv_id_format);
    format_set_bg_color(inv_id_format, 0xBBDEFB);

    lxw_format *inv_date_format = workbook_add_format(workbook);
    format_set_font_name(inv_date_format, "Tajawal");
    format_set_font_size(inv_date_format, 13);
    format_set_bold(inv_date_format);
    format_set_bg_color(inv_date_format, 0xBBDEFB);

    lxw_format *inv_total_format = workbook_add_format(workbook);
    format_set_font_name(inv_total_format, "Tajawal");
    format_set_font_size(inv_total_format, 13);
    format_set_bold(inv_total_format);
    format_set_bg_color(inv_total_format, 0xBBDEFB);

    lxw_format *header_format = workbook_add_format(workbook);
    format_set_font_name(header_format, "Tajawal");
    format_set_font_size(header_format, 12);
    format_set_bold(header_format);
    format_set_bg_color(header_format, 0xF5F5F5);
    format_set_align(header_format, LXW_ALIGN_CENTER);

    lxw_format *row_format = workbook_add_format(workbook);
    format_set_font_name(row_format, "Tajawal");
    format_set_font_size(row_format, 12);

    lxw_format *row_center_format = workbook_add_format(workbook);
    format_set_font_name(row_center_format, "Tajawal");
    format_set_font_size(row_center_format, 12);
    format_set_align(row_center_format, LXW_ALIGN_CENTER);

    lxw_format *subtotal_format = workbook_add_format(workbook);
    format_set_font_name(subtotal_format, "Tajawal");
    format_set_font_size(subtotal_format, 13);
    format_set_bold(subtotal_format);
    format_set_bg_color(subtotal_format, 0xE8EAF6);

    lxw_format *grand_total_format = workbook_add_format(workbook);
    format_set_font_name(grand_total_format, "Tajawal");
    format_set_font_size(grand_total_format, 15);
    format_set_bold(grand_total_format);
    format_set_font_color(grand_total_format, LXW_COLOR_WHITE);
    format_set_bg_color(grand_total_format, 0x1565C0);
    format_set_align(grand_total_format, LXW_ALIGN_CENTER);

    // Title Block
    worksheet_write_string(worksheet, 0, 0, "تقرير فواتير المبيعات حسب العملاء", title_format);
    
    worksheet_write_string(worksheet, 1, 0, "من تاريخ", info_label_format);
    worksheet_write_string(worksheet, 1, 1, dateFrom ? dateFrom : "البداية", info_val_format);

    worksheet_write_string(worksheet, 2, 0, "إلى تاريخ", info_label_format);
    worksheet_write_string(worksheet, 2, 1, dateTo ? dateTo : "الآن", info_val_format);

    worksheet_write_string(worksheet, 3, 0, "المنتجات المشمولة في الحساب", info_label_format);
    worksheet_write_string(worksheet, 3, 1, pNamesStr, info_val_format);

    worksheet_write_string(worksheet, 4, 0, "تاريخ الإنشاء", info_label_format);
    worksheet_write_string(worksheet, 4, 1, createdAtStr, info_val_format);

    uint32_t r = 6;
    double grandTotalSum = 0.0;

    if (tsvFilePath != NULL) {
        std::ifstream file(tsvFilePath);
        std::string line;
        std::string currentCustomer = "";
        std::vector<ItemRow> currentCustomerItems;

        while (std::getline(file, line)) {
            if (line.empty()) continue;
            std::stringstream ss(line);
            std::string item;
            std::vector<std::string> cols;
            while (std::getline(ss, item, '\t')) {
                cols.push_back(item);
            }
            if (cols.size() < 10) continue;

            std::string custName = cols[0];
            ItemRow row;
            row.invoiceId   = atoi(cols[1].c_str());
            row.invoiceDate = cols[2];
            row.invoiceTotal= atof(cols[3].c_str());
            row.itemCount   = atoi(cols[4].c_str());
            row.productName = cols[5];
            row.sizeLabel   = cols[6];
            row.quantity    = atof(cols[7].c_str());
            row.unitPrice   = atof(cols[8].c_str());
            row.lineTotal   = atof(cols[9].c_str());

            if (currentCustomer.empty()) {
                currentCustomer = custName;
            }

            if (currentCustomer != custName) {
                renderCustomerBlock(
                    worksheet, r, currentCustomer, currentCustomerItems, grandTotalSum,
                    customer_format, inv_id_format, inv_date_format, inv_total_format,
                    header_format, row_format, row_center_format, subtotal_format
                );
                currentCustomer = custName;
                currentCustomerItems.clear();
            }

            currentCustomerItems.push_back(row);
        }

        // Render last customer block
        if (!currentCustomerItems.empty()) {
            renderCustomerBlock(
                worksheet, r, currentCustomer, currentCustomerItems, grandTotalSum,
                customer_format, inv_id_format, inv_date_format, inv_total_format,
                header_format, row_format, row_center_format, subtotal_format
            );
        }
    }

    // Grand Total Row at the bottom
    r++;
    worksheet_write_string(worksheet, r, 0, "الإجمالي الكلي", grand_total_format);
    worksheet_write_string(worksheet, r, 1, "", grand_total_format);
    worksheet_write_string(worksheet, r, 2, "", grand_total_format);
    worksheet_write_string(worksheet, r, 3, "", grand_total_format);

    char grandTotalBuf[128];
    snprintf(grandTotalBuf, sizeof(grandTotalBuf), "%.2f د.ل", grandTotalSum);
    worksheet_write_string(worksheet, r, 4, grandTotalBuf, grand_total_format);

    workbook_close(workbook);
    printf("SUCCESS: C++ Engine generated %d rows at %s (Grand Total: %.2f)\n", r, outputPath, grandTotalSum);

    return 0;
}
