import { useEffect, useRef, Dispatch, SetStateAction } from 'react'
import { keywordsStore } from '@/lib/keywords-store'

interface KeywordWithTimestamp {
  keyword: string
  timestamp: number
}

const KEYWORD_DECAY_TIME = 50000 // 50 seconds

// Emotion keyword pools for simulation mode
const emotionKeywordPools = {
  calm: ['peaceful', 'serene', 'tranquil', 'gentle', 'soft', 'quiet', 'still', 'relaxed', 'calm', 'soothing', 'mellow', 'placid'],
  meditative: ['contemplative', 'reflective', 'mindful', 'centered', 'balanced', 'focused', 'present', 'aware', 'grounded'],
  energetic: ['vibrant', 'dynamic', 'energetic', 'lively', 'spirited', 'electric', 'intense', 'powerful', 'active', 'vigorous'],
  excited: ['thrilled', 'exhilarated', 'animated', 'enthusiastic', 'eager', 'zealous', 'pumped', 'hyped', 'stimulated'],
  euphoric: ['euphoric', 'ecstatic', 'elated', 'rapturous', 'overjoyed', 'exultant', 'jubilant', 'triumphant', 'blissful'],
  chaotic: ['turbulent', 'chaotic', 'frantic', 'wild', 'unstable', 'erratic', 'volatile', 'scattered', 'hectic', 'confused', 'disoriented'],
  frantic: ['frenzied', 'manic', 'feverish', 'desperate', 'panicked', 'rushed', 'harried', 'agitated', 'flustered'],
  happy: ['joyful', 'happy', 'cheerful', 'bright', 'radiant', 'delighted', 'blissful', 'uplifting', 'pleasant', 'gleeful'],
  playful: ['playful', 'whimsical', 'lighthearted', 'mischievous', 'spirited', 'fun', 'amusing', 'entertaining', 'jovial'],
  sad: ['melancholy', 'somber', 'wistful', 'pensive', 'subdued', 'muted', 'sad', 'gloomy', 'heavy', 'sorrowful'],
  melancholic: ['melancholic', 'mournful', 'elegiac', 'plaintive', 'doleful', 'lugubrious', 'wistful', 'nostalgic', 'yearning'],
  despairing: ['despairing', 'hopeless', 'desolate', 'forlorn', 'dejected', 'disheartened', 'disconsolate', 'woeful'],
  anxious: ['anxious', 'tense', 'nervous', 'uneasy', 'restless', 'agitated', 'jittery', 'worried', 'uncertain', 'uncomfortable'],
  fearful: ['fearful', 'apprehensive', 'dreadful', 'terrified', 'alarmed', 'intimidated', 'timid', 'tremulous', 'scared'],
  angry: ['angry', 'furious', 'irate', 'enraged', 'livid', 'incensed', 'wrathful', 'indignant', 'hostile', 'fierce'],
  irritated: ['irritated', 'annoyed', 'vexed', 'aggravated', 'exasperated', 'frustrated', 'perturbed', 'irked'],
  mysterious: ['mysterious', 'enigmatic', 'ethereal', 'cosmic', 'dreamy', 'surreal', 'otherworldly', 'mystical', 'strange', 'ambiguous'],
  awe: ['awestruck', 'amazed', 'wonderstruck', 'astonished', 'dazzled', 'stupefied', 'spellbound', 'entranced'],
  confident: ['confident', 'certain', 'clear', 'assured', 'bold', 'strong', 'decisive', 'firm', 'resolute', 'determined'],
  powerful: ['powerful', 'mighty', 'formidable', 'commanding', 'authoritative', 'dominant', 'imposing', 'robust'],
  warm: ['warm', 'cozy', 'comfortable', 'inviting', 'tender', 'affectionate', 'loving', 'caring', 'nurturing', 'compassionate'],
  romantic: ['romantic', 'passionate', 'ardent', 'amorous', 'enamored', 'devoted', 'intimate', 'fervent', 'swooning'],
  cold: ['cold', 'distant', 'detached', 'aloof', 'remote', 'impersonal', 'frigid', 'icy', 'indifferent', 'withdrawn'],
  lonely: ['lonely', 'isolated', 'solitary', 'abandoned', 'forsaken', 'estranged', 'disconnected', 'alienated'],
  hopeful: ['hopeful', 'optimistic', 'promising', 'encouraging', 'uplifting', 'inspiring', 'heartening', 'buoyant'],
  nostalgic: ['nostalgic', 'wistful', 'reminiscent', 'sentimental', 'bittersweet', 'longing', 'remembering', 'evocative'],
  solemn: ['solemn', 'grave', 'serious', 'austere', 'dignified', 'formal', 'ceremonial', 'reverent', 'somber'],
  curious: ['curious', 'inquisitive', 'intrigued', 'fascinated', 'interested', 'exploring', 'wondering', 'questioning']
}

interface KeywordManagementOptions {
  isSimulating: boolean
  setKeywordsWithTimestamp: Dispatch<SetStateAction<KeywordWithTimestamp[]>>
  setKeywords: Dispatch<SetStateAction<string[]>>
}

/**
 * Manages keyword simulation and decay mechanisms
 */
export function useKeywordManagement(options: KeywordManagementOptions) {
  const { isSimulating, setKeywordsWithTimestamp, setKeywords } = options
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Simulation mode - generates keywords periodically
  useEffect(() => {
    if (!isSimulating) {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current)
      }
      return
    }

    let emotionIndex = 0
    const emotions = Object.keys(emotionKeywordPools) as Array<keyof typeof emotionKeywordPools>

    simulationIntervalRef.current = setInterval(() => {
      const currentEmotion = emotions[emotionIndex % emotions.length]
      const pool = emotionKeywordPools[currentEmotion]

      const count = Math.floor(Math.random() * 3) + 2
      const shuffled = [...pool].sort(() => Math.random() - 0.5)
      const selectedKeywords = shuffled.slice(0, count)

      const now = Date.now()
      const newKeywordsWithTimestamp = selectedKeywords.map((kw: string) => ({
        keyword: kw,
        timestamp: now
      }))

      console.log(`[SIMULATION] Adding ${currentEmotion} keywords:`, selectedKeywords)

      keywordsStore.addKeywords(selectedKeywords)

      setKeywordsWithTimestamp(prev => [...prev, ...newKeywordsWithTimestamp])
      setKeywords(prev => [...prev, ...selectedKeywords])

      emotionIndex++
    }, 10000)

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current)
      }
    }
  }, [isSimulating, setKeywordsWithTimestamp, setKeywords])

  // Keyword decay mechanism
  useEffect(() => {
    const decayInterval = setInterval(() => {
      const now = Date.now()
      setKeywordsWithTimestamp(prev => {
        const filtered = prev.filter(kw => now - kw.timestamp < KEYWORD_DECAY_TIME)
        if (filtered.length !== prev.length) {
          setKeywords(filtered.map(kw => kw.keyword))
        }
        return filtered
      })
    }, 5000)

    return () => clearInterval(decayInterval)
  }, [setKeywordsWithTimestamp, setKeywords])
}
