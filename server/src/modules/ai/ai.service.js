const Groq = require('groq-sdk')
const ApiError = require('../../utils/ApiError')
const Product = require('../../models/Product')
const Auction = require('../../models/Auction')

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null

const UNIT_TO_KG = {
    kg: 1,
    kilogram: 1,
    kilograms: 1,
    quintal: 100,
    quintals: 100,
    ton: 1000,
    tonne: 1000,
    tonnes: 1000
}

const CATEGORY_FALLBACKS = {
    VEGETABLES: { min: 18, max: 45 },
    FRUITS: { min: 35, max: 120 },
    GRAINS: { min: 24, max: 70 },
    DAIRY: { min: 40, max: 85 },
    HERBS: { min: 60, max: 180 },
    OTHER: { min: 20, max: 80 }
}

const normalizeText = (value = '') => String(value).trim().toLowerCase()

const toUnitFactor = (unit = 'kg') => UNIT_TO_KG[normalizeText(unit)] || 1

const toPerKgPrice = (price, unit = 'kg') => {
    const factor = toUnitFactor(unit)
    if (!factor) return Number(price) || 0
    return Number(price) / factor
}

const fromPerKgPrice = (pricePerKg, unit = 'kg') => {
    const factor = toUnitFactor(unit)
    return Number(pricePerKg) * factor
}

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const percentile = (values, target) => {
    if (!values.length) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(target * sorted.length)))
    return sorted[index]
}

const weightedAverage = (samples) => {
    if (!samples.length) return 0
    const totalWeight = samples.reduce((sum, sample) => sum + sample.weight, 0)
    if (!totalWeight) return 0
    return samples.reduce((sum, sample) => sum + sample.value * sample.weight, 0) / totalWeight
}

const buildFallbackRange = (categoryUpper, isOrganic) => {
    const range = CATEGORY_FALLBACKS[categoryUpper] || CATEGORY_FALLBACKS.OTHER
    const premium = isOrganic ? 1.12 : 1
    return {
        min: Math.round(range.min * premium),
        max: Math.round(range.max * premium)
    }
}

const buildAiReasoning = async ({ productName, category, location, suggestedPrice, priceRange, sampleCount, isOrganic }) => {
    const fallbackReasoning = `Pricing is anchored to recent ${category.toLowerCase()} listings and auctions${location ? ` near ${location}` : ''}. ${isOrganic ? 'An organic premium is included.' : 'No organic premium is added.'} The final number is adjusted for current supply, lot size, and local market pressure.`
    const fallbackInsight = sampleCount > 0
        ? `Based on ${sampleCount} recent market comparables, ${location ? location : 'the local market'} is supporting prices around ₹${Math.round(suggestedPrice)} per unit.`
        : `No strong local comparables were found, so the estimate falls back to a category benchmark.`

    if (!groq) {
        return { reasoning: fallbackReasoning, marketInsight: fallbackInsight }
    }

    try {
        const prompt = `You are writing a short market note for a farmer in India.
Use only the provided pricing inputs. Do not change the numbers.

Product: ${productName}
Category: ${category}
Location: ${location || 'India'}
Organic: ${isOrganic ? 'yes' : 'no'}
Suggested price: ₹${Math.round(suggestedPrice)}
Price range: ₹${priceRange.min} - ₹${priceRange.max}

Return only valid JSON in this exact shape:
{
  "reasoning": "2 to 3 sentences",
  "marketInsight": "1 sentence"
}`

        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 220
        })

        const raw = completion.choices[0]?.message?.content?.trim() || ''
        const jsonStart = raw.indexOf('{')
        const jsonEnd = raw.lastIndexOf('}')
        const parsed = JSON.parse(jsonStart >= 0 && jsonEnd >= jsonStart ? raw.slice(jsonStart, jsonEnd + 1) : raw)

        return {
            reasoning: parsed.reasoning || fallbackReasoning,
            marketInsight: parsed.marketInsight || fallbackInsight
        }
    } catch {
        return { reasoning: fallbackReasoning, marketInsight: fallbackInsight }
    }
}

