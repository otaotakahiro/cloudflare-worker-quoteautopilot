import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WorkerPolyfillService } from '../Service/WorkerPolyfill.service';
import { UploadInvoiceUseCase } from '../../../Shared/Application/UseCase/UploadInvoice.usecase';
import { SearchCompaniesUseCase } from '../../../Shared/Application/UseCase/SearchCompanies.usecase';
import { InvoiceKVRepository } from '../../../Database/Infrastructure/Repository/InvoiceKV.repository';
import { CompanyKVRepository } from '../../../Database/Infrastructure/Repository/CompanyKV.repository';

// Workers環境のポリフィルを初期化
WorkerPolyfillService.initialize();

/**
 * Cloudflare Workers用のエントリーポイント
 * HonoフレームワークでAPIエンドポイントを定義
 */
const app = new Hono<{
  Bindings: {
    INVOICE_KV: KVNamespace;
    COMPANY_KV: KVNamespace;
  };
}>();

// CORS設定
app.use('/api/*', cors({
  origin: ['https://localhost:5174', 'http://localhost:5174', 'https://localhost:5173', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ヘルスチェック用エンドポイント
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'QuoteAutopilot',
    version: '1.0.0',
    polyfills: 'enabled'
  });
});

// 請求書アップロード用エンドポイント
app.post('/api/invoices/upload', async (c) => {
  try {
    // Content-Typeチェック
    const contentType = c.req.header('Content-Type');
    if (!contentType || contentType.indexOf('multipart/form-data') === -1) {
      return c.json({
        success: false,
        error: 'Content-Type must be multipart/form-data'
      }, 400);
    }

    // FormDataからファイルを取得
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({
        success: false,
        error: 'No file provided'
      }, 400);
    }

    // ファイル形式チェック
    if (file.type !== 'application/pdf') {
      return c.json({
        success: false,
        error: 'Only PDF files are supported'
      }, 400);
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return c.json({
        success: false,
        error: 'File size must be less than 10MB'
      }, 400);
    }

    // KVリポジトリを初期化
    const invoiceRepository = new InvoiceKVRepository(c.env.INVOICE_KV);

    // UploadInvoiceUseCaseを実行
    const uploadUseCase = new UploadInvoiceUseCase(invoiceRepository);
    const result = await uploadUseCase.execute(file);

    if (result.success) {
      return c.json({
        success: true,
        invoiceId: result.invoiceId,
        message: 'Invoice uploaded and processed successfully'
      });
    } else {
      return c.json({
        success: false,
        error: result.error || 'Upload failed'
      }, 500);
    }

  } catch (error) {
    console.error('Upload endpoint error:', error);
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

// 企業検索用エンドポイント
app.get('/api/companies/search', async (c) => {
  try {
    const category = c.req.query('category');
    const invoiceId = c.req.query('invoiceId');
    const name = c.req.query('name');

    if (!category && !invoiceId && !name) {
      return c.json({
        success: false,
        error: 'At least one search parameter (category, invoiceId, or name) is required'
      }, 400);
    }

    // KVリポジトリを初期化
    const companyRepository = new CompanyKVRepository(c.env.COMPANY_KV);
    const invoiceRepository = new InvoiceKVRepository(c.env.INVOICE_KV);

    // SearchCompaniesUseCaseを実行
    const searchUseCase = new SearchCompaniesUseCase(companyRepository, invoiceRepository);
    let companies: import('../../../Shared/Domain/Entity/Company.entity').Company[] = [];

    if (invoiceId) {
      // 請求書IDに基づいて検索
      companies = await searchUseCase.executeByInvoiceId(invoiceId);
    } else if (category) {
      // カテゴリに基づいて検索
      companies = await searchUseCase.executeByCategory(category);
    } else if (name) {
      // 企業名で検索
      companies = await searchUseCase.executeByName(name);
    }

    // 連絡可能な企業のみフィルタリング
    const contactableCompanies = searchUseCase.filterContactableCompanies(companies);

    // 優先度順でソート
    const sortedCompanies = searchUseCase.sortByPriority(contactableCompanies);

    // レスポンス用にデータを整形
    const companiesData = sortedCompanies.map(company => ({
      id: company.id,
      name: company.name,
      website: company.website,
      email: company.email,
      contactForm: company.contactForm,
      industry: company.industry,
      description: company.description,
      contactMethods: company.getContactMethods(),
      contactPriority: company.getContactPriority(),
      preferredContactMethod: company.getPreferredContactMethod()
    }));

    return c.json({
      success: true,
      companies: companiesData,
      totalFound: companies.length,
      contactableCount: contactableCompanies.length,
      searchParams: {
        category,
        invoiceId,
        name
      }
    });

  } catch (error) {
    console.error('Search companies endpoint error:', error);
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

// 請求書取得エンドポイント
app.get('/api/invoices/:id', async (c) => {
  try {
    const invoiceId = c.req.param('id');

    if (!invoiceId) {
      return c.json({
        success: false,
        error: 'Invoice ID is required'
      }, 400);
    }

    // KVリポジトリを初期化
    const invoiceRepository = new InvoiceKVRepository(c.env.INVOICE_KV);
    const invoice = await invoiceRepository.findById(invoiceId);

    if (!invoice) {
      return c.json({
        success: false,
        error: 'Invoice not found'
      }, 404);
    }

    return c.json({
      success: true,
      invoice: {
        id: invoice.id,
        fileName: invoice.fileName,
        companyName: invoice.companyName,
        businessCategory: invoice.identifyBusinessCategory(),
        services: invoice.services,
        totalAmount: invoice.totalAmount,
        uploadedAt: invoice.uploadedAt.toISOString(),
        summary: invoice.generateQuoteSummary()
      }
    });

  } catch (error) {
    console.error('Get invoice endpoint error:', error);
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

// SPAルーティング（静的ファイル配信）
app.get('*', async (c) => {
  // 静的ファイルまたはSPAのindex.htmlを返す
  return c.text('SPA routing - index.html', 200);
});

export default app;
