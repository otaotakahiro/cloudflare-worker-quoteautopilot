<script lang="ts" setup>
import { ref, onMounted } from 'vue';

interface Props {
  invoiceId: string;
}

const props = defineProps<Props>();

const loading = ref(true);
const error = ref<string | null>(null);
const invoiceData = ref<any>(null);
const companies = ref<any[]>([]);

/**
 * 請求書データを取得
 */
async function fetchInvoiceData(): Promise<void> {
  try {
    const response = await fetch(`/api/invoices/${props.invoiceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`請求書データの取得に失敗しました: ${response.status}`);
    }

    const data = await response.json();
    invoiceData.value = data;
  } catch (err) {
    console.error('請求書データ取得エラー:', err);
    error.value = err instanceof Error ? err.message : '請求書データの取得に失敗しました';
  }
}

/**
 * 企業検索を実行
 */
async function fetchCompanies(): Promise<void> {
  try {
    const response = await fetch(`/api/companies/search?invoiceId=${props.invoiceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`企業検索に失敗しました: ${response.status}`);
    }

    const data = await response.json();
    companies.value = data.companies || [];
  } catch (err) {
    console.error('企業検索エラー:', err);
    error.value = err instanceof Error ? err.message : '企業検索に失敗しました';
  }
}

/**
 * 連絡方法のアイコンを取得
 */
function getContactIcon(type: string): string {
  switch (type) {
    case 'email': return '📧';
    case 'form': return '📝';
    default: return '📞';
  }
}

/**
 * 優先度の表示文字列を取得
 */
function getPriorityText(priority: string): string {
  switch (priority) {
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return '-';
  }
}

/**
 * 優先度のクラス名を取得
 */
function getPriorityClass(priority: string): string {
  return `priority${priority.charAt(0).toUpperCase() + priority.slice(1)}`;
}

/**
 * 見積もり依頼を送信
 */
async function sendQuoteRequest(company: any): Promise<void> {
  try {
    // TODO: 見積もり依頼API実装時に更新
    alert(`${company.name}に見積もり依頼を送信しました（開発中）`);
  } catch (err) {
    console.error('見積もり依頼エラー:', err);
    alert('見積もり依頼の送信に失敗しました');
  }
}

/**
 * データを再読み込み
 */
async function reloadData(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    await Promise.all([
      fetchInvoiceData(),
      fetchCompanies()
    ]);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await reloadData();
});
</script>

