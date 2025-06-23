import type { Invoice } from '../Entity/Invoice.entity';

/**
 * 請求書リポジトリインターフェース
 * ドメイン層が依存する抽象インターフェース
 */
export interface IInvoiceRepository {
  /**
   * 請求書を保存
   */
  save(invoice: Invoice): Promise<void>;

  /**
   * IDで請求書を取得
   */
  findById(id: string): Promise<Invoice | null>;

  /**
   * 全ての請求書を取得
   */
  findAll(): Promise<Invoice[]>;

  /**
   * 請求書を削除
   */
  delete(id: string): Promise<void>;

  /**
   * ファイルから請求書エンティティを作成
   * PDF解析はフロントエンドで行われ、結果をバックエンドに送信
   */
  createFromFile(file: File): Promise<Invoice>;
}
