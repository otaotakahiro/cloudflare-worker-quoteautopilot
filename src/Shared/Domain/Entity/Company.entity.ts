/**
 * 企業エンティティ
 * 見積もり先企業を表現するドメインオブジェクト
 */
export class Company {
  public constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly website?: string,
    public readonly email?: string,
    public readonly contactForm?: ContactForm,
    public readonly industry?: string,
    public readonly description?: string
  ) {}

  /**
   * 連絡可能かどうかを判定
   */
  public isContactable(): boolean {
    return !!(this.email || this.contactForm);
  }

  /**
   * 利用可能な連絡方法一覧を取得
   */
  public getContactMethods(): ContactMethod[] {
    const methods: ContactMethod[] = [];

    if (this.email) {
      methods.push({
        type: 'email',
        address: this.email,
        priority: this.email.indexOf('sales') !== -1 || this.email.indexOf('estimate') !== -1 ? 'high' : 'medium'
      });
    }

    if (this.contactForm) {
      methods.push({
        type: 'form',
        form: this.contactForm,
        priority: this.contactForm.isQuoteForm ? 'high' : 'medium'
      });
    }

    // 連絡方法がない場合は手動対応
    if (methods.length === 0) {
      methods.push({
        type: 'manual',
        priority: 'low'
      });
    }

    return methods;
  }

  /**
   * 連絡優先度を数値で取得（小さいほど優先度が高い）
   */
  public getContactPriority(): number {
    const preferredMethod = this.getPreferredContactMethod();

    switch (preferredMethod.priority) {
      case 'high':
        return 1;
      case 'medium':
        return 2;
      case 'low':
        return 3;
      default:
        return 999;
    }
  }

  /**
   * 優先連絡方法を取得
   */
  public getPreferredContactMethod(): ContactMethod {
    if (this.email && (this.email.indexOf('sales') !== -1 || this.email.indexOf('estimate') !== -1)) {
      return {
        type: 'email',
        address: this.email,
        priority: 'high'
      };
    }

    if (this.contactForm && this.contactForm.isQuoteForm) {
      return {
        type: 'form',
        form: this.contactForm,
        priority: 'high'
      };
    }

    if (this.email) {
      return {
        type: 'email',
        address: this.email,
        priority: 'medium'
      };
    }

    if (this.contactForm) {
      return {
        type: 'form',
        form: this.contactForm,
        priority: 'medium'
      };
    }

    return {
      type: 'manual',
      priority: 'low'
    };
  }
}

export interface ContactForm {
  url: string;
  fields: FormField[];
  isQuoteForm: boolean;
}

export interface FormField {
  name: string;
  type: string;
  required: boolean;
  placeholder?: string;
}

export interface ContactMethod {
  type: 'email' | 'form' | 'manual';
  address?: string;
  form?: ContactForm;
  priority: 'high' | 'medium' | 'low';
}
