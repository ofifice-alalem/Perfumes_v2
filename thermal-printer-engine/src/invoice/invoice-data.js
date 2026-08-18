/**
 * Sample Invoice Data Model for POS-80 Thermal Printer
 */

// Single Item Sample Invoice (from 1st reference image)
const sampleInvoice = {
    invoiceNumber: "50904",
    cashier: "Super Admin",
    dateTime: "2026-08-17 | 12:22 PM",

    items: [
        {
            name: "بيتك عساف (1 ملي)",
            quantity: 3,
            price: 1,
            total: 3
        }
    ],

    paymentMethod: "تحويل بنكي",
    paid: 3,
    total: 3,
    due: 0
};

// Multi Item Sample Invoice (from 2nd reference image)
const sampleMultiItemInvoice = {
    invoiceNumber: "50621",
    cashier: "سليم",
    dateTime: "2026-08-15 | 08:20 PM",

    items: [
        {
            name: "سواك",
            quantity: 2,
            price: 3,
            total: 6
        },
        {
            name: "لاكوست وايت (بخ 35)",
            quantity: 2,
            price: 35,
            total: 70
        },
        {
            name: "انفكتس فيكتوري كسير 2026 (1 ملي)",
            quantity: 10,
            price: 8,
            total: 80
        },
        {
            name: "هيرش لهب (عبوة)",
            quantity: 1,
            price: 440,
            total: 440
        }
    ],

    // Multiple payment methods support
    payments: [
        { method: "نقدي", amount: 50 },
        { method: "بطاقة", amount: 506 },
        { method: "تحويل بنكي", amount: 40 }
    ],

    total: 596,
    due: 0
};

module.exports = {
    sampleInvoice,
    sampleMultiItemInvoice
};
