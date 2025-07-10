import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    const { callLogId, recordingUrl, leadId } = await req.json();

    console.log('🎙️ [VOICE AI] Starting transcription for call:', callLogId);

    // Create transcription record
    const { data: transcription, error: transcriptionError } = await supabase
      .from('call_transcriptions')
      .insert({
        call_log_id: callLogId,
        lead_id: leadId,
        recording_url: recordingUrl,
        processing_status: 'processing'
      })
      .select()
      .single();

    if (transcriptionError) {
      throw new Error(`Failed to create transcription record: ${transcriptionError.message}`);
    }

    // Download audio from Twilio recording URL
    console.log('📥 Downloading recording from:', recordingUrl);
    const audioResponse = await fetch(recordingUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download recording: ${audioResponse.status}`);
    }

    const audioArrayBuffer = await audioResponse.arrayBuffer();
    const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/wav' });

    // Prepare form data for OpenAI Whisper
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');

    console.log('🤖 Sending to OpenAI Whisper for transcription...');

    // Send to OpenAI Whisper
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text();
      console.error('❌ OpenAI Whisper error:', error);
      throw new Error(`OpenAI Whisper error: ${whisperResponse.status}`);
    }

    const whisperData = await whisperResponse.json();
    
    console.log('✅ Transcription completed:', {
      duration: whisperData.duration,
      textLength: whisperData.text?.length || 0,
      confidence: whisperData.words?.length || 0
    });

    // Calculate average confidence from words
    const averageConfidence = whisperData.words?.length > 0 
      ? whisperData.words.reduce((sum: number, word: any) => sum + (word.confidence || 0), 0) / whisperData.words.length
      : 0.9;

    // Update transcription record with results
    await supabase
      .from('call_transcriptions')
      .update({
        transcript_text: whisperData.text,
        transcript_confidence: Math.round(averageConfidence * 100) / 100,
        processing_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', transcription.id);

    console.log('✅ Transcription saved to database');

    return new Response(JSON.stringify({
      success: true,
      transcriptionId: transcription.id,
      text: whisperData.text,
      confidence: averageConfidence,
      duration: whisperData.duration,
      words: whisperData.words?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [VOICE AI] Transcription error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to process voice transcription',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});