// tests/hooks/common/valentinaTestContext.ts
export interface ValentinaTestContext {
  // Data Sources
  databaseId: string;
  dataSourceId: string;
  // Comments
  pageId: string;
  commentId: string;
  // File Uploads
  fileUploadId: string;
  // Cleanup tracking
  createdIds: string[];
}

export class ValentinaTestContextManager {
  private static instance: ValentinaTestContextManager;
  private context: ValentinaTestContext;

  private constructor() {
    this.context = {
      databaseId: process.env.NOTION_DATABASE_ID || '',
      dataSourceId: '',
      pageId: process.env.NOTION_PAGE_ID || '',
      commentId: '',
      fileUploadId: '',
      createdIds: [],
    };
  }

  static getInstance(): ValentinaTestContextManager {
    if (!ValentinaTestContextManager.instance) {
      ValentinaTestContextManager.instance = new ValentinaTestContextManager();
    }
    return ValentinaTestContextManager.instance;
  }

  get<K extends keyof ValentinaTestContext>(key: K): ValentinaTestContext[K] {
    return this.context[key];
  }

  set<K extends keyof ValentinaTestContext>(key: K, value: ValentinaTestContext[K]): void {
    this.context[key] = value;
  }

  addCreatedId(id: string): void {
    this.context.createdIds.push(id);
  }

  reset(): void {
    this.context = {
      databaseId: process.env.NOTION_DATABASE_ID || '',
      dataSourceId: '',
      pageId: process.env.NOTION_PAGE_ID || '',
      commentId: '',
      fileUploadId: '',
      createdIds: [],
    };
  }
}