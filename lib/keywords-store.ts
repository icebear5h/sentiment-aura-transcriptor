/**
 * Simple pub-sub store for keywords that components can subscribe to.
 * Replaces old keywords with new ones (fade out old, show new).
 */

type Listener = (keywords: string[]) => void

class KeywordsStore {
  private keywords: string[] = []
  private listeners: Set<Listener> = new Set()

  setKeywords(newKeywords: string[]) {
    if (!Array.isArray(newKeywords)) return
    
    this.keywords = newKeywords
    console.log(`KeywordsStore: set ${newKeywords.length} keywords:`, newKeywords)
    this.notify()
  }

  addKeywords(newKeywords: string[]) {
    // For backwards compatibility - just replaces with new keywords
    this.setKeywords(newKeywords)
  }

  getKeywords(): string[] {
    return [...this.keywords]
  }

  clear() {
    this.keywords = []
    console.log('KeywordsStore: cleared')
    this.notify()
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    console.log(`KeywordsStore: subscriber added, total: ${this.listeners.size}`)
    
    // Immediately notify with current state
    listener(this.getKeywords())
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
      console.log(`KeywordsStore: subscriber removed, total: ${this.listeners.size}`)
    }
  }

  private notify() {
    const keywords = this.getKeywords()
    console.log(`KeywordsStore: notifying ${this.listeners.size} listeners with ${keywords.length} keywords`)
    this.listeners.forEach(listener => listener(keywords))
  }

  destroy() {
    this.listeners.clear()
    this.keywords = []
  }
}

// Singleton instance
export const keywordsStore = new KeywordsStore()
