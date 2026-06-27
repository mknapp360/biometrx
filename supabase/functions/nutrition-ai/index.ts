import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { description } = await req.json()
    if (!description || typeof description !== 'string') {
      return new Response(JSON.stringify({ error: 'description is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const client = new Anthropic()

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Estimate the nutritional content for the following food description. Return ONLY a JSON object with these exact keys: calories (integer), protein_g (number, 1 decimal), fat_g (number, 1 decimal), carbs_g (number, 1 decimal), sugar_g (number, 1 decimal). No explanation, no markdown, just the JSON object.

Food: ${description}`,
        },
      ],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''

    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim()
    const nutrition = JSON.parse(cleaned)

    return new Response(JSON.stringify(nutrition), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('nutrition-ai error:', err)
    return new Response(JSON.stringify({ error: 'Failed to parse nutrition' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
