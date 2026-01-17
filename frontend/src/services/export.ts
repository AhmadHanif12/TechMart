/**
 * Export Service
 *
 * Handles exporting data to CSV and PDF formats.
 */

/**
 * Convert data to CSV format
 */
export const convertToCSV = (data: any[], headers?: string[]): string => {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from data if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Create CSV header row
  const headerRow = csvHeaders.join(',');

  // Create CSV data rows
  const dataRows = data.map((row) => {
    return csvHeaders
      .map((fieldName) => {
        const value = row[fieldName];
        // Handle different value types
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes if contains comma
          const escaped = value.replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped;
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(',');
  });

  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
};

/**
 * Download data as CSV file
 */
export const downloadCSV = (data: any[], filename: string, headers?: string[]): void => {
  const csv = convertToCSV(data, headers);

  if (!csv) {
    console.warn('No data to export');
    return;
  }

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
};

/**
 * Download blob as file
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/**
 * Format date for filename
 */
export const formatDateForFilename = (date: Date = new Date()): string => {
  return date
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
};

/**
 * Export table data to CSV
 */
export const exportTableToCSV = (
  data: any[],
  filename: string,
  options?: {
    headers?: string[];
    fieldMappings?: Record<string, string>;
    dateFormat?: string;
  }
): void => {
  // Apply field mappings if provided
  let processedData = data;
  if (options?.fieldMappings) {
    processedData = data.map((row) => {
      const mapped: any = {};
      for (const [key, value] of Object.entries(row)) {
        const mappedKey = options.fieldMappings![key] || key;
        mapped[mappedKey] = value;
      }
      return mapped;
    });
  }

  downloadCSV(processedData, filename, options?.headers);
};

/**
 * Print element (for PDF export via browser print)
 */
export const printElement = (elementId: string): void => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

  // Copy styles
  const styles = Array.from(document.styleSheets)
    .map((styleSheet) => {
      try {
        return Array.from(styleSheet.cssRules)
          .map((rule) => rule.cssText)
          .join('');
      } catch (e) {
        return '';
      }
    })
    .join('');

  // Write content to print window
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print</title>
        <style>
          ${styles}
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();

  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 250);
  };
};

/**
 * Export chart image
 */
export const exportChartAsImage = (
  canvas: HTMLCanvasElement,
  filename: string
): void => {
  canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, `${filename}.png`);
    }
  }, 'image/png');
};

/**
 * Generate PDF filename with timestamp
 */
export const generateExportFilename = (prefix: string): string => {
  const timestamp = formatDateForFilename();
  return `${prefix}_${timestamp}`;
};

/**
 * Export utilities for different data types
 */
export const exportUtils = {
  /**
   * Export transactions to CSV
   */
  exportTransactions: (data: any[], filename?: string) => {
    const headers = ['ID', 'Customer', 'Product', 'Quantity', 'Amount', 'Status', 'Date'];
    const fieldMappings: Record<string, string> = {
      id: 'ID',
      customer_name: 'Customer',
      product_name: 'Product',
      quantity: 'Quantity',
      total_amount: 'Amount',
      status: 'Status',
      timestamp: 'Date',
    };

    exportTableToCSV(data, filename || generateExportFilename('transactions'), {
      headers,
      fieldMappings,
    });
  },

  /**
   * Export products to CSV
   */
  exportProducts: (data: any[], filename?: string) => {
    const headers = ['ID', 'Name', 'SKU', 'Category', 'Price', 'Stock', 'Supplier'];
    const fieldMappings: Record<string, string> = {
      id: 'ID',
      name: 'Name',
      sku: 'SKU',
      category: 'Category',
      price: 'Price',
      stock_quantity: 'Stock',
      supplier_name: 'Supplier',
    };

    exportTableToCSV(data, filename || generateExportFilename('products'), {
      headers,
      fieldMappings,
    });
  },

  /**
   * Export customers to CSV
   */
  exportCustomers: (data: any[], filename?: string) => {
    const headers = ['ID', 'Email', 'Name', 'Total Spent', 'Loyalty Tier', 'Registration Date'];
    const fieldMappings: Record<string, string> = {
      id: 'ID',
      email: 'Email',
      full_name: 'Name',
      total_spent: 'Total Spent',
      loyalty_tier: 'Loyalty Tier',
      registration_date: 'Registration Date',
    };

    exportTableToCSV(data, filename || generateExportFilename('customers'), {
      headers,
      fieldMappings,
    });
  },

  /**
   * Export inventory report to CSV
   */
  exportInventoryReport: (data: any[], filename?: string) => {
    const headers = ['Product', 'SKU', 'Current Stock', 'Reorder Threshold', 'Reorder Quantity', 'Status'];
    const fieldMappings: Record<string, string> = {
      name: 'Product',
      sku: 'SKU',
      stock_quantity: 'Current Stock',
      reorder_threshold: 'Reorder Threshold',
      reorder_quantity: 'Reorder Quantity',
      status: 'Status',
    };

    exportTableToCSV(data, filename || generateExportFilename('inventory_report'), {
      headers,
      fieldMappings,
    });
  },
};

export default exportUtils;
