/*
 * High-Performance Native C++ Exporter Engine for Perfumes_v2
 * Universal Multi-Report Engine for ALL Excel Export Routes
 * Supports: Invoices Grouped, Aging Reports, General Summaries, Stock Status & Product Movements.
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

void renderEntityBlock(
    lxw_worksheet *worksheet,
    uint32_t &r,
    const std::string &entityName,
    const std::string &entityLabel,
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

    std::set<int> uniqueInvoices;
    double entityTotalSum = 0.0;

    for (size_t i = 0; i < items.size(); i++) {
        if (uniqueInvoices.find(items[i].invoiceId) == uniqueInvoices.end()) {
            uniqueInvoices.insert(items[i].invoiceId);
            entityTotalSum += items[i].invoiceTotal;
        }
    }

    grandTotalSum += entityTotalSum;

    // Entity Summary Bar (العميل/المورد: اسم — 100 فاتورة — 94,500.00 د.ل)
    char barBuf[1024];
    snprintf(barBuf, sizeof(barBuf), "%s: %s — %zu فاتورة — %.2f د.ل",
             entityLabel.c_str(), entityName.c_str(), uniqueInvoices.size(), entityTotalSum);
    worksheet_write_string(worksheet, r, 0, barBuf, customer_format);
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

    // Entity Subtotal Row (إجمالي العميل / إجمالي المورد)
    char subLabelBuf[128];
    snprintf(subLabelBuf, sizeof(subLabelBuf), "إجمالي %s", entityLabel.c_str());
    worksheet_write_string(worksheet, r, 0, subLabelBuf, subtotal_format);
    worksheet_write_string(worksheet, r, 1, "", subtotal_format);
    worksheet_write_string(worksheet, r, 2, "", subtotal_format);
    worksheet_write_string(worksheet, r, 3, "", subtotal_format);

    char subtotalBuf[128];
    snprintf(subtotalBuf, sizeof(subtotalBuf), "%.2f د.ل", entityTotalSum);
    worksheet_write_string(worksheet, r, 4, subtotalBuf, subtotal_format);
    r += 2;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: export_xlsx <output_path.xlsx> <data_tsv_file>\n");
        return 1;
    }

    const char *outputPath  = argv[1];
    const char *tsvFilePath = (argc >= 3) ? argv[2] : argv[1];

    lxw_workbook  *workbook  = workbook_new(outputPath);
    lxw_worksheet *worksheet = workbook_add_worksheet(workbook, "التقرير");

    // Enable Right-To-Left (RTL) Arabic layout
    worksheet_right_to_left(worksheet);

    // Column Widths
    worksheet_set_column(worksheet, 0, 0, 18, NULL);
    worksheet_set_column(worksheet, 1, 1, 48, NULL);
    worksheet_set_column(worksheet, 2, 2, 24, NULL);
    worksheet_set_column(worksheet, 3, 3, 24, NULL);
    worksheet_set_column(worksheet, 4, 4, 28, NULL);
    worksheet_set_column(worksheet, 5, 10, 24, NULL);

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

    uint32_t r = 6;
    double grandTotalSum = 0.0;

    std::string metaDateFrom    = "البداية";
    std::string metaDateTo      = "الآن";
    std::string metaProducts    = "الكل";
    std::string metaCreatedAt   = "";
    std::string metaReportTitle = "تقرير فواتير المبيعات حسب العملاء";
    std::string metaEntityLabel = "العميل";
    std::string metaReportMode  = "invoices_grouped";
    std::string metaExtraInfo1  = "";
    std::string metaExtraInfo2  = "";

    if (tsvFilePath != NULL) {
        std::ifstream file(tsvFilePath);
        std::string line;
        std::string currentEntity = "";
        std::vector<ItemRow> currentEntityItems;

        while (std::getline(file, line)) {
            if (line.empty()) continue;
            std::stringstream ss(line);
            std::string item;
            std::vector<std::string> cols;
            while (std::getline(ss, item, '\t')) {
                cols.push_back(item);
            }

            // Check for #META header line
            if (!cols.empty() && cols[0] == "#META") {
                if (cols.size() >= 2 && !cols[1].empty()) metaDateFrom    = cols[1];
                if (cols.size() >= 3 && !cols[2].empty()) metaDateTo      = cols[2];
                if (cols.size() >= 4 && !cols[3].empty()) metaProducts    = cols[3];
                if (cols.size() >= 5 && !cols[4].empty()) metaCreatedAt   = cols[4];
                if (cols.size() >= 6 && !cols[5].empty()) metaReportTitle = cols[5];
                if (cols.size() >= 7 && !cols[6].empty()) metaEntityLabel = cols[6];
                if (cols.size() >= 8 && !cols[7].empty()) metaReportMode  = cols[7];
                if (cols.size() >= 9 && !cols[8].empty()) metaExtraInfo1  = cols[8];
                if (cols.size() >= 10 && !cols[9].empty()) metaExtraInfo2 = cols[9];
                continue;
            }

            // Mode: SUMMARY_ROW / TABLE_HEADER / TABLE_ROW
            if (!cols.empty() && cols[0] == "#SUMMARY") {
                if (cols.size() >= 3) {
                    worksheet_write_string(worksheet, r, 0, cols[1].c_str(), info_label_format);
                    worksheet_write_string(worksheet, r, 1, cols[2].c_str(), info_val_format);
                    r++;
                }
                continue;
            }

            if (!cols.empty() && cols[0] == "#TABLE_HEADER") {
                r++;
                for (size_t c = 1; c < cols.size(); c++) {
                    worksheet_write_string(worksheet, r, c - 1, cols[c].c_str(), header_format);
                }
                r++;
                continue;
            }

            if (!cols.empty() && cols[0] == "#TABLE_ROW") {
                for (size_t c = 1; c < cols.size(); c++) {
                    worksheet_write_string(worksheet, r, c - 1, cols[c].c_str(), row_format);
                }
                r++;
                continue;
            }

            if (cols.size() < 4) continue;

            // Invoices Grouped Mode
            if (metaReportMode == "invoices_grouped" && cols.size() >= 10) {
                std::string entName = cols[0];
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

                if (currentEntity.empty()) {
                    currentEntity = entName;
                }

                if (currentEntity != entName) {
                    renderEntityBlock(
                        worksheet, r, currentEntity, metaEntityLabel, currentEntityItems, grandTotalSum,
                        customer_format, inv_id_format, inv_date_format, inv_total_format,
                        header_format, row_format, row_center_format, subtotal_format
                    );
                    currentEntity = entName;
                    currentEntityItems.clear();
                }

                currentEntityItems.push_back(row);
            } else {
                // General row writing
                for (size_t c = 0; c < cols.size(); c++) {
                    worksheet_write_string(worksheet, r, c, cols[c].c_str(), row_format);
                }
                r++;
            }
        }

        // Render last entity block if in invoices_grouped mode
        if (metaReportMode == "invoices_grouped" && !currentEntityItems.empty()) {
            renderEntityBlock(
                worksheet, r, currentEntity, metaEntityLabel, currentEntityItems, grandTotalSum,
                customer_format, inv_id_format, inv_date_format, inv_total_format,
                header_format, row_format, row_center_format, subtotal_format
            );
        }
    }

    // Write Title Block using accurate parsed metadata
    worksheet_write_string(worksheet, 0, 0, metaReportTitle.c_str(), title_format);
    
    worksheet_write_string(worksheet, 1, 0, "من تاريخ", info_label_format);
    worksheet_write_string(worksheet, 1, 1, metaDateFrom.c_str(), info_val_format);

    worksheet_write_string(worksheet, 2, 0, "إلى تاريخ", info_label_format);
    worksheet_write_string(worksheet, 2, 1, metaDateTo.c_str(), info_val_format);

    worksheet_write_string(worksheet, 3, 0, "المنتجات المشمولة في الحساب", info_label_format);
    worksheet_write_string(worksheet, 3, 1, metaProducts.c_str(), info_val_format);

    worksheet_write_string(worksheet, 4, 0, "تاريخ الإنشاء", info_label_format);
    worksheet_write_string(worksheet, 4, 1, metaCreatedAt.c_str(), info_val_format);

    if (!metaExtraInfo1.empty()) {
        worksheet_write_string(worksheet, 5, 0, "ملاحظات الإحصاء", info_label_format);
        worksheet_write_string(worksheet, 5, 1, metaExtraInfo1.c_str(), info_val_format);
    }

    // Grand Total Row at the bottom if invoices_grouped
    if (metaReportMode == "invoices_grouped" && grandTotalSum > 0.0) {
        r++;
        worksheet_write_string(worksheet, r, 0, "الإجمالي الكلي", grand_total_format);
        worksheet_write_string(worksheet, r, 1, "", grand_total_format);
        worksheet_write_string(worksheet, r, 2, "", grand_total_format);
        worksheet_write_string(worksheet, r, 3, "", grand_total_format);

        char grandTotalBuf[128];
        snprintf(grandTotalBuf, sizeof(grandTotalBuf), "%.2f د.ل", grandTotalSum);
        worksheet_write_string(worksheet, r, 4, grandTotalBuf, grand_total_format);
    }

    workbook_close(workbook);
    printf("SUCCESS: C++ Universal Engine generated %d rows at %s\n", r, outputPath);

    return 0;
}
