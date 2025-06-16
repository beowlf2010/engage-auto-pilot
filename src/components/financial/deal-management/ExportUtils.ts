
import { Deal } from "./DealManagementTypes";
import { formatCurrency, getAdjustedGrossProfit, getAdjustedTotalProfit } from "./DealManagementUtils";

export const exportToCSV = (
  deals: Deal[], 
  packAdjustment: number, 
  filename: string = 'deal-management-report'
) => {
  const headers = [
    'Stock Number',
    'Vehicle',
    'Buyer Name', 
    'Deal Type',
    'Sale Amount',
    'Gross Profit',
    'F&I Profit',
    'Total Profit',
    'Upload Date',
    'Age (Days)'
  ];

  const rows = deals.map(deal => [
    deal.stock_number || '',
    deal.year_model || '',
    deal.buyer_name || '',
    deal.deal_type || '',
    deal.sale_amount || 0,
    getAdjustedGrossProfit(deal, packAdjustment),
    deal.fi_profit || 0,
    getAdjustedTotalProfit(deal, packAdjustment),
    new Date(deal.upload_date).toLocaleDateString(),
    deal.age || 0
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const printReport = () => {
  try {
    window.print();
  } catch (error) {
    console.error('Print failed:', error);
    alert('Print failed. Please try using the "Printable View" option instead.');
  }
};

export const openPrintableView = (
  deals: Deal[], 
  packAdjustment: number, 
  packAdjustmentEnabled: boolean
) => {
  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  if (!printWindow) {
    alert('Please allow pop-ups to view the printable report');
    return;
  }

  const htmlContent = generateMultiPageHTML(deals, packAdjustment, packAdjustmentEnabled);
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
};

const generateMultiPageHTML = (
  deals: Deal[], 
  packAdjustment: number, 
  packAdjustmentEnabled: boolean
) => {
  const summaryStats = calculateSummaryStats(deals, packAdjustment);
  const DEALS_PER_PAGE = 20;
  const totalPages = Math.ceil(deals.length / DEALS_PER_PAGE);
  
  // Split deals into pages
  const pages = [];
  for (let i = 0; i < deals.length; i += DEALS_PER_PAGE) {
    pages.push(deals.slice(i, i + DEALS_PER_PAGE));
  }
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Deal Management Report</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            font-size: 11px; 
            line-height: 1.3;
          }
          .page {
            page-break-after: always;
            min-height: 95vh;
          }
          .page:last-child {
            page-break-after: avoid;
          }
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
          }
          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ccc;
          }
          .summary { 
            margin-bottom: 25px; 
            border: 2px solid #333; 
            padding: 15px; 
            background-color: #f9f9f9;
          }
          .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 15px; 
          }
          .summary-item { 
            text-align: center; 
            padding: 10px;
            border: 1px solid #ddd;
            background-color: white;
          }
          .summary-item .label { 
            font-weight: bold; 
            margin-bottom: 5px; 
            font-size: 10px;
            color: #666;
          }
          .summary-item .value { 
            font-size: 14px; 
            font-weight: bold; 
            color: #333;
          }
          .summary-item .amount { 
            font-size: 12px; 
            color: #555;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px; 
            font-size: 10px;
          }
          th, td { 
            border: 1px solid #333; 
            padding: 6px 4px; 
            text-align: left; 
            vertical-align: top;
          }
          th { 
            background-color: #f0f0f0; 
            font-weight: bold; 
            font-size: 9px;
            text-align: center;
          }
          .number { text-align: right; }
          .footer { 
            margin-top: 20px; 
            text-align: center; 
            font-size: 9px; 
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 10px;
          }
          @media print {
            body { margin: 0; padding: 15px; }
            .page { page-break-after: always; }
            .page:last-child { page-break-after: avoid; }
            .header { page-break-after: avoid; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <!-- First Page with Summary -->
        <div class="page">
          <div class="header">
            <h1>Deal Management Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            ${packAdjustmentEnabled ? `<p><strong>Pack Adjustment Applied: ${formatCurrency(packAdjustment)}</strong></p>` : ''}
            <p>Total Deals: ${deals.length} | Total Pages: ${totalPages + 1}</p>
          </div>
          
          <div class="summary">
            <h2 style="text-align: center; margin-bottom: 15px;">Summary Totals</h2>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="label">New Retail</div>
                <div class="value">${summaryStats.newRetail.units} units</div>
                <div class="amount">${formatCurrency(summaryStats.newRetail.total)}</div>
              </div>
              <div class="summary-item">
                <div class="label">Used Retail</div>
                <div class="value">${summaryStats.usedRetail.units} units</div>
                <div class="amount">${formatCurrency(summaryStats.usedRetail.total)}</div>
              </div>
              <div class="summary-item">
                <div class="label">Total Retail</div>
                <div class="value">${summaryStats.totalRetail.units} units</div>
                <div class="amount">${formatCurrency(summaryStats.totalRetail.total)}</div>
              </div>
              <div class="summary-item">
                <div class="label">Dealer Trade</div>
                <div class="value">${summaryStats.dealerTrade.units} units</div>
                <div class="amount">${formatCurrency(summaryStats.dealerTrade.total)}</div>
              </div>
              <div class="summary-item">
                <div class="label">Wholesale</div>
                <div class="value">${summaryStats.wholesale.units} units</div>
                <div class="amount">${formatCurrency(summaryStats.wholesale.total)}</div>
              </div>
              <div class="summary-item">
                <div class="label">Grand Total</div>
                <div class="value">${deals.length} deals</div>
                <div class="amount">${formatCurrency(summaryStats.grandTotal)}</div>
              </div>
            </div>
          </div>
        </div>

        ${pages.map((pageDeals, pageIndex) => `
          <!-- Page ${pageIndex + 2} -->
          <div class="page">
            <div class="page-header">
              <div><strong>Deal Management Report - Page ${pageIndex + 2} of ${totalPages + 1}</strong></div>
              <div>Deals ${pageIndex * DEALS_PER_PAGE + 1} - ${Math.min((pageIndex + 1) * DEALS_PER_PAGE, deals.length)} of ${deals.length}</div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th style="width: 8%;">Stock #</th>
                  <th style="width: 20%;">Vehicle</th>
                  <th style="width: 15%;">Buyer</th>
                  <th style="width: 8%;">Type</th>
                  <th style="width: 10%;">Sale Amount</th>
                  <th style="width: 10%;">Gross Profit</th>
                  <th style="width: 9%;">F&I Profit</th>
                  <th style="width: 10%;">Total Profit</th>
                  <th style="width: 10%;">Date</th>
                </tr>
              </thead>
              <tbody>
                ${pageDeals.map(deal => `
                  <tr>
                    <td style="font-weight: bold;">${deal.stock_number || 'N/A'}</td>
                    <td>${deal.year_model || 'Unknown'}</td>
                    <td>${deal.buyer_name || 'Unknown'}</td>
                    <td style="text-align: center;">${deal.deal_type || 'retail'}</td>
                    <td class="number">${formatCurrency(deal.sale_amount || 0)}</td>
                    <td class="number" style="font-weight: bold;">${formatCurrency(getAdjustedGrossProfit(deal, packAdjustment))}</td>
                    <td class="number">${formatCurrency(deal.fi_profit || 0)}</td>
                    <td class="number" style="font-weight: bold; color: #2563eb;">${formatCurrency(getAdjustedTotalProfit(deal, packAdjustment))}</td>
                    <td style="text-align: center;">${new Date(deal.upload_date).toLocaleDateString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            ${pageIndex === pages.length - 1 ? `
              <div class="footer">
                <p><strong>Report Summary:</strong> This report shows ${deals.length} deals with a total profit of ${formatCurrency(summaryStats.grandTotal)}${packAdjustmentEnabled ? ` (including pack adjustments of ${formatCurrency(packAdjustment)} per used vehicle)` : ''}.</p>
                <p>Generated from Deal Management System on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </body>
    </html>
  `;
};

const calculateSummaryStats = (deals: Deal[], packAdjustment: number) => {
  const stats = {
    newRetail: { units: 0, total: 0 },
    usedRetail: { units: 0, total: 0 },
    totalRetail: { units: 0, total: 0 },
    dealerTrade: { units: 0, total: 0 },
    wholesale: { units: 0, total: 0 },
    grandTotal: 0
  };

  deals.forEach(deal => {
    const totalProfit = getAdjustedTotalProfit(deal, packAdjustment);
    const vehicleType = deal.stock_number?.trim().toUpperCase().charAt(0) === 'C' ? 'new' : 'used';
    const dealType = deal.deal_type || 'retail';

    if (dealType === 'retail') {
      if (vehicleType === 'new') {
        stats.newRetail.units++;
        stats.newRetail.total += totalProfit;
      } else {
        stats.usedRetail.units++;
        stats.usedRetail.total += totalProfit;
      }
    } else if (dealType === 'dealer_trade') {
      stats.dealerTrade.units++;
      stats.dealerTrade.total += totalProfit;
    } else if (dealType === 'wholesale') {
      stats.wholesale.units++;
      stats.wholesale.total += totalProfit;
    }
  });

  stats.totalRetail.units = stats.newRetail.units + stats.usedRetail.units;
  stats.totalRetail.total = stats.newRetail.total + stats.usedRetail.total;
  stats.grandTotal = stats.totalRetail.total + stats.dealerTrade.total + stats.wholesale.total;

  return stats;
};
