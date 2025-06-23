/**
 * 請求書エンティティ
 * アップロードされた請求書を表現するドメインオブジェクト
 */
export class Invoice {
  public constructor(
    public readonly id: string,
    public readonly fileName: string,
    public readonly extractedText: string,
    public readonly companyName: string,
    public readonly businessCategory?: string,
    public readonly services: string[] = [],
    public readonly totalAmount: number = 0,
    public readonly uploadedAt: Date = new Date(),
    // AI分析による詳細情報
    public readonly projectScope?: string,
    public readonly timeline?: string,
    public readonly requirements: string[] = [],
    public readonly contactInfo?: string
  ) {}

  /**
   * PDFとAI分析結果から請求書エンティティを作成
   */
  public static createFromAiAnalysis(
    fileName: string,
    extractedText: string,
    analysisResult: {
      companyName: string;
      businessCategory: string;
      services: string[];
      totalAmount: number;
      projectScope?: string;
      timeline?: string;
      requirements?: string[];
      contactInfo?: string;
    }
  ): Invoice {
    const id = Invoice.generateId();

    // 業務カテゴリの自動判定（AI結果を優先、フォールバックでキーワード判定）
    const finalBusinessCategory = analysisResult.businessCategory ||
                                  Invoice.determineBusinessCategory(extractedText, analysisResult.services);

    return new Invoice(
      id,
      fileName,
      extractedText,
      analysisResult.companyName,
      finalBusinessCategory,
      analysisResult.services,
      analysisResult.totalAmount,
      new Date(),
      analysisResult.projectScope,
      analysisResult.timeline,
      analysisResult.requirements || [],
      analysisResult.contactInfo
    );
  }

  /**
   * 従来のPDF分析から請求書エンティティを作成（フォールバック用）
   */
  public static createFromPdf(fileName: string, extractedText: string): Invoice {
    const id = Invoice.generateId();
    const companyName = Invoice.extractCompanyName(fileName, extractedText);
    const services = Invoice.extractServices(extractedText);
    const totalAmount = Invoice.extractAmount(extractedText);
    const businessCategory = Invoice.determineBusinessCategory(extractedText, services);

    return new Invoice(
      id,
      fileName,
      extractedText,
      companyName,
      businessCategory,
      services,
      totalAmount,
      new Date(),
      '詳細な分析情報なし',
      '不明',
      [],
      ''
    );
  }

  /**
   * 見積もり精度を向上させるための詳細情報取得
   */
  public getDetailedBusinessInfo(): {
    category: string;
    services: string[];
    scope: string;
    requirements: string[];
    estimatedBudget: number;
  } {
    return {
      category: this.businessCategory || 'その他',
      services: this.services,
      scope: this.projectScope || 'スコープ情報なし',
      requirements: this.requirements,
      estimatedBudget: this.totalAmount
    };
  }

  /**
   * 企業マッチング用のキーワード抽出
   */
  public getMatchingKeywords(): string[] {
    const keywords: string[] = [];

    // サービス内容からキーワード抽出
    keywords.push(...this.services);

    // 要件からキーワード抽出
    keywords.push(...this.requirements);

    // プロジェクトスコープからキーワード抽出
    if (this.projectScope) {
      const scopeKeywords = this.extractKeywordsFromText(this.projectScope);
      keywords.push(...scopeKeywords);
    }

    return [...new Set(keywords)]; // 重複除去
  }

  /**
   * テキストからキーワードを抽出
   */
  private extractKeywordsFromText(text: string): string[] {
    // 技術・業務キーワードの抽出ロジック
    const techKeywords = [
      'React', 'Vue', 'Angular', 'JavaScript', 'TypeScript', 'Node.js',
      'Python', 'Java', 'PHP', 'Ruby', 'Go', 'Rust',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
      'API', 'REST', 'GraphQL', 'データベース', 'MySQL', 'PostgreSQL',
      'AI', '機械学習', 'データ分析', 'BI', 'DX',
      'UI', 'UX', 'デザイン', 'ブランディング',
      'マーケティング', 'SEO', 'SEM', 'SNS', '広告',
      'コンサルティング', '業務改善', 'プロセス'
    ];

    return techKeywords.filter(keyword =>
      text.toLowerCase().indexOf(keyword.toLowerCase()) !== -1
    );
  }

