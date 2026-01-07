# Sentiment Aura Transcriptor

A full-stack web application that performs **real-time audio transcription** and visualizes the speaker's **emotional sentiment and key topics** as a live, generative art display powered by 3D Perlin noise particle simulations.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technical Architecture](#technical-architecture)
3. [Detailed Data Flow](#detailed-data-flow)
4. [Component Deep Dive](#component-deep-dive)
5. [Visualization System](#visualization-system)
6. [Parameter Transition System](#parameter-transition-system)
7. [Error Handling & Edge Cases](#error-handling--edge-cases)
8. [Getting Started](#getting-started)
9. [File Structure](#file-structure)

---

## System Overview

This application implements a **three-part architecture** as specified in the requirements:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     REACT FRONTEND (Next.js 15)                      │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │  │ Microphone   │  │ Transcript   │  │ 3D Perlin Noise          │  │   │
│  │  │ Audio Stream │  │ Display      │  │ Particle Visualization   │  │   │
│  │  └──────┬───────┘  └──────────────┘  └──────────────────────────┘  │   │
│  │         │                                        ▲                   │   │
│  │         │ Raw PCM Audio                         │ params (colors,   │   │
│  │         ▼                                        │ speed, turbulence)│   │
│  │  ┌──────────────┐                         ┌─────┴──────────────┐    │   │
│  │  │ WebSocket    │                         │ Parameter          │    │   │
│  │  │ Connection   │                         │ Transition System  │    │   │
│  │  └──────┬───────┘                         └─────▲──────────────┘    │   │
│  └─────────┼───────────────────────────────────────┼────────────────────┘   │
│            │                                        │                        │
└────────────┼────────────────────────────────────────┼────────────────────────┘
             │                                        │
             │ wss://api.deepgram.com                │ HTTP POST /process_text
             ▼                                        │
┌────────────────────────┐                 ┌─────────┴────────────────────────┐
│   DEEPGRAM API         │                 │      FASTAPI BACKEND             │
│   (External Service)   │                 │      (Python, port 8000)         │
│                        │                 │                                   │
│  - Receives raw audio  │                 │  1. Receives transcript text     │
│  - Returns JSON:       │                 │  2. Calls Groq LLM API           │
│    {                   │                 │  3. Extracts sentiment + keywords│
│      "text": "...",    │                 │  4. Translates keywords → params │
│      "is_final": true  │                 │  5. Returns structured JSON      │
│    }                   │                 │                                   │
└────────────────────────┘                 └───────────────┬───────────────────┘
                                                           │
                                                           │ Groq API call
                                                           ▼
                                           ┌───────────────────────────────────┐
                                           │        GROQ LLM API               │
                                           │        (External Service)         │
                                           │                                   │
                                           │  Model: llama-3.3-70b-versatile   │
                                           │  - Sentiment analysis             │
                                           │  - Keyword extraction             │
                                           │  - Parameter generation           │
                                           └───────────────────────────────────┘
```

---

## Technical Architecture

### Part 1: Frontend (React Application)

**Location:** `/app`, `/components`, `/hooks`, `/lib`

**Role:** Captures audio, manages the real-time transcription connection, displays the UI, and renders the visualization.

**Technologies:**
- **Next.js 15** (App Router) - React framework with server-side capabilities
- **React Three Fiber + Three.js** - 3D WebGL rendering (replaces p5.js for better performance)
- **Framer Motion** - Smooth UI animations for keywords fading in
- **Tailwind CSS + shadcn/ui** - Modern, clean UI components
- **TypeScript** - Type safety throughout

**Key Files:**
| File | Purpose |
|------|---------|
| `app/perlin/page.tsx` | Main orchestration component - manages all state and coordinates subsystems |
| `components/perlin-noise-particles.tsx` | 3D Perlin noise particle simulation (~1100 lines) |
| `components/transcript-display.tsx` | Semi-transparent auto-scrolling transcript panel |
| `components/keywords-display.tsx` | Animated keyword display with fade-in effects |
| `components/controls.tsx` | Start/Stop button with recording indicator |
| `lib/deepgram.ts` | Deepgram WebSocket client wrapper |
| `hooks/useTranscriptHandler.ts` | Processes transcripts and calls backend |
| `hooks/useParameterAnimation.ts` | Smooth parameter transitions (~60fps) |

### Part 2: Backend (FastAPI/Python Proxy)

**Location:** `/fastapi`

**Role:** Receives text from the frontend, securely calls Groq LLM API, and passes structured response back. Does NOT host local NLP models.

**Technologies:**
- **FastAPI** - High-performance Python web framework
- **Groq SDK** - LLM API client (async)
- **Pydantic** - Request/response validation

**Key Files:**
| File | Purpose |
|------|---------|
| `fastapi/main.py` | FastAPI app setup, CORS, router mounting |
| `fastapi/routes/sentiment.py` | `/process_text` endpoint |
| `fastapi/services/llm_service.py` | Groq API call for sentiment extraction |
| `fastapi/services/parameter_service.py` | Groq API call for keyword→parameter translation |
| `fastapi/prompts.py` | LLM prompt templates |
| `fastapi/models.py` | Pydantic models for type validation |

### Part 3: External 3rd-Party APIs

**API 1 - Transcription (Deepgram):**
- **Protocol:** WebSocket (`wss://api.deepgram.com/v1/listen`)
- **Input:** Raw PCM audio stream from browser microphone
- **Output:** JSON payloads with transcribed text
  ```json
  {
    "type": "Results",
    "is_final": true,
    "speech_final": true,
    "channel": {
      "alternatives": [{
        "transcript": "Hello how are you doing today",
        "confidence": 0.98
      }]
    }
  }
  ```

**API 2 - AI Model (Groq with Llama 3.3 70B):**
- **Protocol:** HTTP REST
- **Purpose 1:** Sentiment analysis and keyword extraction
- **Purpose 2:** Keyword-to-visualization-parameter translation
- **Response Format:** Structured JSON with sentiment score, type, keywords, and particle parameters

---

## Detailed Data Flow

This section maps exactly to the **10-step data flow** specified in the requirements:

### Step 1: Start
**User clicks "Start"**

```typescript
// app/perlin/page.tsx - handleStartStop()
const handleStartStop = useCallback(() => {
  if (isRecording) {
    // Stop logic...
  } else {
    setIsRecording(true)  // Triggers useEffect
  }
}, [isRecording])
```

**React frontend requests mic access:**

```typescript
// lib/deepgram.ts - start()
const stream = await navigator.mediaDevices.getUserMedia({ 
  audio: {
    channelCount: 1,
    sampleRate: 16000,
  }
})
```

### Step 2: Stream
**React opens a WebSocket to Deepgram and begins streaming raw audio:**

```typescript
// lib/deepgram.ts
this.connection = this.client.listen.live({
  model: 'nova-2',
  language: 'en-US',
  punctuate: true,
  interim_results: true,
  smart_format: true,
})

// MediaRecorder captures audio chunks
this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
this.mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0 && this.connection) {
    this.connection.send(event.data)  // Send to Deepgram
  }
}
```

### Step 3: Transcribe
**Deepgram streams back JSON payloads:**

```typescript
// lib/deepgram.ts - event listener
this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
  const transcript = data.channel.alternatives[0]?.transcript
  const isFinal = data.is_final
  
  if (transcript && this.config.onTranscript) {
    this.config.onTranscript(transcript, isFinal)
  }
})
```

### Step 4: Display
**React frontend displays text in TranscriptDisplay:**

```typescript
// hooks/useTranscriptHandler.ts
const handleTranscript = useCallback(async (transcriptText: string, isFinal: boolean) => {
  if (!isFinal) return  // Only process final transcripts
  
  const trimmedText = transcriptText.trim()
  if (!trimmedText || trimmedText.length < 3) return

  // IMMEDIATELY display in TranscriptDisplay
  setTranscript((prev) => [...prev, trimmedText])
  
  // Then proceed to backend call...
})
```

```tsx
// components/transcript-display.tsx
<div className="space-y-2 text-sm">
  {entries.map((entry, i) => (
    <motion.p
      key={i}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-white/90"
    >
      {entry}
    </motion.p>
  ))}
</div>
```

### Step 5: Proxy Call
**When `is_final: true`, React makes POST to backend:**

```typescript
// hooks/useTranscriptHandler.ts
// Prevent duplicate processing
if (processingQueueRef.current.has(trimmedText)) return
processingQueueRef.current.add(trimmedText)

setIsProcessing(true)

const result = await withRetry(() => processText(trimmedText), 2, 500)
```

```typescript
// lib/api.ts - processText()
export async function processText(text: string): Promise<SentimentResponse> {
  const response = await fetch('/api/process-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  return response.json()
}
```

```typescript
// app/api/process-text/route.ts - Next.js API route (proxy)
export async function POST(request: Request) {
  const { text } = await request.json()
  
  const response = await fetch(`${FASTAPI_URL}/process_text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  
  return Response.json(await response.json())
}
```

### Step 6: AI Call
**Backend receives text, constructs prompt, calls Groq API:**

```python
# fastapi/routes/sentiment.py
@router.post("/process_text", response_model=SentimentResponse)
async def process_text(request: TextProcessRequest):
    text = request.text
    
    # Step 6a: Extract sentiment and keywords
    sentiment_result = await process_sentiment(text)
    
    # Step 6b: Translate keywords to visualization parameters
    parameters = await translate_keywords_to_parameters(
        sentiment_result["keywords"],
        text
    )
    
    return SentimentResponse(
        sentiment=sentiment_result["sentiment"],
        sentiment_type=sentiment_result["sentiment_type"],
        keywords=sentiment_result["keywords"],
        parameters=parameters
    )
```

```python
# fastapi/services/llm_service.py - Sentiment extraction
async def process_sentiment(text: str) -> dict:
    completion = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{
            "role": "user",
            "content": SENTIMENT_ANALYSIS_PROMPT.format(text=text)
        }],
        temperature=0.3,
        max_tokens=150,
        response_format={"type": "json_object"}
    )
    # Returns: {"sentiment": 0.85, "sentiment_type": "positive", "keywords": ["joy", "excitement"]}
```

```python
# fastapi/services/parameter_service.py - Keyword → Parameter translation
async def translate_keywords_to_parameters(keywords: List[str], text: str):
    completion = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{
            "role": "user", 
            "content": KEYWORD_TRANSLATION_PROMPT.format(keywords=keywords, text=text)
        }],
        temperature=0.5,
        max_tokens=300,
        response_format={"type": "json_object"}
    )
    # Returns particle parameters: colors, speed, turbulence, flowPattern, etc.
```

### Step 7: AI Response
**Groq returns JSON to backend:**

```json
{
  "sentiment": 0.85,
  "sentiment_type": "positive",
  "keywords": ["joy", "excitement", "energy"],
  "parameters": {
    "particleCount": 3500,
    "particleSize": 0.025,
    "brightness": 0.9,
    "speed": 1.8,
    "timeScale": 1.2,
    "transitionSpeed": 0.75,
    "pulse": 0.8,
    "noiseScale": 0.9,
    "noiseStrength": 0.7,
    "flowDensity": 0.5,
    "turbulence": 0.6,
    "primaryColor": "#FFD700",
    "secondaryColor": "#FF6B35",
    "flowPattern": "spiral"
  }
}
```

### Step 8: Proxy Response
**Backend passes clean JSON back to React:**

```python
# fastapi/routes/sentiment.py
return SentimentResponse(
    sentiment=sentiment_result["sentiment"],
    sentiment_type=sentiment_result["sentiment_type"],
    keywords=sentiment_result["keywords"],
    parameters=parameters
)
```

### Step 9: State Update
**React app updates state:**

```typescript
// hooks/useTranscriptHandler.ts
const result = await withRetry(() => processText(trimmedText), 2, 500)

// Update sentiment state
setSentiment(result.sentiment)
setSentimentType(result.sentiment_type)

// Update keywords with timestamps for fade-in animation
const keywordsArray = Array.isArray(result.keywords) ? result.keywords : []
if (keywordsArray.length > 0) {
  keywordsStore.addKeywords(keywordsArray)  // Pub-sub pattern
  
  const now = Date.now()
  const newKeywordsWithTimestamp = keywordsArray.map((kw) => ({
    keyword: kw,
    timestamp: now
  }))
  setKeywordsWithTimestamp(prev => [...prev, ...newKeywordsWithTimestamp])
  setKeywords(prev => [...prev, ...keywordsArray])
}

// Apply visualization parameters (triggers smooth transition)
if (result.parameters) {
  applyParameterMapping(result.parameters)
}
```

### Step 10: React Render
**React passes state as props to visualization:**

```tsx
// app/perlin/page.tsx
<PerlinNoiseParticles
  params={params}  // Contains all visualization parameters
  isPaused={false}
/>
```

The `params` object flows through the component tree and drives the 3D particle simulation in real-time.

---

## Component Deep Dive

### TranscriptDisplay Component

**Purpose:** Semi-transparent panel showing live, auto-scrolling transcript.

**Implementation Details:**
- Uses Framer Motion for smooth entry animations
- Auto-scrolls to bottom when new entries arrive
- Glassmorphism styling (backdrop-blur, semi-transparent background)
- Truncates old entries to prevent memory issues

```tsx
// components/transcript-display.tsx
export function TranscriptDisplay({ entries }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to latest entry
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [entries])

  return (
    <div className="absolute bottom-4 left-4 w-80 max-h-48 overflow-y-auto
                    bg-black/30 backdrop-blur-md rounded-lg p-4 border border-white/10">
      {entries.map((entry, i) => (
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {entry}
        </motion.p>
      ))}
    </div>
  )
}
```

### KeywordsDisplay Component

**Purpose:** Displays keywords with graceful fade-in animations.

**Key Requirement:** "Keywords should fade in gracefully one by one, not just 'pop' in."

**Implementation:**
- Subscribes to `KeywordsStore` (pub-sub pattern)
- Uses Framer Motion's `AnimatePresence` for enter/exit animations
- Keywords fade in with staggered delays
- Old keywords fade out over time

```tsx
// components/keywords-display.tsx
export function KeywordsDisplay() {
  const [keywords, setKeywords] = useState<string[]>([])

  useEffect(() => {
    // Subscribe to keyword store
    const unsubscribe = keywordsStore.subscribe((newKeywords) => {
      setKeywords(newKeywords)
    })
    return unsubscribe
  }, [])

  return (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence>
        {keywords.map((keyword, index) => (
          <motion.span
            key={keyword}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ 
              duration: 0.5, 
              delay: index * 0.1  // Staggered fade-in
            }}
            className="px-3 py-1 bg-white/10 backdrop-blur rounded-full text-sm"
          >
            {keyword}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
```

### Controls Component

**Purpose:** Start/Stop button with recording state visualization.

```tsx
// components/controls.tsx
export function Controls({ isRecording, onToggle, connectionStatus }) {
  return (
    <div className="flex items-center gap-4">
      <Button onClick={onToggle} variant={isRecording ? "destructive" : "default"}>
        {isRecording ? "Stop" : "Start"}
      </Button>
      
      {/* Recording indicator */}
      <div className={cn(
        "w-3 h-3 rounded-full",
        isRecording ? "bg-red-500 animate-pulse" : "bg-gray-500"
      )} />
      
      <span className="text-sm text-white/60">
        {connectionStatus}
      </span>
    </div>
  )
}
```

---

## Visualization System

### Perlin Noise Particle Simulation

**File:** `components/perlin-noise-particles.tsx` (~1100 lines)

**Technology:** React Three Fiber + Three.js (chosen over p5.js for GPU-accelerated performance)

**Core Concept:** A 3D field of particles whose positions are influenced by Perlin noise, creating fluid, organic motion patterns.

### Visual Parameters Mapped to Emotion

| Parameter | Range | Emotional Mapping |
|-----------|-------|-------------------|
| `primaryColor` | Hex color | Dominant emotional hue (warm=energetic, cool=calm) |
| `secondaryColor` | Hex color | Accent/gradient color |
| `particleCount` | 500-10000 | Emotional intensity (more particles = stronger feeling) |
| `particleSize` | 0.005-0.1 | Emotional weight (larger = heavier emotions) |
| `speed` | 0.1-5.0 | Emotional energy (faster = more active state) |
| `turbulence` | 0.0-1.0 | Emotional chaos (higher = more agitated) |
| `noiseStrength` | 0.2-5.0 | Flow intensity |
| `flowPattern` | enum | Movement style: "free", "spiral", "converge", "expand", "wave" |
| `brightness` | 0.2-1.0 | Emotional clarity |
| `pulse` | 0.0-1.0 | Rhythmic breathing effect |

### Flow Patterns

```typescript
type FlowPattern = "free" | "spiral" | "converge" | "expand" | "wave"
```

- **free:** Particles drift organically following noise field
- **spiral:** Particles rotate around central axis (wonder, contemplation)
- **converge:** Particles pull toward center (focus, intensity)
- **expand:** Particles push outward (release, expansion)
- **wave:** Sinusoidal wave motion (rhythm, calm energy)

### Color Theory Implementation

The LLM prompt includes comprehensive color guidance:

```python
# fastapi/prompts.py (excerpt)
"""
Emotional Color Associations:
- Blues: calm, trust, introspection, serenity
- Purples: mystery, spirituality, creativity
- Greens: growth, renewal, peace
- Oranges: energy, enthusiasm, warmth
- Reds: passion, intensity, power

Mesmerizing Combinations:
- Deep blue → bright cyan: serene to transcendent
- Purple → magenta: mystical and intense
- Orange → gold → white: warmth ascending
"""
```

### Particle Update Loop

```typescript
// components/perlin-noise-particles.tsx - useFrame callback (runs every frame)
useFrame((state, delta) => {
  // For each particle:
  for (let i = 0; i < params.particleCount; i++) {
    const x = positions[i * 3]
    const y = positions[i * 3 + 1]
    const z = positions[i * 3 + 2]

    // Sample 3D Perlin noise at particle position
    const noiseValue = noise.noise3D(
      x * params.noiseScale,
      y * params.noiseScale,
      z * params.noiseScale + time
    )

    // Calculate flow direction based on pattern
    const [dirX, dirY, dirZ] = calculateDirection(params.flowPattern, x, y, z, time)

    // Apply velocity with noise influence
    positions[i * 3] += dirX * params.speed * params.noiseStrength * delta
    positions[i * 3 + 1] += dirY * params.speed * params.noiseStrength * delta
    positions[i * 3 + 2] += dirZ * params.speed * delta

    // Add turbulence
    positions[i * 3] += (Math.random() - 0.5) * params.turbulence * delta
    // ... similar for y, z
  }

  // Update Three.js buffer
  meshRef.current.instanceMatrix.needsUpdate = true
})
```

---

## Parameter Transition System

**Key Requirement:** Parameters must transition smoothly, not snap instantly.

### Overview

The parameter animation system ensures that when new visualization parameters arrive from the backend, they don't snap instantly but instead smoothly interpolate over time. This creates fluid, organic visual transitions.

### Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND RESPONSE                                   │
│                                                                              │
│  {                                                                           │
│    "parameters": {                                                           │
│      "primaryColor": "#FFD700",                                             │
│      "secondaryColor": "#FF6B35",                                           │
│      "particleCount": 3500,                                                 │
│      "brightness": 0.9,                                                     │
│      "speed": 1.8,                                                          │
│      "transitionSpeed": 0.75,                                               │
│      ...                                                                     │
│    }                                                                         │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    applyParameterMapping() - page.tsx                        │
│                                                                              │
│  This function receives the new parameters and sets up transitions:          │
│                                                                              │
│  1. COLORS (if changed):                                                     │
│     currentPrimaryColorRef.current = params.primaryColor    // Snapshot      │
│     targetPrimaryColorRef.current = mapping.primaryColor    // New target    │
│     colorTransitionProgressRef.current = 0.0                // Start!        │
│                                                                              │
│  2. PARTICLES (if changed):                                                  │
│     currentParticleCountRef.current = params.particleCount  // Snapshot      │
│     targetParticleCountRef.current = mapping.particleCount  // New target    │
│     particleTransitionProgressRef.current = 0.0             // Start!        │
│                                                                              │
│  3. NUMERIC PARAMS (always):                                                 │
│     numericParams.brightness.current.current = params.brightness             │
│     numericParams.brightness.target.current = mapping.brightness             │
│     numericTransitionProgressRef.current = 0.0              // Start!        │
│     transitionDurationRef.current = mapping.transitionSpeed // Duration      │
│                                                                              │
│  4. NON-TRANSITIONING (set immediately):                                     │
│     flowPattern, stability, sharpness, quantity, pulsing                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Progress refs set to 0.0
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               useParameterAnimation Hook - Animation Loop                    │
│                                                                              │
│  Runs via requestAnimationFrame (~60fps)                                     │
│                                                                              │
│  const animate = () => {                                                     │
│    const updates = {}  // Batch all changes                                  │
│                                                                              │
│    // COLOR TRANSITIONS (4.0 seconds)                                        │
│    if (colorTransitionProgressRef.current < 1.0) {                          │
│      colorTransitionProgressRef.current += 0.016 / 4.0  // ~250 frames      │
│      const t = easeInOut(colorTransitionProgressRef.current)                │
│      updates.primaryColor = interpolateColor(current, target, t)            │
│      updates.secondaryColor = interpolateColor(current, target, t)          │
│    }                                                                         │
│                                                                              │
│    // PARTICLE TRANSITIONS (3.0 seconds)                                     │
│    if (particleTransitionProgressRef.current < 1.0) {                       │
│      particleTransitionProgressRef.current += 0.016 / 3.0  // ~188 frames   │
│      const t = easeInOut(particleTransitionProgressRef.current)             │
│      updates.particleCount = interpolate(current, target, t)                │
│      updates.particleSize = interpolate(current, target, t)                 │
│    }                                                                         │
│                                                                              │
│    // NUMERIC TRANSITIONS (0.75 seconds default)                             │
│    if (numericTransitionProgressRef.current < 1.0) {                        │
│      numericTransitionProgressRef.current += 0.016 / duration  // ~47 frames│
│      const t = easeInOut(numericTransitionProgressRef.current)              │
│      updates.brightness = interpolate(current, target, t)                   │
│      updates.speed = interpolate(current, target, t)                        │
│      updates.turbulence = interpolate(current, target, t)                   │
│      // ... all 9 numeric params                                             │
│    }                                                                         │
│                                                                              │
│    // SINGLE STATE UPDATE (performance critical)                             │
│    if (hasUpdates) setParams(prev => ({ ...prev, ...updates }))             │
│                                                                              │
│    requestAnimationFrame(animate)                                            │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ params state updates
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PerlinNoiseParticles Component                           │
│                                                                              │
│  Receives updated params as prop, renders visualization                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Transition Durations

| Parameter Group | Duration | Reason |
|-----------------|----------|--------|
| **Colors** | 4.0 seconds | Slow color shifts feel more organic and mesmerizing |
| **Particle Count/Size** | 3.0 seconds | Gradual particle changes prevent jarring visual jumps |
| **Numeric Params** | 0.75 seconds (default) | Faster transitions for responsive feel; configurable via `transitionSpeed` |
| **Clarity Pulsing** | Continuous | Subtle sine wave animation for "breathing" effect |

### Ref Architecture

The system uses React `useRef` to store transition state outside of React's render cycle:

```typescript
// app/perlin/page.tsx - Ref definitions

// Color transition refs
const currentPrimaryColorRef = useRef("#00ffff")    // Where we ARE
const targetPrimaryColorRef = useRef("#00ffff")     // Where we're GOING
const colorTransitionProgressRef = useRef(1.0)      // 0.0 = start, 1.0 = done

// Particle transition refs  
const currentParticleCountRef = useRef(2000)
const targetParticleCountRef = useRef(2000)
const particleTransitionProgressRef = useRef(1.0)

// Numeric parameter refs (brightness, speed, turbulence, etc.)
const brightnessCurrentRef = useRef(0.8)
const brightnessTargetRef = useRef(0.8)
// ... 9 pairs total

// Grouped into memoized object for stable reference
const numericParams = useMemo(() => ({
  brightness: { current: brightnessCurrentRef, target: brightnessTargetRef },
  speed: { current: speedCurrentRef, target: speedTargetRef },
  // ... all 9 parameters
}), [])

const numericTransitionProgressRef = useRef(1.0)    // Shared progress for all
const transitionDurationRef = useRef(0.75)          // Duration from backend
```

**Why useRef instead of useState?**
- Refs don't trigger re-renders when updated
- The animation loop runs 60fps - using useState would cause 60 re-renders/second
- Refs are mutable and can be updated synchronously in the animation callback

### Interpolation Functions

```typescript
// utils/interpolation.ts

/**
 * Linear interpolation between two numbers
 * t = 0 → returns start
 * t = 1 → returns end
 * t = 0.5 → returns midpoint
 */
export function interpolateNumber(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Interpolate between two hex colors
 * Parses hex → RGB, lerps each channel, converts back to hex
 */
export function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = parseInt(color1.substring(1), 16)
  const c2 = parseInt(color2.substring(1), 16)

  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff

  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Ease-in-out curve for smooth acceleration/deceleration
 * Creates natural-feeling motion instead of linear movement
 */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}
```

### Easing Visualization

```
Linear (no easing):          Ease-in-out:
                             
1.0 ┤        ────────        1.0 ┤           ╭────
    │       /                    │          ╱
    │      /                     │        ╱
    │     /                      │      ╱
    │    /                       │    ╱
0.0 ┼───/                    0.0 ┼───╯
    0.0          1.0             0.0          1.0
    
    Looks robotic               Looks natural
```

### Performance Optimization

The animation system is optimized to minimize React re-renders:

1. **Single setParams call per frame** - All parameter updates batched into one object
2. **Conditional updates** - Only calls `setParams` if there are actual changes
3. **Reduced clarity pulsing** - Updates every 3rd frame instead of every frame
4. **Ref-based state** - Animation state stored in refs, not useState
5. **Stable dependencies** - useEffect depends only on `setParams`, not on refs

```typescript
// BEFORE (bad - 4 state updates per frame):
setParams(prev => ({ ...prev, primaryColor: newColor }))
setParams(prev => ({ ...prev, particleCount: newCount }))
setParams(prev => ({ ...prev, brightness: newBrightness }))
setParams(prev => ({ ...prev, clarity: newClarity }))

// AFTER (good - 1 state update per frame):
const updates = {}
if (colorTransitioning) updates.primaryColor = newColor
if (particleTransitioning) updates.particleCount = newCount
if (numericTransitioning) updates.brightness = newBrightness
if (frameCount % 3 === 0) updates.clarity = newClarity

if (Object.keys(updates).length > 0) {
  setParams(prev => ({ ...prev, ...updates }))
}
```

### Triggering a Transition

When `applyParameterMapping` is called with new backend parameters:

```typescript
// app/perlin/page.tsx

const applyParameterMapping = useCallback((mapping: ParameterMapping) => {
  const currentParams = paramsRef.current

  // 1. Check if colors changed - only transition if different
  if (mapping.primaryColor !== targetPrimaryColorRef.current) {
    currentPrimaryColorRef.current = currentParams.primaryColor  // Snapshot current
    targetPrimaryColorRef.current = mapping.primaryColor         // Set new target
    colorTransitionProgressRef.current = 0.0                     // TRIGGER: Start transition
  }

  // 2. Always set up numeric transitions
  numericParams.brightness.current.current = currentParams.brightness
  numericParams.brightness.target.current = mapping.brightness
  // ... repeat for all 9 numeric params

  transitionDurationRef.current = mapping.transitionSpeed  // Backend controls duration
  numericTransitionProgressRef.current = 0.0               // TRIGGER: Start transition

  // 3. Non-transitioning params set immediately
  setParams(prev => ({
    ...prev,
    flowPattern: mapping.flowPattern,
    stability: mapping.stability,
    // These don't animate - they switch instantly
  }))
}, [numericParams])
```

---

## Error Handling & Edge Cases

### Deepgram WebSocket Disconnection

```typescript
// lib/deepgram.ts
this.connection.on(LiveTranscriptionEvents.Close, () => {
  this.config.onConnectionChange?.('disconnected')
})

this.connection.on(LiveTranscriptionEvents.Error, (error) => {
  console.error('Deepgram error:', error)
  this.config.onError?.(error)
})
```

### Slow Backend Response

```typescript
// lib/api.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delay: number = 500
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
      return withRetry(fn, retries - 1, delay * 2)
    }
    throw error
  }
}
```

### Microphone Permission Denied

```typescript
// lib/deepgram.ts
try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
} catch (error) {
  if (error.name === 'NotAllowedError') {
    this.config.onError?.(new Error('Microphone access denied'))
  }
}
```

### Duplicate Connection Prevention

```typescript
// hooks/useDeepgramConnection.ts
const isConnectingRef = useRef(false)

