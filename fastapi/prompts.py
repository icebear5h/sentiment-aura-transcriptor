from textwrap import dedent

SENTIMENT_ANALYSIS_PROMPT = """You are a sentiment analysis expert. Analyze the given text and return ONLY a valid JSON object with these exact fields:
{
  "sentiment": <float between 0 and 1, where 0 is most negative and 1 is most positive>,
  "sentiment_type": <"positive", "negative", or "neutral">,
  "keywords": <array of emotional/qualia descriptors - extract as many as are relevant>,
  "confidence": <float between 0 and 1>
}

CRITICAL: All numeric values MUST be valid decimal numbers (e.g., 0.75, 0.9, 0.35). DO NOT write out numbers as words.

IMPORTANT: Keywords MUST be ONLY emotional or qualitative descriptors similar to things in these categories (feel free to get more nuanced and use sophisticated vocabulary when it captures the feeling better):

CALM & PEACE: peaceful, serene, tranquil, gentle, soft, quiet, still, relaxed, calm, soothing, mellow, placid, contemplative, reflective, mindful, centered, balanced, meditative

ENERGY & EXCITEMENT: vibrant, dynamic, energetic, lively, spirited, electric, intense, powerful, active, vigorous, thrilled, exhilarated, animated, enthusiastic, eager, excited, euphoric, ecstatic, elated, jubilant

CHAOS & DISORDER: turbulent, chaotic, frantic, wild, unstable, erratic, volatile, scattered, hectic, confused, disoriented, frenzied, manic, feverish, desperate, panicked

HAPPINESS & JOY: joyful, happy, cheerful, bright, radiant, delighted, blissful, uplifting, pleasant, gleeful, playful, whimsical, lighthearted, mischievous

SADNESS & MELANCHOLY: melancholy, somber, wistful, pensive, subdued, muted, sad, gloomy, heavy, sorrowful, mournful, elegiac, plaintive, doleful, despairing, hopeless, desolate, forlorn

ANXIETY & FEAR: anxious, tense, nervous, uneasy, restless, agitated, jittery, worried, uncertain, uncomfortable, fearful, apprehensive, dreadful, terrified, alarmed, scared

ANGER & AGGRESSION: angry, furious, irate, enraged, livid, wrathful, indignant, hostile, fierce, irritated, annoyed, vexed, aggravated, exasperated, frustrated

MYSTERY & WONDER: mysterious, enigmatic, ethereal, cosmic, dreamy, surreal, otherworldly, mystical, strange, ambiguous, awestruck, amazed, wonderstruck, astonished, dazzled, spellbound

CONFIDENCE & STRENGTH: confident, certain, clear, assured, bold, strong, decisive, firm, resolute, determined, powerful, mighty, formidable, commanding, authoritative

LOVE & WARMTH: warm, cozy, comfortable, inviting, tender, affectionate, loving, caring, nurturing, compassionate, romantic, passionate, ardent, devoted, intimate

COLDNESS & DISTANCE: cold, distant, detached, aloof, remote, impersonal, frigid, icy, indifferent, withdrawn, lonely, isolated, solitary, abandoned

HOPE & OPTIMISM: hopeful, optimistic, promising, encouraging, inspiring, heartening, buoyant

NOSTALGIA & MEMORY: nostalgic, wistful, reminiscent, sentimental, bittersweet, longing, evocative

SOLEMNITY: solemn, grave, serious, austere, dignified, formal, reverent

CURIOSITY: curious, inquisitive, intrigued, fascinated, interested, exploring, wondering

Use expressive vocabulary that captures the FEELING. Do NOT use concrete nouns, verbs, or factual descriptors."""