  /**
   * 業務カテゴリを自動判定
   */
  private static determineBusinessCategory(text: string, services: string[]): string {
    const categories = {
      'IT・システム開発': [
        'システム', 'アプリ', 'web', 'api', 'データベース', 'サーバー',
        'プログラム', 'コーディング', '開発', 'エンジニア', 'IT',
        'react', 'vue', 'angular', 'javascript', 'typescript', 'python', 'java'
      ],
      'デザイン・クリエイティブ': [
        'デザイン', 'UI', 'UX', 'ロゴ', 'ブランド', 'グラフィック',
        'イラスト', '動画', '映像', 'クリエイティブ', 'アート'
      ],
      'マーケティング・広告': [
        'マーケティング', '広告', 'SEO', 'SEM', 'SNS', 'プロモーション',
        '宣伝', 'PR', 'ブランディング', 'キャンペーン'
      ],
      'コンサルティング': [
        'コンサル', '戦略', '経営', '業務改善', 'DX', '組織', '人事',
        '財務', '会計', 'プロセス', '最適化'
      ],
      '製造・生産': [
        '製造', '生産', '工場', '品質', '製品', '部品', '組立'
      ],
      '建設・工事': [
        '建設', '工事', '施工', '設計', '建築', '土木', 'リフォーム'
      ]
    };

    const allText = (text + ' ' + services.join(' ')).toLowerCase();

    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (allText.indexOf(keyword) !== -1) {
          return category;
        }
      }
    }

    return 'その他';
  }

  /**
   * 企業名を抽出
   */
  private static extractCompanyName(fileName: string, text: string): string {
    // ファイル名から企業名を推測
    const fileBaseName = fileName.replace(/\.[^/.]+$/, '');

    // 一般的な不要文字を除去
    const cleanName = fileBaseName
      .replace(/請求書|invoice|見積|estimate|契約|contract/gi, '')
      .replace(/\d{4}\/?\d{1,2}\/?\d{1,2}|\d{1,2}\/?\d{1,2}\/?\d{4}/g, '')
      .replace(/[_\-\s]+/g, ' ')
      .trim();

    return cleanName || '不明';
  }

  /**
   * サービス内容を抽出
   */
  private static extractServices(text: string): string[] {
    const serviceKeywords = [
      'web開発', 'アプリ開発', 'システム開発', 'データベース設計',
      'UI設計', 'UXデザイン', 'ロゴデザイン', 'グラフィックデザイン',
      'SEO対策', 'リスティング広告', 'SNS運用', 'コンテンツ制作',
      '業務コンサル', '戦略策定', 'プロセス改善'
    ];

    const lowerText = text.toLowerCase();
    return serviceKeywords.filter(service =>
      lowerText.indexOf(service.replace(/・/g, '')) !== -1
    );
  }

  /**
   * 金額を抽出
   */
  private static extractAmount(text: string): number {
    const amountPatterns = [
      /¥([0-9,]+)/g,
      /￥([0-9,]+)/g,
      /([0-9,]+)円/g,
      /([0-9,]+)万円/g
    ];

    for (const pattern of amountPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const amountStr = matches[0].replace(/[¥￥円万,]/g, '');
        const amount = parseInt(amountStr, 10);

        if (!isNaN(amount)) {
          return matches[0].indexOf('万') !== -1 ? amount * 10000 : amount;
        }
      }
    }

    return 0;
  }

  /**
   * ユニークIDを生成
   */
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export interface QuoteSummary {
  businessCategory: string;
  services: string[];
  estimatedAmount?: number;
  description: string;
}
