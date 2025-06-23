<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isUploading = ref(false);
const uploadProgress = ref(0);
const selectedFile = ref<File | null>(null);
const dragOver = ref(false);
const errorMessage = ref<string>('');

/**
 * ファイル選択ハンドラー
 */
function handleFileSelect(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    selectedFile.value = input.files[0];
    errorMessage.value = '';
  }
}

/**
 * ドラッグオーバーハンドラー
 */
function handleDragOver(event: DragEvent): void {
  event.preventDefault();
  dragOver.value = true;
}

/**
 * ドラッグリーブハンドラー
 */
function handleDragLeave(): void {
  dragOver.value = false;
}

/**
 * ファイルドロップハンドラー
 */
function handleDrop(event: DragEvent): void {
  event.preventDefault();
  dragOver.value = false;

  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    selectedFile.value = event.dataTransfer.files[0];
    errorMessage.value = '';
  }
}

/**
 * 請求書アップロードAPI呼び出し
 */
async function uploadToAPI(file: File): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/invoices/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return await response.json();
}

/**
 * アップロード処理
 */
async function uploadFile(): Promise<void> {
  if (!selectedFile.value) {
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;
  errorMessage.value = '';

  try {
    // プログレス更新
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 15;
      }
    }, 300);

    // 実際のAPI呼び出し
    const result = await uploadToAPI(selectedFile.value);

    // プログレス完了
    clearInterval(progressInterval);
    uploadProgress.value = 100;

    if (result.success && result.invoiceId) {
      // 成功時は結果ページに遷移
      setTimeout(() => {
        router.push(`/results/${result.invoiceId}`);
      }, 500);
    } else {
      throw new Error(result.error || 'Upload failed');
    }

  } catch (error) {
    console.error('アップロードエラー:', error);
    errorMessage.value = error instanceof Error ? error.message : 'アップロードに失敗しました';
    isUploading.value = false;
    uploadProgress.value = 0;
  }
}

/**
 * ファイルクリア
 */
function clearFile(): void {
  selectedFile.value = null;
  errorMessage.value = '';
}
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.uploadCard">
      <h2 :class="$style.cardTitle">請求書をアップロード</h2>

      <!-- エラーメッセージ -->
      <div v-if="errorMessage" :class="$style.errorMessage">
        ⚠️ {{ errorMessage }}
      </div>

      <!-- ファイルドロップエリア -->
      <div
        :class="[
          $style.dropArea,
          { [$style.dragOver]: dragOver },
          { [$style.hasFile]: selectedFile }
        ]"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <div v-if="!selectedFile" :class="$style.dropContent">
          <div :class="$style.uploadIcon">📄</div>
          <p :class="$style.dropText">
            PDFファイルをドラッグ＆ドロップ<br>
            または<br>
            <label :class="$style.fileLabel">
              ファイルを選択
              <input
                type="file"
                accept=".pdf"
                :class="$style.fileInput"
                @change="handleFileSelect"
              >
            </label>
          </p>
          <p :class="$style.hint">対応形式: PDF (最大10MB)</p>
        </div>

        <div v-else :class="$style.fileInfo">
          <div :class="$style.fileName">{{ selectedFile.name }}</div>
          <div :class="$style.fileSize">{{ Math.round(selectedFile.size / 1024) }}KB</div>
          <button :class="$style.clearButton" @click="clearFile">×</button>
        </div>
      </div>

      <!-- アップロードボタン -->
      <button
        :class="[
          $style.uploadButton,
          { [$style.uploading]: isUploading }
        ]"
        :disabled="!selectedFile || isUploading"
        @click="uploadFile"
      >
        <span v-if="!isUploading">解析開始</span>
        <span v-else>解析中...</span>
      </button>

      <!-- プログレスバー -->
      <div v-if="isUploading" :class="$style.progressContainer">
        <div :class="$style.progressBar">
          <div
            :class="$style.progressFill"
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>
        <div :class="$style.progressText">{{ uploadProgress }}%</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" module>
.container {
  width: 100%;
  max-width: 600px;
}

.uploadCard {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 3rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.cardTitle {
  text-align: center;
  margin: 0 0 2rem;
  font-size: 1.8rem;
  color: #333;
  font-weight: 600;
}

.dropArea {
  border: 2px dashed #ccc;
  border-radius: 15px;
  padding: 3rem 2rem;
  text-align: center;
  transition: all 0.3s ease;
  margin-bottom: 1.5rem;
  background: #fafafa;

  &.dragOver {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.1);
  }

  &.hasFile {
    border-color: #4CAF50;
    background: rgba(76, 175, 80, 0.1);
  }
}

.dropContent {
  color: #666;
}

.uploadIcon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.dropText {
  font-size: 1.1rem;
  margin: 0 0 1rem;
  line-height: 1.6;
}

.fileLabel {
  color: #667eea;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 600;

  &:hover {
    color: #5a6fd8;
  }
}

.fileInput {
  display: none;
}

.hint {
  font-size: 0.9rem;
  color: #999;
  margin: 0;
}

.fileInfo {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 10px;
  position: relative;
}

.fileName {
  flex: 1;
  font-weight: 600;
  color: #333;
}

.fileSize {
  color: #666;
  font-size: 0.9rem;
}

.clearButton {
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;

  &:hover {
    background: #cc3333;
  }
}

.uploadButton {
  width: 100%;
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.uploading {
    background: #999;
  }
}

.progressContainer {
  margin-top: 1rem;
  text-align: center;
}

.progressBar {
  background: #eee;
  border-radius: 10px;
  height: 8px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progressFill {
  background: linear-gradient(45deg, #667eea, #764ba2);
  height: 100%;
  transition: width 0.3s ease;
}

.progressText {
  font-size: 0.9rem;
  color: #666;
  font-weight: 600;
}

.errorMessage {
  background: rgba(255, 68, 68, 0.1);
  color: #ff4444;
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 68, 68, 0.3);
}
</style>
