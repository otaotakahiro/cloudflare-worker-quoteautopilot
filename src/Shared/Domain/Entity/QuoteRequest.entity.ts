import type { Company, ContactMethod } from './Company.entity';
import type { Invoice, QuoteSummary } from './Invoice.entity';

/**
 * 見積もり依頼エンティティ
 * 見積もり依頼の状態と進行を管理する
 */
export class QuoteRequest {
  public constructor(
    public readonly id: string,
    public readonly invoice: Invoice,
    public readonly targetCompany: Company,
    public readonly contactMethod: ContactMethod,
    public readonly summary: QuoteSummary,
    public readonly status: QuoteRequestStatus = 'pending',
    public readonly sentAt?: Date,
    public readonly respondedAt?: Date,
    public readonly response?: QuoteResponse
  ) {}

  /**
   * 見積もり依頼を送信済みに更新
   */
  public markAsSent(): QuoteRequest {
    return new QuoteRequest(
      this.id,
      this.invoice,
      this.targetCompany,
      this.contactMethod,
      this.summary,
      'sent',
      new Date(),
      this.respondedAt,
      this.response
    );
  }

  /**
   * 返答を受信した際の更新
   */
  public markAsResponded(response: QuoteResponse): QuoteRequest {
    return new QuoteRequest(
      this.id,
      this.invoice,
      this.targetCompany,
      this.contactMethod,
      this.summary,
      'responded',
      this.sentAt,
      new Date(),
      response
    );
  }

  /**
   * 失敗としてマーク
   */
  public markAsFailed(error: string): QuoteRequest {
    return new QuoteRequest(
      this.id,
      this.invoice,
      this.targetCompany,
      this.contactMethod,
      this.summary,
      'failed',
      this.sentAt,
      this.respondedAt,
      { type: 'error', content: error }
    );
  }
}

export type QuoteRequestStatus = 'pending' | 'sent' | 'responded' | 'failed';

export interface QuoteResponse {
  type: 'quote' | 'rejection' | 'request_more_info' | 'error';
  content: string;
  amount?: number;
  deadline?: Date;
}
