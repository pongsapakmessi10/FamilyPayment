interface Transaction {
    _id: string;
    description: string;
    amount: number;
    date: string;
    category?: string;
    type?: string;
    payer?: { name: string };
}

// Helper to create HTML table for PDF export
const createHTMLTable = (
    title: string,
    subtitle: string,
    headers: string[],
    rows: any[][],
    total?: number
): string => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Sarabun', 'Arial', sans-serif;
                    padding: 30px;
                    color: #1f2937;
                }
                h1 {
                    font-size: 24px;
                    color: #2563eb;
                    margin-bottom: 10px;
                    font-weight: bold;
                }
                .subtitle {
                    font-size: 14px;
                    color: #6b7280;
                    margin-bottom: 30px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th {
                    background-color: #2563eb;
                    color: white;
                    padding: 12px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 12px;
                }
                td {
                    padding: 10px 12px;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 13px;
                }
                tr:nth-child(even) {
                    background-color: #f9fafb;
                }
                .total-row {
                    background-color: #eff6ff !important;
                    font-weight: bold;
                }
                .total-row td {
                    color: #2563eb;
                    border-top: 2px solid #2563eb;
                }
                .text-right {
                    text-align: right;
                }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <div class="subtitle">${subtitle}</div>
            <table>
                <thead>
                    <tr>
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>
                            ${row.map((cell, idx) =>
        `<td class="${idx === row.length - 1 ? 'text-right' : ''}">${cell}</td>`
    ).join('')}
                        </tr>
                    `).join('')}
                    ${total !== undefined ? `
                        <tr class="total-row">
                            <td colspan="${headers.length - 1}" class="text-right">Total</td>
                            <td class="text-right">${total.toLocaleString()} THB</td>
                        </tr>
                    ` : ''}
                </tbody>
            </table>
        </body>
        </html>
    `;
};

export const exportDayPDF = async (transactions: Transaction[], date: Date, familyName: string = 'Family') => {
    const html2pdf = (await import('html2pdf.js')).default;

    const headers = ['Time', 'Description', 'Category', 'Paid By', 'Amount (THB)'];
    const rows = transactions.map(t => [
        new Date(t.date).toLocaleTimeString(),
        t.description,
        t.category || t.type,
        t.payer?.name || '-',
        `${t.amount.toLocaleString()} THB`
    ]);

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);

    const htmlContent = createHTMLTable(
        `${familyName} - Daily Report`,
        `Date: ${date.toLocaleDateString()}`,
        headers,
        rows,
        total
    );

    const element = document.createElement('div');
    element.innerHTML = htmlContent;

    const opt = {
        margin: 10,
        filename: `${familyName}_${date.toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().from(element).set(opt).save();
};

export const exportMonthPDF = async (transactions: Transaction[], month: number, year: number, familyName: string = 'Family') => {
    const html2pdf = (await import('html2pdf.js')).default;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const headers = ['Date', 'Description', 'Category', 'Paid By', 'Amount (THB)'];
    const rows = transactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.description,
        t.category || t.type,
        t.payer?.name || '-',
        `${t.amount.toLocaleString()} THB`
    ]);

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);

    const htmlContent = createHTMLTable(
        `${familyName} - Monthly Report`,
        `Period: ${monthNames[month - 1]} ${year}`,
        headers,
        rows,
        total
    );

    const element = document.createElement('div');
    element.innerHTML = htmlContent;

    const opt = {
        margin: 10,
        filename: `${familyName}_${monthNames[month - 1]}_${year}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().from(element).set(opt).save();
};

export const exportQuarterPDF = async (transactions: Transaction[], quarter: number, year: number, familyName: string = 'Family') => {
    const html2pdf = (await import('html2pdf.js')).default;

    const headers = ['Date', 'Description', 'Category', 'Paid By', 'Amount (THB)'];
    const rows = transactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.description,
        t.category || t.type,
        t.payer?.name || '-',
        `${t.amount.toLocaleString()} THB`
    ]);

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);

    const htmlContent = createHTMLTable(
        `${familyName} - Quarterly Report`,
        `Period: Q${quarter} ${year}`,
        headers,
        rows,
        total
    );

    const element = document.createElement('div');
    element.innerHTML = htmlContent;

    const opt = {
        margin: 10,
        filename: `${familyName}_Q${quarter}_${year}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().from(element).set(opt).save();
};

export const exportYearPDF = async (transactions: Transaction[], year: number, familyName: string = 'Family') => {
    const html2pdf = (await import('html2pdf.js')).default;

    // Calculate monthly totals
    const monthTotals: { [key: number]: number } = {};
    transactions.forEach(t => {
        const month = new Date(t.date).getMonth();
        monthTotals[month] = (monthTotals[month] || 0) + t.amount;
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const summaryRows = Object.keys(monthTotals).map(key => [
        monthNames[parseInt(key)],
        `${monthTotals[parseInt(key)].toLocaleString()} THB`
    ]);

    const transactionRows = transactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.description,
        t.category || t.type,
        `${t.amount.toLocaleString()} THB`
    ]);

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Sarabun', 'Arial', sans-serif; padding: 30px; color: #1f2937; }
                h1 { font-size: 24px; color: #2563eb; margin-bottom: 10px; font-weight: bold; }
                h2 { font-size: 18px; color: #2563eb; margin-top: 30px; margin-bottom: 15px; font-weight: bold; }
                .subtitle { font-size: 14px; color: #6b7280; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background-color: #2563eb; color: white; padding: 12px; text-align: left; font-weight: bold; font-size: 12px; }
                td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
                tr:nth-child(even) { background-color: #f9fafb; }
                .total-row { background-color: #eff6ff !important; font-weight: bold; }
                .total-row td { color: #2563eb; border-top: 2px solid #2563eb; }
                .text-right { text-align: right; }
            </style>
        </head>
        <body>
            <h1>${familyName} - Annual Report</h1>
            <div class="subtitle">Period: ${year}</div>
            <h2>Monthly Summary</h2>
            <table>
                <thead>
                    <tr><th>Month</th><th class="text-right">Total (THB)</th></tr>
                </thead>
                <tbody>
                    ${summaryRows.map(row => `
                        <tr><td>${row[0]}</td><td class="text-right">${row[1]}</td></tr>
                    `).join('')}
                </tbody>
            </table>
            <h2>All Transactions</h2>
            <table>
                <thead>
                    <tr><th>Date</th><th>Description</th><th>Category</th><th class="text-right">Amount (THB)</th></tr>
                </thead>
                <tbody>
                    ${transactionRows.map(row => `
                        <tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td class="text-right">${row[3]}</td></tr>
                    `).join('')}
                    <tr class="total-row"><td colspan="3" class="text-right">Total</td><td class="text-right">${total.toLocaleString()} THB</td></tr>
                </tbody>
            </table>
        </body>
        </html>
    `;

    const element = document.createElement('div');
    element.innerHTML = htmlContent;

    const opt = {
        margin: 10,
        filename: `${familyName}_${year}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().from(element).set(opt).save();
};
