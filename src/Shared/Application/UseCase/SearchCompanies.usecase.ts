import type { ICompanyRepository } from '../../Domain/Repository/ICompany.repository';
import type { IInvoiceRepository } from '../../Domain/Repository/IInvoice.repository';
import { Company } from '../../Domain/Entity/Company.entity';

/**
 * 企業検索に関するビジネスロジック
 */
export class SearchCompaniesUseCase {
  public constructor(
    private readonly companyRepository: ICompanyRepository,
    private readonly invoiceRepository: IInvoiceRepository
  ) {}

  /**
   * 請求書IDに基づいて関連企業を検索
   */
  public async executeByInvoiceId(invoiceId: string): Promise<Company[]> {
    // 請求書を取得
    const invoice = await this.invoiceRepository.findById(invoiceId);

    if (!invoice) {
      return [];
    }

    // 業務カテゴリに基づいて企業を検索
    if (invoice.businessCategory) {
      return await this.companyRepository.searchByCategory(invoice.businessCategory);
    }

    return [];
  }

  /**
   * 業務カテゴリに基づいて企業を検索
   */
  public async executeByCategory(category: string): Promise<Company[]> {
    return await this.companyRepository.searchByCategory(category);
  }

  /**
   * 企業名で検索
   */
  public async executeByName(name: string): Promise<Company[]> {
    return await this.companyRepository.searchByName(name);
  }

  /**
   * 連絡可能な企業のみフィルタリング
   */
  public filterContactableCompanies(companies: Company[]): Company[] {
    return companies.filter(company => {
      const contactMethods = company.getContactMethods();
      return contactMethods.length > 0;
    });
  }

  /**
   * 優先度順でソート
   */
  public sortByPriority(companies: Company[]): Company[] {
    return companies.sort((a, b) => {
      const priorityA = a.getContactPriority();
      const priorityB = b.getContactPriority();

      return priorityA - priorityB; // 数値が小さいほど優先度が高い
    });
  }
}
