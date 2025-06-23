import type { QuoteRequest } from '../Entity/QuoteRequest.entity';

/**
 * 見積もり依頼リポジトリインターフェース
 * 見積もり依頼の永続化を管理する抽象インターフェース
 */
export interface IQuoteRequestRepository {
  /**
   * 見積もり依頼を保存
   */
  save(quoteRequest: QuoteRequest): Promise<void>;

  /**
   * IDで見積もり依頼を取得
   */
  findById(id: string): Promise<QuoteRequest | null>;

  /**
   * 請求書IDに基づく見積もり依頼を取得
   */
  findByInvoiceId(invoiceId: string): Promise<QuoteRequest[]>;

  /**
   * ステータス別の見積もり依頼を取得
   */
  findByStatus(status: string): Promise<QuoteRequest[]>;

  /**
   * 全ての見積もり依頼を取得
   */
  findAll(): Promise<QuoteRequest[]>;
}
