import * as pdfjsLib from 'pdfjs-dist';

/**
 * PDF解析サービス
 * PDF.jsを使用してPDFファイルからテキストを抽出する
 */
export class PdfParserService {
  constructor() {
    // PDF.jsワーカーの設定
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.js',
      import.meta.url
    ).toString();
  }

  /**
   * PDFファイルからテキストを抽出
   */
  public async extractTextFromPdf(file: File): Promise<string> {
    try {
      // ファイルをArrayBufferに変換
      const arrayBuffer = await this.fileToArrayBuffer(file);

      // PDFドキュメントを読み込み
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';

      // 全ページのテキストを抽出
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // テキストアイテムを結合
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');

        fullText += pageText + '\n';
      }

      return fullText.trim();
    } catch (error) {
      console.error('PDF解析エラー:', error);
      throw new Error(`PDF解析に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  /**
   * ファイルをArrayBufferに変換
   */
  private fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('ファイル読み込みに失敗しました'));
        }
      };

      reader.onerror = () => {
        reject(new Error('ファイル読み込みエラー'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * テキストから高精度で情報を抽出
   */
  public extractStructuredData(text: string): PdfExtractedData {
    return {
      companyName: this.extractCompanyName(text),
      services: this.extractServices(text),
      totalAmount: this.extractAmount(text),
      dates: this.extractDates(text),
      contactInfo: this.extractContactInfo(text)
    };
  }

  /**
   * 企業名を抽出（改善版）
   */
  private extractCompanyName(text: string): string | undefined {
    const companyPatterns = [
      // 株式会社・有限会社・合同会社の前後パターン
      /(?:株式会社|有限会社|合同会社|Corporation|Corp|Inc|Ltd)\s*([^\s\n\r。、]{1,20})/gi,
      /([^\s\n\r。、]{1,20})\s*(?:株式会社|有限会社|合同会社|Corporation|Corp|Inc|Ltd)/gi,
      // 請求書発行者パターン
      /請求書?\s*発行者?[：:]\s*([^\n\r]{1,30})/gi,
      /発行者?[：:]\s*([^\n\r]{1,30})/gi,
      // TO/FROM パターン
      /(?:TO|FROM|宛先)[：:\s]*([^\n\r]{1,30})/gi
    ];

    for (const pattern of companyPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleanMatch = match.replace(/(?:株式会社|有限会社|合同会社|Corporation|Corp|Inc|Ltd|請求書|発行者|TO|FROM|宛先)[：:\s]*/gi, '').trim();
          if (cleanMatch.length > 0 && cleanMatch.length <= 50) {
            return cleanMatch;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * サービス内容を抽出（改善版）
   */
  private extractServices(text: string): string[] {
    const services = new Set<string>();

    const serviceKeywords = [
      'システム開発', 'Web開発', 'Webアプリケーション開発', 'アプリ開発', 'モバイルアプリ開発',
      'フロントエンド開発', 'バックエンド開発', 'API開発', '管理画面開発',
      'デザイン', 'UI/UXデザイン', 'ロゴデザイン', 'グラフィックデザイン', 'Webデザイン',
      'コンサルティング', 'ITコンサルティング', '戦略コンサルティング', '経営コンサルティング',
      'マーケティング', 'デジタルマーケティング', 'SNS運用', 'SEO対策', '広告運用',
      '制作', '動画制作', 'コンテンツ制作', '資料制作',
      '設計', 'データベース設計', 'システム設計', 'インフラ設計',
      '運用', 'システム運用', 'サーバー運用', '保守',
      'テスト', 'デバッグ', '品質管理'
    ];

    for (const keyword of serviceKeywords) {
      if (text.includes(keyword)) {
        services.add(keyword);
      }
    }

    return Array.from(services);
  }

  /**
   * 金額を抽出（改善版）
   */
  private extractAmount(text: string): number | undefined {
    const amountPatterns = [
      // 日本円パターン
      /合計[：:\s]*[¥￥]?([0-9,]+)円?/gi,
      /総額[：:\s]*[¥￥]?([0-9,]+)円?/gi,
      /請求額[：:\s]*[¥￥]?([0-9,]+)円?/gi,
      /金額[：:\s]*[¥￥]?([0-9,]+)円?/gi,
      /[¥￥]([0-9,]+)円?/g,
      // 数値のみパターン（最後に試行）
      /([0-9,]{6,})円/g
    ];

    for (const pattern of amountPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const numberStr = match.replace(/[¥￥,円合計総額請求額金額：:\s]/g, '');
          const amount = parseInt(numberStr, 10);

          // 妥当な範囲の金額のみ採用（1,000円以上、100億円以下）
          if (amount >= 1000 && amount <= 10000000000) {
            return amount;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * 日付を抽出
   */
  private extractDates(text: string): string[] {
    const datePatterns = [
      /\d{4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}日?/g,
      /\d{1,2}[月\/\-]\d{1,2}[日\/\-]\d{4}/g,
      /\d{4}\/\d{1,2}\/\d{1,2}/g
    ];

    const dates = new Set<string>();

    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(date => dates.add(date));
      }
    }

    return Array.from(dates);
  }

  /**
   * 連絡先情報を抽出
   */
  private extractContactInfo(text: string): ContactInfo {
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phonePattern = /(?:\+81|0)\d{1,4}[-\s]?\d{1,4}[-\s]?\d{4}/g;
    const urlPattern = /https?:\/\/[^\s\n]+/g;

    const emails = text.match(emailPattern) || [];
    const phones = text.match(phonePattern) || [];
    const urls = text.match(urlPattern) || [];

    return {
      emails: [...new Set(emails)],
      phones: [...new Set(phones)],
      urls: [...new Set(urls)]
    };
  }
}

/**
 * PDF解析結果の型定義
 */
export interface PdfExtractedData {
  companyName?: string;
  services: string[];
  totalAmount?: number;
  dates: string[];
  contactInfo: ContactInfo;
}

export interface ContactInfo {
  emails: string[];
  phones: string[];
  urls: string[];
}
