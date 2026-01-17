/**
 * Export Button Component
 *
 * Reusable button for exporting data to CSV and PDF.
 */

import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  FileDownloadOutlined,
  TableChartOutlined,
  PictureAsPdfOutlined,
} from '@mui/icons-material';
import { exportUtils, printElement } from '../../services/export';

export interface ExportButtonProps {
  /**
   * Data to export
   */
  data: any[];

  /**
   * Export type
   */
  exportType: 'transactions' | 'products' | 'customers' | 'inventory' | 'custom';

  /**
   * Custom filename (without extension)
   */
  filename?: string;

  /**
   * Element ID to print (for PDF export)
   */
  printElementId?: string;

  /**
   * Button variant
   */
  variant?: 'text' | 'outlined' | 'contained';

  /**
   * Button size
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Button text
   */
  label?: string;

  /**
   * Custom export handler
   */
  onExport?: (format: 'csv' | 'pdf') => void;

  /**
   * Disable default exports
   */
  disableDefault?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  exportType,
  filename,
  printElementId,
  variant = 'outlined',
  size = 'small',
  label = 'Export',
  onExport,
  disableDefault = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [exporting, setExporting] = useState(false);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExportCSV = async () => {
    handleClose();
    setExporting(true);

    try {
      if (onExport && !disableDefault) {
        await onExport('csv');
      } else if (disableDefault) {
        await onExport!('csv');
      } else {
        // Default CSV export
        switch (exportType) {
          case 'transactions':
            exportUtils.exportTransactions(data, filename);
            break;
          case 'products':
            exportUtils.exportProducts(data, filename);
            break;
          case 'customers':
            exportUtils.exportCustomers(data, filename);
            break;
          case 'inventory':
            exportUtils.exportInventoryReport(data, filename);
            break;
          default:
            // Custom export
            exportUtils.exportTransactions(data, filename);
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = () => {
    handleClose();

    if (printElementId) {
      printElement(printElementId);
    } else if (onExport) {
      setExporting(true);
      onExport('pdf')
        .catch(console.error)
        .finally(() => setExporting(false));
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        startIcon={
          exporting ? (
            <CircularProgress size={16} />
          ) : (
            <FileDownloadOutlined />
          )
        }
        onClick={handleClick}
        disabled={exporting || (!data || data.length === 0)}
      >
        {label}
      </Button>

      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={handleExportCSV} disabled={exporting}>
          <ListItemIcon>
            <TableChartOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as CSV</ListItemText>
        </MenuItem>

        {(printElementId || onExport) && (
          <MenuItem onClick={handleExportPDF} disabled={exporting}>
            <ListItemIcon>
              <PictureAsPdfOutlined fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {printElementId ? 'Print / Save as PDF' : 'Export as PDF'}
            </ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default ExportButton;
