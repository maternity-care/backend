export interface SepayPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount?: string;
  content: string; // nội dung des => lưu code của order
  code?: string;
  transferType?: string;
  transferAmount?: number;
  accumulated?: number;
  referenceCode?: string;
}
