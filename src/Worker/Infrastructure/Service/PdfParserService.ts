/**
 * AI LLM APIを使用したPDF分析サービス
 * o4-mini: 高速で費用効率的な推論モデルを使用
 */
export class PdfParserService {
  private readonly apiKey: string;
  private readonly apiEndpoint: string;
  private readonly model: string;

  constructor() {
    // 環境変数からAPI設定を取得
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.model = process.env.AI_MODEL || 'o4-mini'; // o4-miniを使用
  }

  /**
   * PDFファイルからテキストを抽出してAI分析を実行
   */
  async analyzePdf(file: File): Promise<PdfAnalysisResult> {
    try {
      // 1. PDFからテキストを抽出
      const extractedText = await this.extractTextFromPdf(file);

      // 2. AI LLMで業務内容を分析
      const analysisResult = await this.analyzeBusinessContent(extractedText);

      return {
        success: true,
        extractedText,
        companyName: analysisResult.companyName,
        businessCategory: analysisResult.businessCategory,
        services: analysisResult.services,
        totalAmount: analysisResult.totalAmount,
        projectScope: analysisResult.projectScope,
        timeline: analysisResult.timeline,
        requirements: analysisResult.requirements,
        contactInfo: analysisResult.contactInfo
      };

    } catch (error) {
      console.error('PDF分析エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF分析に失敗しました',
        extractedText: '',
        companyName: '',
        businessCategory: 'その他',
        services: [],
        totalAmount: 0
      };
    }
  }

