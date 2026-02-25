import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Gemini API Configuration
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODEL = 'gemini-1.5-flash' // Using flash model for speed and cost
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// Valid tags for classification (must match app onDeviceTagMapping.VALID_TAGS)
const VALID_TAGS = [
  'receipt', 'chat', 'meme', 'error', 'article', 'photo', 'document', 'code', 'map', 'ticket',
  'email', 'social', 'shopping', 'finance', 'notes', 'game', 'recipe', 'calendar', 'settings',
  'ui', 'screenshot',
]

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

async function classifyWithGemini(imageBase64: string, filename: string): Promise<string[]> {
  const prompt = `Analyze this image and classify it into one or more categories.

Filename: ${filename}

Available categories:
- receipt: Payment receipts, invoices, bills, purchase confirmations
- chat: Conversation screenshots, text messages, chat apps
- email: Emails, inbox, newsletters
- social: Social media posts, feeds, tweets, profiles
- meme: Funny images, viral content
- shopping: Products, wishlists, store pages
- finance: Bank balances, portfolios, crypto, stocks
- notes: Notes, to-do lists, reminders, checklists
- recipe: Recipes, food, cooking, menus
- calendar: Calendars, schedules, meetings
- game: Gaming, gameplay, scores, achievements
- settings: Settings, wifi, passwords, system info
- error: Error messages, bug reports, crash screens
- article: News articles, blog posts, reading content
- photo: Personal photos, selfies, gallery
- document: Documents, forms, PDFs, contracts
- code: Code, programming, terminal output
- map: Maps, directions, navigation
- ticket: Tickets, boarding passes, event passes
- ui: App interfaces, screens, general UI (use when nothing else fits)
- screenshot: Generic screenshot (default fallback)

Respond with ONLY the category names separated by commas. Choose 1-3 most relevant categories.
Example response: receipt,shopping

Classification:`

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 50,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      }
    ]
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data: GeminiResponse = await response.json()
  
  // Extract text from response
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
  
  // Parse tags from response
  const tags = text
    .toLowerCase()
    .split(/[,\s]+/)
    .map(tag => tag.trim())
    .filter(tag => VALID_TAGS.includes(tag))
  
  // Ensure we have at least one tag
  if (tags.length === 0) {
    tags.push('screenshot')
  }
  
  return [...new Set(tags)] // Remove duplicates
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { db: { schema: 'screenshot_organizer' } }
    )

    const { asset_id, filename, width, height, size_bytes, user_id, image_base64 } = await req.json()

    if (!asset_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing asset_id or user_id' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    let tags: string[] = []
    let classificationMethod = 'none'

    // Classify only when we have image data (Gemini). No image or Gemini failure = default tag only.
    if (image_base64) {
      try {
        console.log('Classifying with Gemini API...')
        tags = await classifyWithGemini(image_base64, filename)
        classificationMethod = 'gemini'
        console.log('Gemini classification result:', tags)
      } catch (geminiError) {
        console.error('Gemini classification failed:', geminiError)
        tags = ['screenshot']
        classificationMethod = 'none'
      }
    } else {
      tags = ['screenshot']
      classificationMethod = 'none'
    }

    // Update asset with tags
    const { error: updateError } = await supabaseClient
      .from('assets')
      .update({ tags })
      .eq('id', asset_id)
      .eq('user_id', user_id)

    if (updateError) throw updateError

    // Log classification event
    await supabaseClient.from('analytics_events').insert({
      user_id,
      event_name: 'asset_classified',
      properties: {
        asset_id,
        tags,
        method: classificationMethod,
        has_image_data: !!image_base64,
      },
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        asset_id,
        tags,
        method: classificationMethod,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error classifying image:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
