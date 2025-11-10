# Restaurant/Cafe Automation Options

## Overview
Automated classification of restaurants/cafes into:
- **Price Range**: $, $$, $$$, $$$$
- **Occasion**: casual, date-night, family, business, celebration, quick-bite
- **Cuisine**: american, italian, mexican, asian, mediterranean, etc.
- **Dietary**: vegetarian, vegan, gluten-free, keto, none

## Current State
- System uses `tags` array for matching
- Scoring logic in `providerScoring.ts` searches tags for matches
- No automatic classification currently exists
- Manual tag entry required

## Option 1: Manual Selection with Smart Defaults ⚡ (FASTEST)

**Implementation:**
- Add form fields in `BusinessListingForm.tsx` for restaurants/cafes
- Dropdowns for Price Range, Cuisine, Occasions (multi-select), Dietary (multi-select)
- Auto-populate as tags on save

**Pros:**
- ✅ Fastest to implement (1-2 hours)
- ✅ 100% accurate (owner knows their business)
- ✅ No API dependencies
- ✅ Immediate implementation

**Cons:**
- ❌ Requires business owner input
- ❌ Doesn't help existing restaurants without manual entry

**Effort:** Low | **Cost:** Free | **Accuracy:** 100% (with input)

---

## Option 2: Rule-Based Keyword Classification 💰 (FREE)

**Implementation:**
- Analyze `description`, `specialties`, `tags`, `name` fields
- Keyword matching rules (see examples below)
- Auto-populate tags on save/update
- Show preview in form for owner confirmation

**Keyword Rules Example:**
```typescript
// Price Range Detection
if (text.includes('fine dining') || text.includes('upscale') || text.includes('white tablecloth'))
  → '$$$$'
else if (text.includes('casual') || text.includes('family-friendly'))
  → '$$'
else if (text.includes('fast') || text.includes('quick') || text.includes('counter'))
  → '$'

// Cuisine Detection
if (text.includes('tacos') || text.includes('burrito') || text.includes('mexican'))
  → 'mexican'
if (text.includes('pizza') || text.includes('pasta') || text.includes('italian'))
  → 'italian'

// Occasion Detection
if (text.includes('romantic') || text.includes('date night'))
  → 'date-night'
if (text.includes('family') || text.includes('kids-friendly'))
  → 'family'
if (text.includes('quick') || text.includes('to-go') || text.includes('takeout'))
  → 'quick-bite'
```

**Pros:**
- ✅ Free (no API costs)
- ✅ Fast implementation (4-6 hours)
- ✅ Immediate results
- ✅ Predictable behavior

**Cons:**
- ❌ Less accurate (~70-80%)
- ❌ Requires keyword maintenance
- ❌ Misses nuanced descriptions

**Effort:** Medium | **Cost:** Free | **Accuracy:** 70-80%

---

## Option 3: AI/LLM Classification 🤖 (MOST ACCURATE)

**Implementation:**
- Use OpenAI GPT-4, Anthropic Claude, or local LLM
- Analyze business description + specialties
- Generate structured classification
- Store results as tags

**Example Prompt:**
```
Analyze this restaurant business:
Name: {name}
Description: {description}
Specialties: {specialties}

Classify into:
1. Price Range (choose one): $, $$, $$$, $$$$
2. Primary Cuisine (choose one): american, italian, mexican, asian, mediterranean, other
3. Occasions (select all applicable): casual, date-night, family, business, celebration, quick-bite
4. Dietary Options (select all applicable): vegetarian, vegan, gluten-free, keto, none

Return ONLY valid JSON:
{
  "price_range": "...",
  "cuisine": "...",
  "occasions": [...],
  "dietary": [...]
}
```

**Pros:**
- ✅ Most accurate (90-95%)
- ✅ Handles nuanced descriptions
- ✅ Learns from context
- ✅ Works for any description style

**Cons:**
- ❌ API costs (~$0.01-0.05 per classification)
- ❌ Rate limits
- ❌ Requires prompt engineering
- ❌ Network dependency

**Effort:** Medium-High | **Cost:** $0.01-0.05 per business | **Accuracy:** 90-95%

---

## Option 4: Google Places API Integration 🗺️ (RICH DATA)

**Implementation:**
- Fetch business data from Google Places API
- Extract `price_level` (0-4 → $ to $$$$)
- Extract `types` array (contains cuisine hints)
- Analyze reviews for occasion/dietary signals

**API Data:**
```typescript
{
  price_level: 2, // 0=$, 1=$$, 2=$$$, 3=$$$$, 4=$$$$$
  types: ['restaurant', 'food', 'establishment'],
  // Can search for cuisine-specific types if available
}
```

**Pros:**
- ✅ Official, reliable data
- ✅ Already categorized by Google
- ✅ Includes reviews/ratings
- ✅ Regular updates

**Cons:**
- ❌ API costs ($0.017 per request)
- ❌ Requires Google API key
- ❌ Rate limits (10/sec standard)
- ❌ May not have all local businesses
- ❌ Limited dietary/occasion data

**Effort:** Medium | **Cost:** $0.017 per business | **Accuracy:** 85-90% (price), 60% (other)

---

## Option 5: Hybrid Approach ⭐ (RECOMMENDED)

**Implementation:**
1. **Rule-based auto-population** when business is created/updated
2. **Show suggestions** in BusinessListingForm for owner to confirm/edit
3. **Manual override** always available
4. **Optional AI refinement** for edge cases or on-demand

**Flow:**
```
Business Save/Update
    ↓
Rule-Based Classification (fast, free)
    ↓
Show Suggestions in Form
    ↓
Owner Reviews/Edits
    ↓
Save to Tags
    ↓
[Optional] AI Refinement for unclear cases
```

**Pros:**
- ✅ Best of all worlds
- ✅ Fast + accurate
- ✅ Owner can refine
- ✅ Fallback options
- ✅ Cost-effective

**Cons:**
- ❌ Most complex to implement
- ❌ Requires multiple systems

**Effort:** High | **Cost:** Low (only AI when needed) | **Accuracy:** 95%+ (with review)

---

## Implementation Recommendations

### Phase 1: Quick Win (Option 1)
- Add manual selection fields to BusinessListingForm
- Auto-populate as tags
- **Timeline:** 1-2 days

### Phase 2: Smart Defaults (Option 2)
- Implement rule-based classification
- Auto-suggest on save
- Owner confirms/edits
- **Timeline:** 3-5 days

### Phase 3: AI Enhancement (Option 3) - Optional
- Add AI classification for edge cases
- On-demand refinement button
- **Timeline:** 2-3 days (if needed)

---

## Database Schema Considerations

### Option A: Add to Tags Array (Current)
```typescript
tags: [
  '$$',           // price range
  'italian',      // cuisine
  'date-night',  // occasion
  'family',       // occasion
  'vegetarian'   // dietary
]
```

### Option B: New Metadata Field (Recommended)
```typescript
// Add to providers table
restaurant_metadata: {
  price_range: '$$$',
  cuisine: 'italian',
  occasions: ['date-night', 'business'],
  dietary: ['vegetarian', 'gluten-free']
}
```

**Recommendation:** Use Option B for cleaner separation and easier querying.

---

## Next Steps

1. **Decide on approach** (recommend Option 5 - Hybrid)
2. **Implement Phase 1** (manual selection fields)
3. **Test with existing restaurants**
4. **Add Phase 2** (rule-based auto-population)
5. **Evaluate accuracy and add Phase 3 if needed**


