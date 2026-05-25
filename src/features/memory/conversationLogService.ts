import {
  ConversationLogStore,
  DailyConversation,
  SavedMessage,
} from './conversationLogStore'

export type { DailyConversation, SavedMessage }

export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayString(): string {
  return toDateString(new Date())
}

class ConversationLogService {
  private store = new ConversationLogStore()
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return
    try {
      await this.store.open()
      this.initialized = true
    } catch (e) {
      console.warn('ConversationLogService: init failed', e)
    }
  }

  isAvailable(): boolean {
    return this.initialized
  }

  /** 1日分の会話を上書き保存 */
  async saveDay(date: string, messages: SavedMessage[]): Promise<void> {
    if (!this.initialized) return
    try {
      await this.store.put({
        date,
        messages,
        updatedAt: new Date().toISOString(),
      })
    } catch (e) {
      console.warn('ConversationLogService: saveDay failed', e)
    }
  }

  /** 1日分の会話を取得 */
  async getDay(date: string): Promise<DailyConversation | null> {
    if (!this.initialized) return null
    return (await this.store.get(date)) ?? null
  }

  /** 会話が存在する日付一覧を返す */
  async getAllDates(): Promise<string[]> {
    if (!this.initialized) return []
    return this.store.getAllDates()
  }

  /** 指定月に会話が存在する日付一覧 */
  async getDatesInMonth(year: number, month: number): Promise<Set<string>> {
    const all = await this.getAllDates()
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return new Set(all.filter((d) => d.startsWith(prefix)))
  }

  /** 指定日を削除 */
  async deleteDay(date: string): Promise<void> {
    if (!this.initialized) return
    await this.store.delete(date)
  }

  /** 全履歴を削除 */
  async clearAll(): Promise<void> {
    if (!this.initialized) return
    await this.store.clear()
  }

  /** 全件数を返す */
  async getTotalDays(): Promise<number> {
    if (!this.initialized) return 0
    return (await this.store.getAllDates()).length
  }
}

let _instance: ConversationLogService | null = null

export function getConversationLogService(): ConversationLogService {
  if (!_instance) _instance = new ConversationLogService()
  return _instance
}