const getPriceAdvice = async ({ productName, name, category, quantity, unit, location, description, isOrganic }) => {
    const resolvedName = productName || name
    if (!resolvedName || !category || !unit) {
        throw new ApiError(400, 'Required: productName, category, unit')
    }

    const categoryUpper = String(category).toUpperCase()
    const transferLocation = normalizeText(location)
    const unitLabel = unit || 'kg'
    const quantityKg = quantity ? Number(quantity) * toUnitFactor(unitLabel) : null

    const productQuery = {
        category: categoryUpper,
        isAvailable: true
    }

    const comparableProducts = await Product.find(productQuery)
        .select('price unit quantity location isOrganic createdAt')
        .sort({ createdAt: -1 })
        .limit(100)

    const comparableAuctions = await Auction.find({ category: categoryUpper })
        .select('startingPrice currentBid unit status createdAt')
        .sort({ createdAt: -1 })
        .limit(50)

    const productSamples = comparableProducts
        .map((item) => {
            const sampleLocation = normalizeText(item.location)
            const sameLocation = transferLocation && sampleLocation && sampleLocation === transferLocation
            const recencyDays = Math.max(0, (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            const recencyWeight = Math.max(0.4, 1 - Math.min(recencyDays, 60) / 100)
            const organicWeight = Boolean(isOrganic && item.isOrganic) ? 1.08 : 1
            const locationWeight = sameLocation ? 1.15 : 1
            const value = toPerKgPrice(item.price, item.unit)

            return value > 0
                ? { value, weight: recencyWeight * organicWeight * locationWeight }
                : null
        })
        .filter(Boolean)

    const auctionSamples = comparableAuctions
        .map((item) => {
            const marketPrice = item.currentBid || item.startingPrice
            const recencyDays = Math.max(0, (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            const recencyWeight = Math.max(0.45, 1 - Math.min(recencyDays, 30) / 60)
            const liveWeight = item.status === 'LIVE' ? 1.12 : 1
            const value = toPerKgPrice(marketPrice, item.unit)

            return value > 0
                ? { value, weight: recencyWeight * liveWeight }
                : null
        })
        .filter(Boolean)

    const combinedSamples = [...productSamples, ...auctionSamples]
    const marketAvg = weightedAverage(combinedSamples)
    const categoryFallback = buildFallbackRange(categoryUpper, Boolean(isOrganic))
    const fallbackMidpoint = (categoryFallback.min + categoryFallback.max) / 2

    let basePerKg = marketAvg || fallbackMidpoint

    if (combinedSamples.length >= 5) {
        const lower = percentile(combinedSamples.map((sample) => sample.value), 0.2)
        const upper = percentile(combinedSamples.map((sample) => sample.value), 0.8)
        const filtered = combinedSamples.filter((sample) => sample.value >= lower && sample.value <= upper)
        basePerKg = weightedAverage(filtered) || basePerKg
    }

    const organicPremium = isOrganic ? 0.12 : 0
    const locationPremium = transferLocation ? 0.03 : 0
    const quantityDiscount = quantityKg && quantityKg >= 1000 ? 0.08 : quantityKg && quantityKg >= 250 ? 0.04 : 0
    const finalPerKg = basePerKg * (1 + organicPremium + locationPremium - quantityDiscount)
    const suggestedPrice = Math.max(1, Math.round(fromPerKgPrice(finalPerKg, unitLabel)))
    const priceRange = {
        min: Math.max(1, Math.round(fromPerKgPrice(finalPerKg * 0.9, unitLabel))),
        max: Math.max(1, Math.round(fromPerKgPrice(finalPerKg * 1.12, unitLabel)))
    }

    const reasoningData = await buildAiReasoning({
        productName: resolvedName,
        category: categoryUpper,
        location,
        suggestedPrice,
        priceRange,
        sampleCount: combinedSamples.length,
        isOrganic: Boolean(isOrganic)
    })

    return {
        productName: resolvedName,
        category: categoryUpper,
        unit: unitLabel,
        location: location || 'India',
        quantity: quantity ?? null,
        suggestedPrice,
        priceRange,
        recommendedRange: `₹${priceRange.min} - ₹${priceRange.max} per ${unitLabel}`,
        reasoning: reasoningData.reasoning,
        marketInsight: reasoningData.marketInsight,
        marketBasis: {
            comparableListings: productSamples.length,
            comparableAuctions: auctionSamples.length,
            basePricePerKg: Math.round(basePerKg),
            sampleCount: combinedSamples.length
        }
    }
}

module.exports = { getPriceAdvice }
