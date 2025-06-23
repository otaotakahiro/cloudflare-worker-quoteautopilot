import * as pdfjsLib from 'pdfjs-dist';

/**
 * Cloudflare Workers環境用のPDF解析サービス
 * DOM APIポリフィルを含む
 */
export class PdfParserWorkerService {

  constructor() {
    this.setupWorkerEnvironment();
  }

  /**
   * Workers環境のセットアップ（DOM APIポリフィル）
   */
  private setupWorkerEnvironment(): void {
    // DOMMatrix のポリフィル
    if (typeof globalThis.DOMMatrix === 'undefined') {
      globalThis.DOMMatrix = class DOMMatrix {
        public a: number = 1;
        public b: number = 0;
        public c: number = 0;
        public d: number = 1;
        public e: number = 0;
        public f: number = 0;

        constructor(init?: string | number[]) {
          if (Array.isArray(init) && init.length >= 6) {
            this.a = init[0];
            this.b = init[1];
            this.c = init[2];
            this.d = init[3];
            this.e = init[4];
            this.f = init[5];
          }
        }

        public multiply(other: DOMMatrix): DOMMatrix {
          const result = new DOMMatrix();
          result.a = this.a * other.a + this.b * other.c;
          result.b = this.a * other.b + this.b * other.d;
          result.c = this.c * other.a + this.d * other.c;
          result.d = this.c * other.b + this.d * other.d;
          result.e = this.e * other.a + this.f * other.c + other.e;
          result.f = this.e * other.b + this.f * other.d + other.f;
          return result;
        }

        public transformPoint(point: { x: number; y: number }): { x: number; y: number } {
          return {
            x: this.a * point.x + this.c * point.y + this.e,
            y: this.b * point.x + this.d * point.y + this.f
          };
        }
      };
    }

    // その他の必要なDOM APIポリフィル
    if (typeof globalThis.document === 'undefined') {
      globalThis.document = {
        createElement: () => ({}),
        createElementNS: () => ({}),
      } as any;
    }

    if (typeof globalThis.window === 'undefined') {
      globalThis.window = globalThis as any;
    }
  }

  /**
   * PDFファイルからテキストを抽出
   */
  public async extractTextFromPdf(file: File): Promise<{
    text: string;
    companyName?: string;
    services: string[];
    totalAmount?: number;
  }> {
    try {
      // ファイルをArrayBufferに変換
      const arrayBuffer = await this.fileToArrayBuffer(file);

      // PDFドキュメントを読み込み
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      }).promise;

      let fullText = '';

      // 全ページのテキストを抽出
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // テキストアイテムを結合
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');

        fullText += pageText + '\n';
      }

      const cleanText = fullText.trim();

      // 解析結果を返す
      return {
        text: cleanText,
        companyName: this.extractCompanyName(cleanText),
        services: this.extractServices(cleanText),
        totalAmount: this.extractAmount(cleanText)
      };

    } catch (error) {
      console.error('PDF解析エラー:', error);

      // フォールバック：ファイル名から推測
      return this.getFallbackData(file.name);
    }
  }

  /**
   * ファイルをArrayBufferに変換
   */
  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
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
   * テキストから企業名を抽出
   */
  private extractCompanyName(text: string): string | undefined {
    const companyPatterns = [
      /(?:株式会社|有限会社|合同会社|合資会社|一般社団法人|一般財団法人)\s*([^\s\n\r\t]+)/g,
      /([^\s\n\r\t]+)\s*(?:株式会社|有限会社|合同会社|合資会社|Inc\.|Ltd\.|Co\.|Corp\.)/g,
      /会社名[:\s]*([^\n\r\t]+)/g,
      /発行者[:\s]*([^\n\r\t]+)/g
    ];

    for (const pattern of companyPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 1) {
          return match[1].trim();
        }
      }
    }

    return undefined;
  }

  /**
   * テキストからサービス内容を抽出
   */
  private extractServices(text: string): string[] {
    const services: string[] = [];
    const serviceKeywords = [
      'システム開発', 'Web開発', 'アプリ開発', 'ソフトウェア開発',
      'デザイン', 'UI/UX', 'グラフィックデザイン', 'ロゴデザイン',
      'コンサルティング', '戦略コンサルティング', '経営コンサルティング',
      'マーケティング', 'デジタルマーケティング', 'SNS運用', 'SEO対策',
      '制作', 'ホームページ制作', '動画制作', 'コンテンツ制作',
      '設計', '施工', '建設', '製造', '開発', '運用', '保守'
    ];

    for (const keyword of serviceKeywords) {
      if (text.indexOf(keyword) !== -1) {
        services.push(keyword);
      }
    }

    return Array.from(new Set(services)); // 重複除去
  }

  /**
   * テキストから金額を抽出
   */
  private extractAmount(text: string): number | undefined {
    const amountPatterns = [
      /合計[:\s]*[\¥,]*([0-9,]+)\s*円/g,
      /総額[:\s]*[\¥,]*([0-9,]+)\s*円/g,
      /金額[:\s]*[\¥,]*([0-9,]+)\s*円/g,
      /[\¥,]*([0-9,]+)\s*円/g
    ];

    for (const pattern of amountPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        if (match[1]) {
          const amount = parseInt(match[1].replace(/,/g, ''), 10);
          if (amount >= 1000) { // 1000円以上の場合のみ有効
            return amount;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * フォールバックデータ（PDF解析失敗時）
   */
  private getFallbackData(fileName: string): {
    text: string;
    companyName?: string;
    services: string[];
    totalAmount?: number;
  } {
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

    return {
      text: `ファイル名: ${fileName}\n※PDF解析に失敗したため、ファイル名から推測したデータを表示しています。`,
      companyName: nameWithoutExt.indexOf('請求書') !== -1
        ? nameWithoutExt.replace('請求書', '').trim() || '不明な企業'
        : nameWithoutExt || '不明な企業',
      services: ['一般業務'],
      totalAmount: undefined
    };
  }
}
