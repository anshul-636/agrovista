const Groq = require('groq-sdk')
const ApiError = require('../../utils/ApiError')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })


const getPriceAdvice = async ({ productName, category, quantity, unit, location, description }) => {
    if (!productName || !category || !quantity || !unit) {
        throw new ApiError(400, 'Required: productName, category, quantity, unit')
    }

    const prompt = `You are an expert agricultural market analyst in India.
A farmer wants to price their product. Based on the details below, suggest an optimal selling price per ${unit}.

Product Details:
- Name: ${productName}
- Category: ${category}
- Quantity available: ${quantity} ${unit}
- Location: ${location || 'India'}
- Description: ${description || 'N/A'}

Respond ONLY with valid JSON in this exact format (no extra text):
{
  "suggestedPrice": <number in INR per ${unit}>,
  "priceRange": { "min": <number>, "max": <number> },
  "reasoning": "<2-3 sentence explanation>",
  "marketInsight": "<1 sentence about current market trend for this product>"
}`

    const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,       // low temp = more consistent pricing
        max_tokens: 300
    })

    const raw = completion.choices[0]?.message?.content?.trim()

    // Parse the JSON response from the AI
    try {
        const result = JSON.parse(raw)
        return {
            productName,
            category,
            unit,
            ...result
        }
    } catch {
        // If AI returned non-JSON, wrap it gracefully
        throw new ApiError(500, 'AI returned an unexpected response. Please try again.')
    }
}

module.exports = { getPriceAdvice }