<template>
  <div :class="$style.container">
    <!-- エラー表示 -->
    <div v-if="error" :class="$style.error">
      <h3>⚠️ エラーが発生しました</h3>
      <p>{{ error }}</p>
      <button :class="$style.retryButton" @click="reloadData">
        🔄 再試行
      </button>
    </div>

    <!-- ローディング -->
    <div v-else-if="loading" :class="$style.loading">
      <div :class="$style.spinner"></div>
      <p>解析結果を読み込み中...</p>
    </div>

    <!-- 結果表示 -->
    <div v-else-if="invoiceData" :class="$style.results">
      <!-- 請求書解析結果 -->
      <div :class="$style.section">
        <h2 :class="$style.sectionTitle">📄 請求書解析結果</h2>
        <div :class="$style.card">
          <div :class="$style.invoiceInfo">
            <div :class="$style.infoRow">
              <span :class="$style.label">ファイル名:</span>
              <span :class="$style.value">{{ invoiceData.fileName }}</span>
            </div>
            <div :class="$style.infoRow">
              <span :class="$style.label">企業名:</span>
              <span :class="$style.value">{{ invoiceData.companyName || '不明' }}</span>
            </div>
            <div :class="$style.infoRow" v-if="invoiceData.businessCategory">
              <span :class="$style.label">業務カテゴリ:</span>
              <span :class="$style.categoryBadge">{{ invoiceData.businessCategory }}</span>
            </div>
            <div :class="$style.infoRow" v-if="invoiceData.services && invoiceData.services.length > 0">
              <span :class="$style.label">サービス内容:</span>
              <div :class="$style.services">
                <span
                  v-for="service in invoiceData.services"
                  :key="service"
                  :class="$style.serviceBadge"
                >
                  {{ service }}
                </span>
              </div>
            </div>
            <div :class="$style.infoRow" v-if="invoiceData.totalAmount">
              <span :class="$style.label">金額:</span>
              <span :class="$style.amount">¥{{ invoiceData.totalAmount.toLocaleString() }}</span>
            </div>
            <div :class="$style.infoRow" v-if="invoiceData.uploadedAt">
              <span :class="$style.label">処理日時:</span>
              <span :class="$style.value">{{ new Date(invoiceData.uploadedAt).toLocaleString('ja-JP') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 企業検索結果 -->
      <div :class="$style.section">
        <h2 :class="$style.sectionTitle">🔍 見積もり先企業</h2>
        <p :class="$style.sectionSubtitle">{{ companies.length }}社の企業が見つかりました</p>

        <div v-if="companies.length === 0" :class="$style.noResults">
          <p>該当する企業が見つかりませんでした。</p>
          <button :class="$style.retryButton" @click="reloadData">
            🔄 再検索
          </button>
        </div>

        <div v-else :class="$style.companiesList">
          <div
            v-for="company in companies"
            :key="company.id"
            :class="$style.companyCard"
          >
            <div :class="$style.companyHeader">
              <h3 :class="$style.companyName">{{ company.name }}</h3>
              <div :class="[$style.priorityBadge, $style[getPriorityClass(company.contactPriority)]]">
                優先度: {{ getPriorityText(company.contactPriority) }}
              </div>
            </div>

            <div :class="$style.companyInfo">
              <p :class="$style.companyDescription">{{ company.description || '説明なし' }}</p>
              <div :class="$style.industryInfo" v-if="company.industry">
                <span :class="$style.industryBadge">{{ company.industry }}</span>
              </div>
              <div :class="$style.contactInfo">
                <span :class="$style.contactIcon">{{ getContactIcon(company.contactMethod) }}</span>
                <span :class="$style.contactText">
                  <template v-if="company.contactMethod === 'email'">
                    メール: {{ company.email || '未設定' }}
                  </template>
                  <template v-else-if="company.contactMethod === 'form'">
                    お問い合わせフォーム
                  </template>
                  <template v-else>
                    手動対応が必要
                  </template>
                </span>
              </div>
            </div>

            <div :class="$style.companyActions">
              <button
                :class="$style.quoteButton"
                @click="sendQuoteRequest(company)"
              >
                見積もり依頼
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- データなし -->
    <div v-else :class="$style.noData">
      <h3>📭 データが見つかりません</h3>
      <p>請求書ID: {{ props.invoiceId }}</p>
      <button :class="$style.retryButton" @click="reloadData">
        🔄 再読み込み
      </button>
    </div>
  </div>
</template>

<style lang="scss" module>
.container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}

.loading {
  text-align: center;
  color: white;

  .spinner {
    width: 50px;
    height: 50px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top: 3px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.results {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.sectionTitle {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: #333;
}

.sectionSubtitle {
  color: #666;
  margin: 0 0 1.5rem;
}

.card {
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  border: 1px solid #eee;
}

.invoiceInfo {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.infoRow {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.label {
  font-weight: 600;
  color: #555;
  min-width: 120px;
  flex-shrink: 0;
}

.value {
  color: #333;
}

.categoryBadge {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.services {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.serviceBadge {
  background: #f0f8ff;
  color: #2563eb;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid #e0e7ff;
}

.amount {
  font-size: 1.2rem;
  font-weight: 700;
  color: #059669;
}

.companiesList {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.companyCard {
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  border: 1px solid #eee;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
}

.companyHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.companyName {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.priorityBadge {
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;

  &.priorityHigh {
    background: #fee2e2;
    color: #dc2626;
  }

  &.priorityMedium {
    background: #fef3c7;
    color: #d97706;
  }

  &.priorityLow {
    background: #f3f4f6;
    color: #6b7280;
  }
}

.companyInfo {
  margin-bottom: 1rem;
}

.companyDescription {
  color: #666;
  margin: 0 0 0.8rem;
  line-height: 1.5;
}

.industryInfo {
  margin-bottom: 0.8rem;
}

.industryBadge {
  background: #f3f4f6;
  color: #6b7280;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.contactInfo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #555;
}

.contactIcon {
  font-size: 1.1rem;
}

.companyActions {
  display: flex;
  justify-content: flex-end;
}

.quoteButton {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 0.7rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(102, 126, 234, 0.4);
  }
}

.error {
  text-align: center;
  color: #dc2626;
  margin: 1rem 0;
}

.retryButton {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 0.7rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(102, 126, 234, 0.4);
  }
}

.noResults {
  text-align: center;
  color: #666;
  margin: 1rem 0;
}

.noData {
  text-align: center;
  color: #666;
  margin: 1rem 0;
}
</style>
