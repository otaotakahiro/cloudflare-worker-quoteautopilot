import type { ICompanyRepository } from '../../../Shared/Domain/Repository/ICompany.repository';
import { Company } from '../../../Shared/Domain/Entity/Company.entity';

/**
 * Cloudflare KVを使用した企業リポジトリ実装
 * 現在はモックデータを使用、後で外部API連携に変更予定
 */
export class CompanyKVRepository implements ICompanyRepository {
  public constructor(
    private readonly kv: KVNamespace
  ) {}

  /**
   * 業務カテゴリに基づいて企業を検索
   */
  public async searchByCategory(category: string): Promise<Company[]> {
    // 初期データがない場合はモックデータを作成
    await this.ensureMockData();

    const indexKey = `company:category:${category}`;
    const indexValue = await this.kv.get(indexKey, 'text');

    if (!indexValue) {
      return [];
    }

    const companyIds = JSON.parse(indexValue);
    const companies: Company[] = [];

    for (const id of companyIds) {
      const company = await this.findById(id);
      if (company) {
        companies.push(company);
      }
    }

    return companies;
  }

  /**
   * 企業名で検索
   */
  public async searchByName(name: string): Promise<Company[]> {
    const allCompanies = await this.getAllCompanies();
    return allCompanies.filter(company =>
      company.name.indexOf(name) !== -1
    );
  }

  /**
   * 企業を保存
   */
  public async save(company: Company): Promise<void> {
    const key = `company:${company.id}`;
    const value = JSON.stringify({
      id: company.id,
      name: company.name,
      website: company.website,
      email: company.email,
      contactForm: company.contactForm,
      industry: company.industry,
      description: company.description
    });

    await this.kv.put(key, value);

    // カテゴリインデックスを更新
    await this.updateCategoryIndex(company.industry, company.id);

    // 全体インデックスを更新
    await this.updateCompanyIndex(company.id);
  }

  /**
   * IDで企業を取得
   */
  public async findById(id: string): Promise<Company | null> {
    const key = `company:${id}`;
    const value = await this.kv.get(key, 'text');

    if (!value) {
      return null;
    }

    const data = JSON.parse(value);
    return new Company(
      data.id,
      data.name,
      data.website,
      data.email,
      data.contactForm,
      data.industry,
      data.description
    );
  }

  /**
   * 全ての企業を取得
   */
  private async getAllCompanies(): Promise<Company[]> {
    const indexValue = await this.kv.get('company:index', 'text');

    if (!indexValue) {
      return [];
    }

    const companyIds = JSON.parse(indexValue);
    const companies: Company[] = [];

    for (const id of companyIds) {
      const company = await this.findById(id);
      if (company) {
        companies.push(company);
      }
    }

    return companies;
  }

  /**
   * カテゴリインデックスを更新
   */
  private async updateCategoryIndex(category: string, companyId: string): Promise<void> {
    const indexKey = `company:category:${category}`;
    const indexValue = await this.kv.get(indexKey, 'text');
    const companyIds = indexValue ? JSON.parse(indexValue) : [];

    if (!companyIds.includes(companyId)) {
      companyIds.push(companyId);
      await this.kv.put(indexKey, JSON.stringify(companyIds));
    }
  }

  /**
   * 企業インデックスを更新
   */
  private async updateCompanyIndex(companyId: string): Promise<void> {
    const indexValue = await this.kv.get('company:index', 'text');
    const companyIds = indexValue ? JSON.parse(indexValue) : [];

    if (!companyIds.includes(companyId)) {
      companyIds.push(companyId);
      await this.kv.put('company:index', JSON.stringify(companyIds));
    }
  }

  /**
   * モックデータを作成（開発用）
   */
  private async ensureMockData(): Promise<void> {
    const existingIndex = await this.kv.get('company:index', 'text');

    if (existingIndex) {
      return; // 既にデータが存在する
    }

    const mockCompanies = [
      new Company(
        'comp1',
        'テックソリューション株式会社',
        'https://techsolution.example.com',
        'sales@techsolution.example.com',
        {
          url: 'https://techsolution.example.com/contact',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'email', type: 'email', required: true },
            { name: 'message', type: 'textarea', required: true }
          ],
          isQuoteForm: false
        },
        'IT・システム開発',
        'Webアプリケーション開発を専門とする企業'
      ),
      new Company(
        'comp2',
        '株式会社デザインスタジオ',
        'https://design-studio.example.com',
        'info@design-studio.example.com',
        undefined,
        'デザイン・クリエイティブ',
        'UI/UXデザイン、ブランディングを手がける'
      ),
      new Company(
        'comp3',
        'マーケティングプラス株式会社',
        'https://marketing-plus.example.com',
        'contact@marketing-plus.example.com',
        {
          url: 'https://marketing-plus.example.com/quote',
          fields: [
            { name: 'company', type: 'text', required: true },
            { name: 'budget', type: 'number', required: true },
            { name: 'description', type: 'textarea', required: true }
          ],
          isQuoteForm: true
        },
        'マーケティング・広告',
        'デジタルマーケティング、SNS運用'
      ),
      new Company(
        'comp4',
        '総合ビジネスサポート株式会社',
        'https://business-support.example.com',
        'inquiry@business-support.example.com',
        {
          url: 'https://business-support.example.com/contact',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'company', type: 'text', required: true },
            { name: 'phone', type: 'tel', required: false },
            { name: 'email', type: 'email', required: true },
            { name: 'service_type', type: 'select', required: true },
            { name: 'description', type: 'textarea', required: true }
          ],
          isQuoteForm: true
        },
        'その他',
        '様々な業務に対応する総合ビジネスサポート企業'
      ),
      new Company(
        'comp5',
        '株式会社オールインワン',
        'https://allinone.example.com',
        'sales@allinone.example.com',
        undefined,
        'その他',
        'イベント運営、メディア制作、コンサルティングなど幅広く対応'
      ),
      new Company(
        'comp6',
        'プロフェッショナル・サービス合同会社',
        'https://pro-service.example.com',
        'contact@pro-service.example.com',
        {
          url: 'https://pro-service.example.com/estimate',
          fields: [
            { name: 'project_type', type: 'select', required: true },
            { name: 'timeline', type: 'text', required: true },
            { name: 'budget_range', type: 'select', required: true },
            { name: 'details', type: 'textarea', required: true }
          ],
          isQuoteForm: true
        },
        'その他',
        '専門性を活かした各種サービス提供'
      ),
      new Company(
        'comp7',
        '株式会社コンサルティングワークス',
        'https://consulting-works.example.com',
        'hello@consulting-works.example.com',
        undefined,
        'コンサルティング',
        '経営・財務・人事コンサルティング専門'
      ),
      new Company(
        'comp8',
        'メディア・クリエイト株式会社',
        'https://media-create.example.com',
        'info@media-create.example.com',
        {
          url: 'https://media-create.example.com/quote-form',
          fields: [
            { name: 'media_type', type: 'select', required: true },
            { name: 'duration', type: 'text', required: true },
            { name: 'target_audience', type: 'text', required: false },
            { name: 'description', type: 'textarea', required: true }
          ],
          isQuoteForm: true
        },
        'その他',
        '動画制作、SNS運営、イベント企画・運営'
      )
    ];

    for (const company of mockCompanies) {
      await this.save(company);
    }
  }
}
