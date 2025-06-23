/**
 * Cloudflare Workers環境用のDOM APIポリフィル
 * PDF.jsなどのブラウザ専用ライブラリを動作させるために必要
 */
export class WorkerPolyfillService {

  /**
   * 全てのポリフィルを初期化
   */
  public static initialize(): void {
    WorkerPolyfillService.setupDOMMatrix();
    WorkerPolyfillService.setupDocument();
    WorkerPolyfillService.setupWindow();
    WorkerPolyfillService.setupCanvas();
    WorkerPolyfillService.setupOtherAPIs();
  }

  /**
   * DOMMatrixポリフィル
   */
  private static setupDOMMatrix(): void {
    if (typeof globalThis.DOMMatrix !== 'undefined') {
      return; // 既に定義済み
    }

    globalThis.DOMMatrix = class DOMMatrix {
      public a = 1;
      public b = 0;
      public c = 0;
      public d = 1;
      public e = 0;
      public f = 0;

      constructor(init?: string | number[]) {
        if (Array.isArray(init) && init.length >= 6) {
          this.a = init[0] || 1;
          this.b = init[1] || 0;
          this.c = init[2] || 0;
          this.d = init[3] || 1;
          this.e = init[4] || 0;
          this.f = init[5] || 0;
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

      // 静的メソッドのスタブ
      public static fromFloat32Array(): DOMMatrix {
        return new DOMMatrix();
      }

      public static fromFloat64Array(): DOMMatrix {
        return new DOMMatrix();
      }

      public static fromMatrix(): DOMMatrix {
        return new DOMMatrix();
      }
    } as any;
  }

  /**
   * Documentポリフィル
   */
  private static setupDocument(): void {
    if (typeof globalThis.document !== 'undefined') {
      return;
    }

    globalThis.document = {
      createElement: (tagName: string) => ({
        tagName: tagName.toUpperCase(),
        style: {},
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        removeChild: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        getContext: () => ({
          fillRect: () => {},
          clearRect: () => {},
          getImageData: () => ({ data: new Uint8ClampedArray(4) }),
          putImageData: () => {},
          createImageData: () => ({ data: new Uint8ClampedArray(4) }),
          setTransform: () => {},
          drawImage: () => {},
          save: () => {},
          restore: () => {},
          scale: () => {},
          rotate: () => {},
          translate: () => {},
          transform: () => {},
          beginPath: () => {},
          closePath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          bezierCurveTo: () => {},
          quadraticCurveTo: () => {},
          arc: () => {},
          arcTo: () => {},
          ellipse: () => {},
          rect: () => {},
          fill: () => {},
          stroke: () => {},
          clip: () => {},
          isPointInPath: () => false,
          isPointInStroke: () => false,
          measureText: () => ({ width: 0 }),
          createLinearGradient: () => ({}),
          createRadialGradient: () => ({}),
          createPattern: () => ({}),
        })
      }),
      createElementNS: (namespace: string, tagName: string) => ({
        tagName: tagName.toUpperCase(),
        namespaceURI: namespace,
        style: {},
        setAttribute: () => {},
        getAttribute: () => null,
      }),
      head: {
        appendChild: () => {},
        removeChild: () => {}
      },
      body: {
        appendChild: () => {},
        removeChild: () => {}
      }
    } as any;
  }

  /**
   * Windowポリフィル
   */
  private static setupWindow(): void {
    if (typeof globalThis.window !== 'undefined') {
      return;
    }

    globalThis.window = {
      ...globalThis,
      document: globalThis.document,
      addEventListener: () => {},
      removeEventListener: () => {},
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      setInterval: globalThis.setInterval,
      clearInterval: globalThis.clearInterval,
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        return globalThis.setTimeout(callback, 16);
      },
      cancelAnimationFrame: (id: number) => {
        globalThis.clearTimeout(id);
      }
    } as any;
  }

  /**
   * Canvasポリフィル
   */
  private static setupCanvas(): void {
    if (typeof globalThis.HTMLCanvasElement !== 'undefined') {
      return;
    }

    globalThis.HTMLCanvasElement = class HTMLCanvasElement {
      public width = 300;
      public height = 150;

      public getContext(): any {
        return globalThis.document?.createElement('canvas').getContext();
      }

      public toDataURL(): string {
        return 'data:image/png;base64,';
      }
    } as any;

    globalThis.CanvasRenderingContext2D = class CanvasRenderingContext2D {} as any;
  }

  /**
   * その他のAPIポリフィル
   */
  private static setupOtherAPIs(): void {
    // URL.createObjectURL
    if (typeof globalThis.URL === 'undefined') {
      globalThis.URL = {
        createObjectURL: () => 'blob:',
        revokeObjectURL: () => {}
      } as any;
    }

    // Blob
    if (typeof globalThis.Blob === 'undefined') {
      globalThis.Blob = class Blob {
        constructor(public parts: any[], public options: any = {}) {}
        public slice(): Blob {
          return new Blob([]);
        }
      } as any;
    }

    // FileReader (既に存在する場合はスキップ)
    if (typeof globalThis.FileReader === 'undefined') {
      globalThis.FileReader = class FileReader {
        public result: any = null;
        public error: any = null;
        public readyState = 0;
        public onload: any = null;
        public onerror: any = null;

        public readAsArrayBuffer(file: any): void {
          // モック実装
          setTimeout(() => {
            this.result = new ArrayBuffer(0);
            if (this.onload) this.onload({ target: this });
          }, 0);
        }

        public readAsText(file: any): void {
          setTimeout(() => {
            this.result = '';
            if (this.onload) this.onload({ target: this });
          }, 0);
        }
      } as any;
    }
  }
}