  /**
   * PDFからテキストを抽出（簡易実装）
   */
  private async extractTextFromPdf(file: File): Promise<string> {
    // FileReaderを使用してPDFの基本テキストを抽出
    // 実際の本格実装では、pdf-parseやPDF.jsを使用する
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        // PDFバイナリからの簡易テキスト抽出
        const text = this.extractTextFromBinary(reader.result as ArrayBuffer);
        resolve(text);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * バイナリデータから簡易テキスト抽出
   */
  private extractTextFromBinary(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let text = '';

    // PDFの基本的なテキスト抽出（簡易版）
    for (let i = 0; i < bytes.length - 1; i++) {
      const char = String.fromCharCode(bytes[i]);
      if (char.match(/[a-zA-Z0-9\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)) {
        text += char;
      }
    }

    return text || `ファイル名: ${file?.name || 'unknown'}\nサイズ: ${(buffer.byteLength / 1024).toFixed(1)}KB`;
  }

  /**
   * AI LLMで業務内容を分析（o4-mini最適化）
   */
  private async analyzeBusinessContent(extractedText: string): Promise<AiAnalysisResult> {
    const prompt = this.createAnalysisPrompt(extractedText);

    const requestBody = {
      model: this.model, // o4-mini使用
      messages: [
        {
          role: 'system',
          content: '業務委託・請求書の内容分析専門AIです。文書から見積もりに必要な業務詳細を論理的に抽出・分類します。推論プロセスを明確にして正確な分析を行います。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: parseInt(process.env.AI_MAX_TOKENS || '1200'), // o4-mini用に少し増量
      temperature: 0.1 // 推論モデルなので低めに設定
    };

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`AI API エラー: ${response.status} - ${response.statusText}`);
      }

      const aiResponse = await response.json();
      const analysisText = aiResponse.choices[0]?.message?.content || '';

      return this.parseAiResponse(analysisText);

    } catch (error) {
      console.error('AI分析エラー:', error);
      // AI分析が失敗した場合のフォールバック
      return this.createFallbackAnalysis(extractedText);
    }
  }

  /**
   * o4-mini用最適化プロンプト（推論特化）
   */
  private createAnalysisPrompt(text: string): string {
    return `
【論理的分析タスク】請求書・契約書から見積もり用業務情報を抽出

**分析対象文書:**
---
${text}
---

**分析手順:**
1. 文書種別の特定（請求書/見積書/契約書/その他）
2. 企業名の抽出（発注者/受注者の識別）
3. 業務内容の詳細分析
4. 金額情報の抽出・計算
5. プロジェクト要件の特定

**出力形式（JSON）:**
{
  "companyName": "企業名（発注者優先、不明の場合は受注者）",
  "businessCategory": "IT・システム開発|デザイン・クリエイティブ|マーケティング・広告|コンサルティング|製造・生産|建設・工事|その他",
  "services": ["具体的サービス内容（技術スタック含む）"],
  "totalAmount": 金額数値,
  "projectScope": "プロジェクト範囲・成果物詳細",
  "timeline": "期間・スケジュール・納期",
  "requirements": ["技術要件・制約・条件"],
  "contactInfo": "連絡先情報（あれば）"
}

**分析基準:**
- businessCategory: キーワード頻度と文脈から最適カテゴリを論理的に選択
- services: 抽象的でなく具体的な技術・作業内容を記載
- totalAmount: 税込/税抜きを考慮した正確な数値
- projectScope: 見積もり時に重要な詳細情報を優先

**推論プロセス:** 各項目について判断根拠を明確にして分析してください。
`;
  }

  /**
   * AI応答をパース（o4-mini対応）
   */
  private parseAiResponse(aiText: string): AiAnalysisResult {
    try {
      // o4-miniは推論プロセスも含む可能性があるため、より柔軟にJSON抽出
      let jsonMatch = aiText.match(/\{[\s\S]*?\}(?=\s*$|\s*\n\s*[\w])/);

      if (!jsonMatch) {
        // 複数のJSONブロックがある場合、最後のものを使用
        const allMatches = aiText.match(/\{[\s\S]*?\}/g);
        if (allMatches && allMatches.length > 0) {
          jsonMatch = [allMatches[allMatches.length - 1]];
        } else {
          throw new Error('有効なJSONが見つかりません');
        }
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        companyName: parsed.companyName || '不明',
        businessCategory: this.validateBusinessCategory(parsed.businessCategory),
        services: Array.isArray(parsed.services) ? parsed.services : ['一般業務'],
        totalAmount: typeof parsed.totalAmount === 'number' ? parsed.totalAmount : 0,
        projectScope: parsed.projectScope || '',
        timeline: parsed.timeline || '',
        requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
        contactInfo: parsed.contactInfo || ''
      };

    } catch (error) {
      console.error('AI応答パースエラー:', error);
      console.log('AI応答内容:', aiText);
      return this.createFallbackAnalysis(aiText);
    }
  }

  /**
   * 業務カテゴリの妥当性をチェック
   */
  private validateBusinessCategory(category: string): string {
    const validCategories = [
      'IT・システム開発',
      'デザイン・クリエイティブ',
      'マーケティング・広告',
      'コンサルティング',
      '製造・生産',
      '建設・工事',
      'その他'
    ];

    return validCategories.includes(category) ? category : 'その他';
  }

  /**
   * AI分析失敗時のフォールバック（推論結果保持）
   */
  private createFallbackAnalysis(text: string): AiAnalysisResult {
    // o4-miniの推論結果の一部を保持しつつフォールバック
    const partialInfo = this.extractPartialInfo(text);

    return {
      companyName: partialInfo.company || 'AI分析中断',
      businessCategory: partialInfo.category || 'その他',
      services: partialInfo.services || ['業務内容解析中'],
      totalAmount: partialInfo.amount || 0,
      projectScope: 'o4-mini分析が中断されました。利用可能な情報のみ表示中。',
      timeline: partialInfo.timeline || '不明',
      requirements: [],
      contactInfo: ''
    };
  }

  /**
   * 部分的情報抽出（フォールバック用）
   */
  private extractPartialInfo(text: string): {
    company?: string;
    category?: string;
    services?: string[];
    amount?: number;
    timeline?: string;
  } {
    const result: any = {};

    // 簡易的な情報抽出
    if (text.includes('companyName')) {
      const companyMatch = text.match(/"companyName"\s*:\s*"([^"]+)"/);
      if (companyMatch) result.company = companyMatch[1];
    }

    if (text.includes('businessCategory')) {
      const categoryMatch = text.match(/"businessCategory"\s*:\s*"([^"]+)"/);
      if (categoryMatch) result.category = categoryMatch[1];
    }

    return result;
  }
}

/**
 * PDF分析結果の型定義
 */
export interface PdfAnalysisResult {
  success: boolean;
  error?: string;
  extractedText: string;
  companyName: string;
  businessCategory: string;
  services: string[];
  totalAmount: number;
  projectScope?: string;
  timeline?: string;
  requirements?: string[];
  contactInfo?: string;
}

/**
 * AI分析結果の型定義
 */
export interface AiAnalysisResult {
  companyName: string;
  businessCategory: string;
  services: string[];
  totalAmount: number;
  projectScope: string;
  timeline: string;
  requirements: string[];
  contactInfo: string;
}
