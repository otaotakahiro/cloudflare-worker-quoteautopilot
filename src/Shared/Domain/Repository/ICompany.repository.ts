import type { Company } from '../Entity/Company.entity';

/**
 * 企業リポジトリインターフェース
 * 企業検索とデータアクセスの抽象インターフェース
 */
export interface ICompanyRepository {
  /**
   * 業務カテゴリに基づいて企業を検索
   */
  searchByCategory(category: string): Promise<Company[]>;

  /**
   * 企業名で検索
   */
  searchByName(name: string): Promise<Company[]>;

  /**
   * 企業を保存
   */
  save(company: Company): Promise<void>;

  /**
   * IDで企業を取得
   */
  findById(id: string): Promise<Company | null>;
}