KEYWORD_TRANSLATION_PROMPT = dedent("""
You are a pure JSON function that translates emotion keywords into visualization parameters.

INPUT:
A list of emotion-related keywords: {KEYWORDS}
{PROCESSED_TEXT}

OUTPUT:
Return ONLY a single JSON object and NOTHING else.
- No explanations
- No markdown
- No code fences
- No comments

The JSON MUST have EXACTLY these fields:

{
  "clarity": <number 0.0-1.0>,
  "intensity": <number 0.0-1.0>,
  "coherence": <number 0.0-1.0>,
  "stability": <number 0.0-1.0>,
  "density": <number 0.0-1.0>,
  "flowDensity": <number 0.01-0.80>,
  "sharpness": <number 0.0-1.0>,
  "quantity": <number 0.0-1.0>,
  "opacity": <number 0.0-1.0>,
  "pulse": <number 0.0-1.0>,
  "speed": <number 0.0-5.0>,
  "timeScale": <number 0.5-2.0>,
  "noiseScale": <number 0.1-2.0>,
  "noiseStrength": <number 0.2-4.0>,
  "particleCount": <number 500-10000>,
  "particleSize": <number 0.005-0.10>,
  "brightness": <number 0.2-1.0>,
  "flowPattern": <string: one of "free", "circular", "left", "right", "up", "down", "outward", "inward", "spiralInward", "spiralOutward", "breathing", "flocking", "attractionWell", "repulsionWell", "shearHorizontal", "shearVertical", "jittery", "viscous", "burst", "orbitDrift", "maze">,
  "primaryColor": <string: hex color "#RRGGBB">,
  "secondaryColor": <string: hex color "#RRGGBB">
}

CONSTRAINTS:
- Every numeric value MUST be a valid JSON number (no quotes, no percentages).
- All fields are REQUIRED. Do NOT omit any.
- Colors MUST be 7-character hex strings like "#ff9966" (case-insensitive).
- Return a SINGLE top-level JSON object.

If there is ever a conflict:
- Follow the NUMERIC DIMENSION definitions and the INTERNAL REASONING STEPS for clarity/intensity/etc.
- Use the EXAMPLES primarily as COLOR inspiration and rough emotional feel.
- Do NOT blindly copy example numeric values.

INTERNAL REASONING STEPS (do NOT output these, just follow them):

1. Interpret the keywords along two hidden axes:
   - valence: negative / mixed / neutral / positive
   - activation: low / medium / high (how energized the state feels)

2. Decide activation FIRST:
   - low activation words: calm, serene, peaceful, sleepy, tired, numb, meditative, tranquil
   - high activation words: excited, angry, panicked, ecstatic, overwhelmed, frantic, terrified
   - medium activation: everything in between or explicitly mixed - very orderly and controlled things

3. Map activation → core dynamical parameters:
   - low activation:
     - intensity in 0.0–0.3
     - speed in 0.0–0.5
     - pulse in 0.0–0.3
     - flowPattern in ["circular", "breathing", "free"]
   - medium activation:
     - intensity in 0.3–0.7
     - speed in 0.4–1.0
     - pulse in 0.2–0.6
     - clarity in 0.7–1.0 for certainty
     - low clarify and darker colors for uncertainty
     - flowPattern in ["free", "circular", "spiralOutward", "spiralInward", "breathing"] (spirals must be slow and very noisy (not purely circular so the noise scale is higher)
   - high activation:
     - intensity in 0.7–1.0
     - speed in 0.9–2.0
     - pulse in 0.6–1.0
     - flowPattern in ["outward", "inward", "spiralOutward", "free", "burst", "jittery", "flocking"]

4. Map valence → color + coherence:
   - clearly positive (joy, hope, gratitude, love, warmth):
     - coherence 0.7–1.0
     - prefer warmer or bright palettes, or fresh blues/greens for uplift
   - clearly negative (fear, despair, rage, anxiety, shame):
     - coherence 0.2–0.6 (more chaotic)
     - cooler, darker, or more contrasting palettes
   - mixed/ambiguous (bittersweet, nostalgic, conflicted, uncertain):
     - coherence 0.4–0.7
     - colors that are harmonious but slightly muted, off-complement, or softly contrasting

5. Map clarity words → clarity (and allow them to override ambiguity):
   - "confused, uncertain, foggy, lost, conflicted, doubtful, ambiguous" → clarity 0.0–0.4
   - "clear, sure, certain, decisive, focused, sharp, lucid" → clarity 0.7–1.0

6. Map flow concentration → flowDensity:
   - concentrated, focused, intense flow, dense patterns → flowDensity 0.6–0.8
   - balanced, moderate flow → flowDensity 0.35–0.55
   - diffuse, scattered, sparse flow, loose patterns → flowDensity 0.01–0.3
   - coherent emotions generally have higher flowDensity
   - chaotic emotions generally have lower flowDensity

7. Use "crowded / empty / overwhelming / minimal / sparse / full" to shape quantity + density:
   - overwhelming, crowded, swarming, packed → quantity 0.7–1.0, density 0.7–1.0
   - empty, alone, isolated, sparse, hollow → quantity 0.0–0.3, density 0.1–0.4

8. Within chosen ranges, slightly randomize values (conceptually) so similar inputs do not always produce identical numbers.

NUMERIC DIMENSIONS (your interpretations):

clarity (0.0-1.0): How clear/defined vs hazy/uncertain the feeling is
- 0.0-0.2: Very unclear, confused, foggy, doubtful
- 0.2-0.4: Somewhat unclear, mixed feelings
- 0.4-0.7: Moderately clear
- 0.7-1.0: Crystal clear, confident, decisive
- High clarity means that the particle size is small, brightness is high, and vice versa. Low clarity produces a dull transparent kind of haze.

intensity → speed & brightness & noiseStrength:
- High intensity (0.7-1.0) = fast speed (3.0-5.0), high brightness, high noiseStrength (3.0-5.0)
- Low intensity (0.0-0.3) = slow speed (0.1-1.0), lower brightness, low noiseStrength (0.2-1.0)
- 0.05-0.12: Very low energy, quiet, dormant, peaceful rest
- 0.12-0.26: Calm, gentle, soft
- 0.26-0.4: Neutral, Free
- 0.4-0.7: Energized, vibrant, lively
- 0.7-0.9: Moving, pace, speed
- 0.9-1.0: Intense, explosive, powerful

coherence (0.0-1.0): How organized/structured vs chaotic
- 0.0-0.3: Very chaotic, scattered, frantic
- 0.3-0.5: Somewhat chaotic, restless
- 0.5-0.7: Moderately structured
- 0.7-1.0: Very organized, harmonious, serene, calm

stability (0.0-1.0): How stable vs volatile/changing
- 0.0-0.2: Very unstable, volatile, anxious, rapidly shifting
- 0.2-0.5: Shifting, variable, somewhat unstable
- 0.5-0.7: Moderately stable, balanced
- 0.7-1.0: Very steady, grounded, unwavering
- Stability makes the particles jiggle and wiggle a little more in place, but reduces their motion so you do not always see the full spatial noise pattern underneath.

TECHNICAL OBJECTIVE PARAMETERS (how qualitative parameters affect simulation):

particleCount (500-10000):
- Number of particles in the simulation
- 500 = sparse, minimal particles
- 10000 = dense, overwhelming swarm
- High energy emotions: 5000-10000
- Calm emotions: 500-3000

particleSize (0.005-0.10):
- Size of each particle
- 0.005 = tiny, sharp points
- 0.10 = large, soft orbs
- Clear/focused emotions: 0.005-0.03
- Soft/gentle emotions: 0.08-0.10

brightness (0.2-1.0):
- Overall brightness of particles
- 0.2 = dim, subtle
- 1.0 = bright, vibrant
- Sad/dark emotions: 0.2-0.5
- Happy/bright emotions: 0.7-1.0

speed (0.1-5.0):
- Movement speed of particles
- 0.1 = very slow, barely moving
- 5.0 = extremely fast, frantic
- Excited/energetic emotions: 3.0-5.0
- Calm/peaceful emotions: 0.1-1.0

- for free noise speed needs to be high like 3+
- for rotating things needs to be lower like under 2

timeScale (0.5-2.0):
- Global animation speed multiplier
- 0.5 = slow motion, dreamlike
- 2.0 = fast forward, urgent
- Meditative states: 0.5-0.8
- Anxious states: 1.5-2.0

transitionSpeed (0.1-3.0):
- Speed of parameter transitions and changes
- 0.1 = gradual, smooth transitions
- 3.0 = rapid, abrupt changes
- Stable emotions: 0.1-0.5
- Volatile emotions: 1.5-3.0

pulse (0.0-1.0):
- Breathing/pulsing animation intensity
- 0.0 = no pulsing, steady
- 1.0 = maximum pulsing
- Most emotions: 0.6-0.8 (default baseline)
- Very calm: 0.2-0.4
- Very anxious: 0.9-1.0

noiseScale (0.1-2.0):
- Scale of Perlin noise patterns
- lower = the particles move in more of a similar direction
- higher = the particles move in more of a different direction
- noiseScale determines if the different vector directions are more similar or more different, (lower = more similar, higher = more different)

-- noise scale needs to be higher for rotating patterns and lower for free noise
-- like 1 + for rotating and < 0.5 for free noise

noiseStrength (0.2-5.0):
- How strong the vector fields get for the perline noise field
- low = the particles move in lower speeds
- high = the particles move in higher speeds
- 4 + is ridiculously fast and should only be used for non rotating emotions
- for free noise, make sure the noise strength is high


flowDensity (0.01-0.80):
- Concentration and focus of flow patterns (capped at 0.8)
- 0.01-0.20 = very diffuse, scattered, ethereal
- 0.20-0.40 = light concentration, soft flow
- 0.40-0.60 = moderate concentration, balanced flow
- 0.60-0.80 = highly concentrated, focused patterns (maximum)
- 0.80 is absolute maximum for flow concentration

turbulence (0.0-0.5):
- Particle wiggle/wobble intensity (independent of base speed)
- only have a turblence of a 0.4 + for high activation emotions
- for everything else should be < 0.1
COLOR PALETTE GUIDANCE (primaryColor and secondaryColor):

Create beautiful, mesmerizing color combinations that match the emotional quality.

COLOR THEORY:
- Complementary: Opposite on color wheel (high contrast, energetic) – e.g., blue/orange, purple/yellow
- Analogous: Adjacent colors (harmonious, serene) – e.g., blue/cyan/teal, orange/red/pink
- Monochromatic: Same hue, different saturation/brightness (unified, elegant)
- Triadic hints: Use primary + secondary that suggests a third color (dynamic, balanced)

EMOTIONAL COLOR ASSOCIATIONS:
- Blues (#0066cc, #3399ff, #6699cc): calm, trust, introspection, sadness, depth, serenity
- Purples (#6633cc, #9933ff, #cc66ff): mystery, spirituality, creativity, luxury, introspection
- Greens (#33cc66, #66ff99, #00aa55): growth, renewal, peace, nature, balance, harmony
- Teals/Cyans (#00cccc, #33ffff, #66cccc): tranquility, clarity, freshness, innovation
- Warm oranges (#ff9933, #ffaa44, #ff7700): energy, enthusiasm, warmth, creativity, vitality
- Hot oranges/reds (#ff6600, #ff3300, #cc0033): passion, intensity, urgency, anger, power
- Pinks (#ff6699, #ff99cc, #ff66aa): affection, playfulness, gentleness, romance, compassion
- Yellows (#ffcc00, #ffdd33, #ffee66): joy, optimism, clarity, enlightenment, caution
- Golds (#ffaa00, #cc9900, #ffcc33): confidence, success, warmth, richness, prestige
- Grays/Blues (#445566, #556677, #667788): neutrality, contemplation, stability, melancholy
- Deep purples (#330066, #4d0099, #660099): depth, mystery, power, transformation
- Magentas (#cc0066, #ff0099, #ff33cc): boldness, creativity, unconventional, intense emotion

SATURATION & BRIGHTNESS:
- High saturation (vivid): for intense, energetic, bold emotions (#ff0099, #00ffff, #ff6600)
- Medium saturation (balanced): for most emotions (#6699cc, #cc66aa, #66cc99)
- Low saturation (muted): for subtle, contemplative, melancholic states (#667788, #8899aa, #aa99bb)
- High brightness: clarity, positivity, energy, transcendence
- Low brightness: depth, mystery, heaviness, introspection (#334466, #443355, #334455)

MESMERIZING COMBINATIONS (just inspiration):
- Deep blue → bright cyan: serene to transcendent (#1a4d7a → #33ffff)
- Deep indigo → electric violet: mystical intensity (#2b1a4d → #9933ff)
- Teal → emerald: growth, renewal (#007777 → #33cc77)
- Soft peach → warm gold: optimistic warmth (#ffbb99 → #ffcc33)
- Crimson → magenta: passionate intensity (#cc0033 → #ff3399)
- Midnight navy → twilight purple: contemplative depth (#1a2a3a → #443366)
- Amber → cyan: bold, futuristic energy (#ffaa00 → #00ccff)

OUTPUT FORMAT (repeat for emphasis):
Return ONLY a single JSON object with ALL fields present and correctly typed.
""")
