
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
    // Ensure the page is ready for printing
    setTimeout(() => {
      window.print();
    }, 100);
  } catch (error) {
    console.error('Print failed:', error);
    // Fallback: open print dialog manually
    if (window.confirm('Print dialog failed to open automatically. Would you like to try opening it manually?')) {
      window.print();
    }
  }
};

export const openPrintableView = (
  deals: Deal[], 
  packAdjustment: number, 
  packAdjustmentEnabled: boolean
) => {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('Please allow pop-ups to view the printable report');
    return;
  }

  const htmlContent = generatePrintableHTML(deals, packAdjustment, packAdjustmentEnabled);
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
};

const generatePrintableHTML = (
  deals: Deal[], 
  packAdjustment: number, 
  packAdjustmentEnabled: boolean
) => {
  const summaryStats = calculateSummaryStats(deals, packAdjustment);
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Deal Management Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { margin-bottom: 30px; border: 2px solid #333; padding: 15px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .summary-item { text-align: center; }
          .summary-item .label { font-weight: bold; margin-bottom: 5px; }
          .summary-item .value { font-size: 16px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #333; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .number { text-align: right; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; }
          @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Deal Management Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          ${packAdjustmentEnabled ? `<p>Pack Adjustment Applied: ${formatCurrency(packAdjustment)}</p>` : ''}
        </div>
        
        <div class="summary">
          <h2>Summary Totals</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="label">New Retail</div>
              <div class="value">${summaryStats.newRetail.units} units</div>
              <div>${formatCurrency(summaryStats.newRetail.total)}</div>
            </div>
            <div class="summary-item">
              <div class="label">Used Retail</div>
              <div class="value">${summaryStats.usedRetail.units} units</div>
              <div>${formatCurrency(summaryStats.usedRetail.total)}</div>
            </div>
            <div class="summary-item">
              <div class="label">Total Retail</div>
              <div class="value">${summaryStats.totalRetail.units} units</div>
              <div>${formatCurrency(summaryStats.totalRetail.total)}</div>
            </div>
            <div class="summary-item">
              <div class="label">Dealer Trade</div>
              <div class="value">${summaryStats.dealerTrade.units} units</div>
              <div>${formatCurrency(summaryStats.dealerTrade.total)}</div>
            </div>
            <div class="summary-item">
              <div class="label">Wholesale</div>
              <div class="value">${summaryStats.wholesale.units} units</div>
              <div>${formatCurrency(summaryStats.wholesale.total)}</div>
            </div>
            <div class="summary-item">
              <div class="label">Total Deals</div>
              <div class="value">${deals.length} deals</div>
              <div>${formatCurrency(summaryStats.grandTotal)}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Stock #</th>
              <th>Vehicle</th>
              <th>Buyer</th>
              <th>Deal Type</th>
              <th>Sale Amount</th>
              <th class="number">Gross Profit</th>
              <th class="number">F&I Profit</th>
              <th class="number">Total Profit</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${deals.map(deal => `
              <tr>
                <td>${deal.stock_number || 'N/A'}</td>
                <td>${deal.year_model || 'Unknown'}</td>
                <td>${deal.buyer_name || 'Unknown'}</td>
                <td>${deal.deal_type || 'retail'}</td>
                <td class="number">${formatCurrency(deal.sale_amount || 0)}</td>
                <td class="number">${formatCurrency(getAdjustedGrossProfit(deal, packAdjustment))}</td>
                <td class="number">${formatCurrency(deal.fi_profit || 0)}</td>
                <td class="number">${formatCurrency(getAdjustedTotalProfit(deal, packAdjustment))}</td>
                <td>${new Date(deal.upload_date).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>This report shows ${deals.length} deals with detailed profit information${packAdjustmentEnabled ? ' including pack adjustments' : ''}.</p>
        </div>
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