const startDeepgramClient = useCallback(async () => {
  // Prevent duplicate connections
  if (isConnectingRef.current) {
    console.log('[SKIP] Already connecting')
    return
  }
  
  // Stop existing connection first
  if (deepgramClientRef.current) {
    await deepgramClientRef.current.stop()
  }
  
  isConnectingRef.current = true
  // ... start new connection
  isConnectingRef.current = false
}, [])
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- Deepgram API key ($200 free credits)
- Groq API key (free tier available)

### Environment Setup

**Root `.env`:**
```bash
NEXT_PUBLIC_DEEPGRAM_API_KEY=your_deepgram_key
FASTAPI_URL=http://localhost:8000
```

**`fastapi/.env`:**
```bash
GROQ_API_KEY=your_groq_key
```

### Installation

```bash
# Frontend
npm install

# Backend
cd fastapi
pip install -r requirements.txt
```

### Running

**Terminal 1 - Backend:**
```bash
cd fastapi
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Open:** http://localhost:3000/perlin

---

## File Structure

```
sentiment-aura-transcriptor/
│
├── app/                          # Next.js App Router
│   ├── perlin/
│   │   └── page.tsx              # Main orchestration (500+ lines)
│   ├── api/
│   │   └── process-text/
│   │       └── route.ts          # Proxy to FastAPI
│   ├── layout.tsx
│   └── page.tsx                  # Landing/redirect
│
├── components/
│   ├── perlin-noise-particles.tsx # 3D particle simulation (1100 lines)
│   ├── transcript-display.tsx     # Live transcript UI
│   ├── keywords-display.tsx       # Animated keywords
│   ├── controls.tsx               # Start/Stop button
│   └── control-panel.tsx          # Debug parameter sliders
│
├── hooks/
│   ├── useTranscriptHandler.ts    # Transcript processing + backend calls
│   ├── useParameterAnimation.ts   # Smooth parameter transitions
│   └── useDeepgramConnection.ts   # Deepgram client lifecycle
│
├── lib/
│   ├── deepgram.ts               # Deepgram WebSocket wrapper
│   ├── api.ts                    # Backend API client
│   ├── types.ts                  # TypeScript definitions
│   ├── keywords-store.ts         # Pub-sub keyword store
│   └── prompts.ts                # (Frontend prompts if needed)
│
├── utils/
│   └── interpolation.ts          # Color/number interpolation helpers
│
├── fastapi/                      # Python Backend
│   ├── main.py                   # FastAPI app entry
│   ├── config.py                 # Environment variables
│   ├── models.py                 # Pydantic models
│   ├── prompts.py                # LLM prompt templates
│   ├── routes/
│   │   ├── sentiment.py          # /process_text endpoint
│   │   └── health.py             # /health endpoint
│   ├── services/
│   │   ├── llm_service.py        # Groq sentiment extraction
│   │   └── parameter_service.py  # Keyword → param translation
│   └── requirements.txt
│
├── .env                          # Frontend environment
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md                     # This file
```

---

## Assessment Criteria Addressed

| Criterion | Implementation |
|-----------|----------------|
| **Full-Stack Orchestration** | Three-part system: React frontend, FastAPI backend, Deepgram + Groq APIs. All communicate in real-time via WebSocket and HTTP. |
| **Data-Driven Visualization** | Sentiment score, type, and keywords map to 15+ visual parameters (colors, speed, turbulence, flow patterns, particle count, etc.) |
| **Frontend Polish** | Framer Motion animations, smooth parameter transitions (0.75s default), glassmorphism UI, keywords fade in gracefully |
| **Async Management** | Retry logic for failed API calls, connection state tracking, duplicate prevention, graceful degradation |
| **Error Handling** | Mic permission errors, WebSocket disconnection recovery, timeout handling, user-friendly error messages |

---

## License

MIT
