import type { IInvoiceRepository } from '../../Domain/Repository/IInvoice.repository';
import { Invoice } from '../../Domain/Entity/Invoice.entity';

/**
 * 請求書アップロードに関するビジネスロジック
 */
export class UploadInvoiceUseCase {
  public constructor(
    private readonly invoiceRepository: IInvoiceRepository
  ) {}

  /**
   * 請求書ファイルを処理して保存
   */
  public async execute(file: File): Promise<{ invoiceId: string; success: boolean; error?: string }> {
    try {
      // ファイル形式をチェック
      if (!this.isValidFile(file)) {
        return {
          invoiceId: '',
          success: false,
          error: 'PDFファイルのみサポートされています'
        };
      }

      // ファイルサイズをチェック
      if (!this.isValidFileSize(file)) {
        return {
          invoiceId: '',
          success: false,
          error: 'ファイルサイズが大きすぎます（最大10MB）'
        };
      }

      // ファイルから請求書エンティティを作成（PDF解析含む）
      const invoice = await this.invoiceRepository.createFromFile(file);

      return {
        invoiceId: invoice.id,
        success: true
      };

    } catch (error) {
      console.error('請求書アップロードエラー:', error);
      return {
        invoiceId: '',
        success: false,
        error: 'アップロード処理中にエラーが発生しました'
      };
    }
  }

  /**
   * ファイル形式をチェック
   */
  private isValidFile(file: File): boolean {
    return file.type === 'application/pdf';
  }

  /**
   * ファイルサイズをチェック（10MB制限）
   */
  private isValidFileSize(file: File): boolean {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return file.size <= maxSize;
  }
}
