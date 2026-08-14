/*
 * High-Performance Native C++ Exporter for Perfumes_v2
 * Direct MySQL Stream Engine with Zero PHP DB Fetching Overhead
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <sstream>
#include <xlsxwriter.h>

struct Record {
    std::string customerName;
    int invoiceId;
    std::string invoiceDate;
    double invoiceTotal;
    std::string productName;
    std::string sizeLabel;
    double quantity;
    double unitPrice;
    double lineTotal;
};

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: export_xlsx <output_path.xlsx> [date_from] [date_to] [data_tsv_file]\n");
        return 1;
    }

    const char *outputPath  = argv[1];
    const char *dateFrom    = (argc >= 3 && strlen(argv[2]) > 0 && strcmp(argv[2], "null") != 0) ? argv[2] : NULL;
    const char *dateTo      = (argc >= 4 && strlen(argv[3]) > 0 && strcmp(argv[3], "null") != 0) ? argv[3] : NULL;
    const char *tsvFilePath = (argc >= 5 && strlen(argv[4]) > 0) ? argv[4] : NULL;

    lxw_workbook  *workbook  = workbook_new(outputPath);
    lxw_worksheet *worksheet = workbook_add_worksheet(workbook, "فواتير العملاء");

    // Enable Right-To-Left (RTL) Arabic layout
    worksheet_right_to_left(worksheet);

    // Column Widths
    worksheet_set_column(worksheet, 0, 0, 48, NULL);
    worksheet_set_column(worksheet, 1, 1, 42, NULL);
    worksheet_set_column(worksheet, 2, 2, 22, NULL);
    worksheet_set_column(worksheet, 3, 3, 22, NULL);
    worksheet_set_column(worksheet, 4, 4, 26, NULL);

    // Formats
    lxw_format *title_format = workbook_add_format(workbook);
    format_set_font_name(title_format, "Tajawal");
    format_set_font_size(title_format, 15);
    format_set_bold(title_format);
    format_set_font_color(title_format, LXW_COLOR_WHITE);
    format_set_bg_color(title_format, 0x1565C0);
    format_set_align(title_format, LXW_ALIGN_CENTER);

    lxw_format *info_format = workbook_add_format(workbook);
    format_set_font_name(info_format, "Tajawal");
    format_set_font_size(info_format, 13);
    format_set_bold(info_format);
    format_set_bg_color(info_format, 0xE3F2FD);

    lxw_format *customer_format = workbook_add_format(workbook);
    format_set_font_name(customer_format, "Tajawal");
    format_set_font_size(customer_format, 14);
    format_set_bold(customer_format);
    format_set_font_color(customer_format, LXW_COLOR_WHITE);
    format_set_bg_color(customer_format, 0x1565C0);

    lxw_format *inv_format = workbook_add_format(workbook);
    format_set_font_name(inv_format, "Tajawal");
    format_set_font_size(inv_format, 13);
    format_set_bold(inv_format);
    format_set_bg_color(inv_format, 0xBBDEFB);

    lxw_format *header_format = workbook_add_format(workbook);
    format_set_font_name(header_format, "Tajawal");
    format_set_font_size(header_format, 12);
    format_set_bold(header_format);
    format_set_bg_color(header_format, 0xF5F5F5);
    format_set_align(header_format, LXW_ALIGN_CENTER);

    lxw_format *row_format = workbook_add_format(workbook);
    format_set_font_name(row_format, "Tajawal");
    format_set_font_size(row_format, 12);

    // Title Block
    worksheet_write_string(worksheet, 0, 0, "تقرير فواتير المبيعات حسب العملاء (C++ Engine)", title_format);
    worksheet_write_string(worksheet, 1, 0, "من تاريخ", info_format);
    worksheet_write_string(worksheet, 1, 1, dateFrom ? dateFrom : "البداية", info_format);
    worksheet_write_string(worksheet, 2, 0, "إلى تاريخ", info_format);
    worksheet_write_string(worksheet, 2, 1, dateTo ? dateTo : "الآن", info_format);

    uint32_t r = 4;

    std::string currentCustomer = "";
    int currentInvoiceId = -1;

    if (tsvFilePath != NULL) {
        std::ifstream file(tsvFilePath);
        std::string line;
        while (std::getline(file, line)) {
            if (line.empty()) continue;
            std::stringstream ss(line);
            std::string item;
            std::vector<std::string> cols;
            while (std::getline(ss, item, '\t')) {
                cols.push_back(item);
            }
            if (cols.size() < 9) continue;

            std::string custName = cols[0];
            int invId            = atoi(cols[1].c_str());
            std::string invDate  = cols[2];
            double invTotal      = atof(cols[3].c_str());
            std::string pName    = cols[4];
            std::string pSize    = cols[5];
            double qty           = atof(cols[6].c_str());
            double unitPrice     = atof(cols[7].c_str());
            double lineTotal     = atof(cols[8].c_str());

            if (currentCustomer != custName) {
                currentCustomer = custName;
                currentInvoiceId = -1;

                char custBuf[512];
                snprintf(custBuf, sizeof(custBuf), "العميل: %s", custName.c_str());
                worksheet_write_string(worksheet, r, 0, custBuf, customer_format);
                r++;
            }

            if (currentInvoiceId != invId) {
                currentInvoiceId = invId;

                char invBuf[256];
                snprintf(invBuf, sizeof(invBuf), "فاتورة #%d | %s | الإجمالي: %.2f ر.س", invId, invDate.c_str(), invTotal);
                worksheet_write_string(worksheet, r, 0, invBuf, inv_format);
                r++;

                worksheet_write_string(worksheet, r, 0, "اسم المنتج / الصنف", header_format);
                worksheet_write_string(worksheet, r, 1, "الحجم", header_format);
                worksheet_write_string(worksheet, r, 2, "الكمية", header_format);
                worksheet_write_string(worksheet, r, 3, "السعر", header_format);
                worksheet_write_string(worksheet, r, 4, "الإجمالي", header_format);
                r++;
            }

            worksheet_write_string(worksheet, r, 0, pName.c_str(), row_format);
            worksheet_write_string(worksheet, r, 1, pSize.c_str(), row_format);
            worksheet_write_number(worksheet, r, 2, qty, row_format);
            worksheet_write_number(worksheet, r, 3, unitPrice, row_format);
            worksheet_write_number(worksheet, r, 4, lineTotal, row_format);
            r++;
        }
    }

    workbook_close(workbook);
    printf("SUCCESS: C++ Engine generated %d rows at %s\n", r, outputPath);

    return 0;
}
