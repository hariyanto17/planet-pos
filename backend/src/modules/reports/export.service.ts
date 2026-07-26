export interface ReportExportService {
  exportSalesReport(startDate: string, endDate: string): Promise<Buffer>;
  exportPaymentReport(startDate: string, endDate: string): Promise<Buffer>;
  exportProductReport(startDate: string, endDate: string): Promise<Buffer>;
}

export const reportsExportService: ReportExportService = {
  async exportSalesReport(startDate: string, endDate: string): Promise<Buffer> {
    return Buffer.from([]);
  },
  async exportPaymentReport(startDate: string, endDate: string): Promise<Buffer> {
    return Buffer.from([]);
  },
  async exportProductReport(startDate: string, endDate: string): Promise<Buffer> {
    return Buffer.from([]);
  },
};
