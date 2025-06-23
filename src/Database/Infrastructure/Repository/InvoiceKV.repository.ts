import { Invoice } from '../../../Shared/Domain/Entity/Invoice.entity';
import { IInvoiceRepository } from '../../../Shared/Domain/Repository/IInvoice.repository';
import { PdfParserService } from '../../../Worker/Infrastructure/Service/PdfParserService';

/**
 * Cloudflare KV を使用した請求書リポジトリ実装
 * AI LLM API による高精度PDF分析対応
 */
export class InvoiceKVRepository implements IInvoiceRepository {
  private kv: KVNamespace;
  private pdfParserService: PdfParserService;

  constructor(kvNamespace: KVNamespace) {
    this.kv = kvNamespace;
    this.pdfParserService = new PdfParserService();
  }

  /**
   * 請求書を保存
   */
  async save(invoice: Invoice): Promise<void> {
    const invoiceData = {
      id: invoice.id,
      fileName: invoice.fileName,
      extractedText: invoice.extractedText,
      companyName: invoice.companyName,
      businessCategory: invoice.businessCategory,
      services: invoice.services,
      totalAmount: invoice.totalAmount,
      uploadedAt: invoice.uploadedAt.toISOString(),
      // AI分析による詳細情報
      projectScope: invoice.projectScope,
      timeline: invoice.timeline,
      requirements: invoice.requirements,
      contactInfo: invoice.contactInfo
    };

    await this.kv.put(`invoice:${invoice.id}`, JSON.stringify(invoiceData));
  }

  /**
   * IDで請求書を取得
   */
  async findById(id: string): Promise<Invoice | null> {
    const data = await this.kv.get(`invoice:${id}`);

    if (!data) {
      return null;
    }

    const invoiceData = JSON.parse(data);
    return new Invoice(
      invoiceData.id,
      invoiceData.fileName,
      invoiceData.extractedText || '',
      invoiceData.companyName,
      invoiceData.businessCategory,
      invoiceData.services || [],
      invoiceData.totalAmount || 0,
      new Date(invoiceData.uploadedAt),
      invoiceData.projectScope,
      invoiceData.timeline,
      invoiceData.requirements || [],
      invoiceData.contactInfo
    );
  }

  /**
   * すべての請求書を取得
   */
  async findAll(): Promise<Invoice[]> {
    // KVの場合、プレフィックスで検索
    const list = await this.kv.list({ prefix: 'invoice:' });
    const invoices: Invoice[] = [];

    for (const key of list.keys) {
      const invoice = await this.findById(key.name.replace('invoice:', ''));
      if (invoice) {
        invoices.push(invoice);
      }
    }

    return invoices;
  }

  /**
   * 請求書を削除
   */
  async delete(id: string): Promise<void> {
    await this.kv.delete(`invoice:${id}`);
  }

  /**
   * ファイルからInvoiceエンティティを作成（AI LLM分析使用）
   */
  async createFromFile(file: File): Promise<Invoice> {
    try {
      // AI LLM APIを使用してPDFを分析
      const analysisResult = await this.pdfParserService.analyzePdf(file);

      let invoice: Invoice;

      if (analysisResult.success) {
        // AI分析成功時
        invoice = Invoice.createFromAiAnalysis(
          file.name,
          analysisResult.extractedText,
          {
            companyName: analysisResult.companyName,
            businessCategory: analysisResult.businessCategory,
            services: analysisResult.services,
            totalAmount: analysisResult.totalAmount,
            projectScope: analysisResult.projectScope,
            timeline: analysisResult.timeline,
            requirements: analysisResult.requirements,
            contactInfo: analysisResult.contactInfo
          }
        );
      } else {
        // AI分析失敗時のフォールバック
        console.warn('AI分析失敗、フォールバック分析を実行:', analysisResult.error);
        const fallbackData = this.generateFallbackDataFromFile(file);

        invoice = Invoice.createFromPdf(
          file.name,
          fallbackData.extractedText
        );
      }

      // 保存
      await this.save(invoice);
      return invoice;

    } catch (error) {
      console.error('ファイル処理エラー:', error);

      // 完全な失敗時のフォールバック
      const fallbackData = this.generateFallbackDataFromFile(file);
      const invoice = Invoice.createFromPdf(
        file.name,
        fallbackData.extractedText
      );

      await this.save(invoice);
      return invoice;
    }
  }

  /**
   * AI分析失敗時のフォールバックデータ生成
   */
  private generateFallbackDataFromFile(file: File): {
    extractedText: string;
    companyName: string;
    services: string[];
    totalAmount: number;
  } {
    const fileName = file.name;
    const fileSize = Math.round(file.size / 1024);

    // ファイル名から企業名を推測
    const companyName = this.extractCompanyNameFromFileName(fileName);

    // ファイル名やサイズから業務内容を推測
    const services = this.guessServicesFromFileName(fileName);

    // ファイルサイズベースで金額を推測（適当な計算）
    const totalAmount = this.estimateAmountFromFileSize(fileSize);

    const extractedText = `
【フォールバック分析データ】
ファイル名: ${fileName}
ファイルサイズ: ${fileSize}KB

推測企業名: ${companyName}
推測サービス内容: ${services.join(', ')}
推測金額: ¥${totalAmount.toLocaleString()}円

※AI分析が利用できないため、限定的な推測データです。
実際の内容とは異なる可能性があります。
    `.trim();

    return {
      extractedText,
      companyName,
      services,
      totalAmount
    };
  }

  /**
   * ファイル名から企業名を推測
   */
  private extractCompanyNameFromFileName(fileName: string): string {
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

    // よくあるパターンをチェック
    if (nameWithoutExt.indexOf('請求書') !== -1) {
      return nameWithoutExt.replace('請求書', '').trim() || 'サンプル企業';
    }

    if (nameWithoutExt.indexOf('invoice') !== -1) {
      return nameWithoutExt.replace(/invoice/i, '').trim() || 'Sample Company';
    }

    return nameWithoutExt || 'モック企業';
  }

  /**
   * ファイル名からサービス内容を推測
   */
  private guessServicesFromFileName(fileName: string): string[] {
    const lowerFileName = fileName.toLowerCase();
    const services: string[] = [];

    if (lowerFileName.indexOf('web') !== -1 || lowerFileName.indexOf('ウェブ') !== -1) {
      services.push('Web開発');
    }
    if (lowerFileName.indexOf('system') !== -1 || lowerFileName.indexOf('システム') !== -1) {
      services.push('システム開発');
    }
    if (lowerFileName.indexOf('design') !== -1 || lowerFileName.indexOf('デザイン') !== -1) {
      services.push('デザイン');
    }
    if (lowerFileName.indexOf('consulting') !== -1 || lowerFileName.indexOf('コンサル') !== -1) {
      services.push('コンサルティング');
    }

    return services.length > 0 ? services : ['一般業務'];
  }

  /**
   * ファイルサイズから金額を推測（適当な計算）
   */
  private estimateAmountFromFileSize(fileSizeKB: number): number {
    // ファイルサイズに基づく適当な金額計算
    const baseAmount = Math.max(100000, fileSizeKB * 1000);
    const roundedAmount = Math.round(baseAmount / 10000) * 10000;
    return Math.min(roundedAmount, 5000000); // 最大500万円
  }

  /**
   * ユニークIDを生成
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
