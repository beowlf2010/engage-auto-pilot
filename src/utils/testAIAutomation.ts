import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://tevtajmaofvnffzcsiuu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRham1hb2Z2bmZmemNzaXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODgyNDcsImV4cCI6MjA2NTE2NDI0N30.xFuVYGXv9MGio82M8e3vqqDv7mlaaxY7U01o8zEVumg'
);

export const testAIAutomation = async () => {
  console.log('🧪 Testing AI Automation Function...');
  
  try {
    const { data, error } = await supabase.functions.invoke('ai-automation', {
      body: {
        automated: false,
        source: 'debug_test',
        priority: 'debug',
        enhanced: true
      }
    });

    if (error) {
      console.error('❌ Function invoke error:', error);
      return { success: false, error };
    }

    console.log('✅ Function response:', data);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Critical error:', err);
    return { success: false, error: err.message };
  }
};

// Auto-run test
testAIAutomation().then(result => {
  console.log('🔍 Test result:', result);
});