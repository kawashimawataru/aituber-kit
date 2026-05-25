import { openDB, IDBPDatabase } from 'idb'

export interface SavedMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface DailyConversation {
  date: string // 'YYYY-MM-DD', keyPath
  messages: SavedMessage[]
  updatedAt: string
}

const DB_NAME = 'aituber-conversation-log'
const DB_VERSION = 1
const STORE_NAME = 'daily-conversations'

interface ConvLogDB {
  [STORE_NAME]: {
    key: string
    value: DailyConversation
  }
}

export class ConversationLogStore {
  private db: IDBPDatabase<ConvLogDB> | null = null

  async open(): Promise<void> {
    if (this.db) return
    this.db = await openDB<ConvLogDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'date' })
        }
      },
    })
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  private ensureOpen(): void {
    if (!this.db) throw new Error('ConversationLogStore not open')
  }

  async put(record: DailyConversation): Promise<void> {
    this.ensureOpen()
    await this.db!.put(STORE_NAME, record)
  }

  async get(date: string): Promise<DailyConversation | undefined> {
    this.ensureOpen()
    return this.db!.get(STORE_NAME, date)
  }

  async getAllDates(): Promise<string[]> {
    this.ensureOpen()
    const keys = await this.db!.getAllKeys(STORE_NAME)
    return (keys as string[]).sort()
  }

  async getAll(): Promise<DailyConversation[]> {
    this.ensureOpen()
    return this.db!.getAll(STORE_NAME)
  }

  async delete(date: string): Promise<void> {
    this.ensureOpen()
    await this.db!.delete(STORE_NAME, date)
  }

  async clear(): Promise<void> {
    this.ensureOpen()
    await this.db!.clear(STORE_NAME)
  }
}
