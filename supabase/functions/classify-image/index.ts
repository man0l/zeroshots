import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Gemini API Configuration
const GEMINI_API_KEY = 'AIzaSyBL64Bi89KavirAsogPwgWUPPMJgHffTdA'
const GEMINI_MODEL = 'gemini-1.5-flash' // Using flash model for speed and cost
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// Valid tags for classification
const VALID_TAGS = [
  'receipt',      // Payment receipts, invoices, bills
  'chat',         // Conversation screenshots, messages
  'meme',         // Funny images, social media content
  'error',        // Error messages, bugs, crashes
  'article',      // Articles, news, blog posts
  'photo',        // Personal photos
  'document',     // Documents, forms
  'code',         // Code screenshots
  'map',          // Maps, directions
  'ticket',       // Tickets, boarding passes
  'screenshot',   // General screenshots (default)
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
- meme: Funny images, social media content, viral content
- error: Error messages, bug reports, crash screens
- article: News articles, blog posts, reading content
- photo: Personal photos, selfies, camera pictures
- document: Documents, forms, PDF screenshots
- code: Code screenshots, programming, terminal output
- map: Maps, directions, location screenshots
- ticket: Tickets, boarding passes, event passes
- screenshot: General app screenshots (default)

Respond with ONLY the category names separated by commas. Choose 1-3 most relevant categories.
Example response: receipt,screenshot

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

// Heuristic-based classification as fallback
function classifyWithHeuristics(filename: string, aspectRatio: number, fileSize: number): string[] {
  const tags: string[] = []
  const lowerFilename = filename.toLowerCase()
  
  // Filename-based classification
  if (lowerFilename.includes('receipt') || lowerFilename.includes('invoice') || lowerFilename.includes('bill')) {
    tags.push('receipt')
  }
  
  if (lowerFilename.includes('chat') || lowerFilename.includes('message') || lowerFilename.includes('conversation')) {
    tags.push('chat')
  }
  
  if (lowerFilename.includes('meme') || lowerFilename.includes('funny')) {
    tags.push('meme')
  }
  
  if (lowerFilename.includes('error') || lowerFilename.includes('crash') || lowerFilename.includes('bug')) {
    tags.push('error')
  }
  
  if (lowerFilename.includes('ticket') || lowerFilename.includes('boarding')) {
    tags.push('ticket')
  }
  
  if (lowerFilename.includes('map') || lowerFilename.includes('direction')) {
    tags.push('map')
  }
  
  if (lowerFilename.includes('code') || lowerFilename.includes('terminal')) {
    tags.push('code')
  }
  
  // Size-based heuristics
  if (fileSize < 100 * 1024) {
    tags.push('small')
  } else if (fileSize > 5 * 1024 * 1024) {
    tags.push('large')
  }
  
  // Aspect ratio heuristics
  if (aspectRatio > 2) {
    tags.push('panoramic')
  } else if (aspectRatio < 0.8) {
    tags.push('portrait')
  }
  
  // Default tag
  if (tags.length === 0 || (!tags.some(t => VALID_TAGS.includes(t)))) {
    tags.push('screenshot')
  }
  
  return tags
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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
    let classificationMethod = 'heuristic'

    // Try Gemini classification if we have image data
    if (image_base64) {
      try {
        console.log('Classifying with Gemini API...')
        tags = await classifyWithGemini(image_base64, filename)
        classificationMethod = 'gemini'
        console.log('Gemini classification result:', tags)
      } catch (geminiError) {
        console.error('Gemini classification failed:', geminiError)
        // Fall back to heuristics
        const aspectRatio = width && height ? width / height : 1
        tags = classifyWithHeuristics(filename, aspectRatio, size_bytes || 0)
        classificationMethod = 'heuristic (fallback)'
      }
    } else {
      // No image data, use heuristics only
      console.log('No image data provided, using heuristics...')
      const aspectRatio = width && height ? width / height : 1
      tags = classifyWithHeuristics(filename, aspectRatio, size_bytes || 0)
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
