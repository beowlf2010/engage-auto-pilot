// Manual test to trigger debug-sms-immediate function
async function testDebugSMS() {
  const response = await fetch('https://tevtajmaofvnffzcsiuu.supabase.co/functions/v1/debug-sms-immediate', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRham1hb2Z2bmZmemNzaXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODgyNDcsImV4cCI6MjA2NTE2NDI0N30.xFuVYGXv9MGio82M8e3vqqDv7mlaaxY7U01o8zEVumg',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  
  const result = await response.json();
  console.log('🔍 Debug SMS Test Result:', result);
  return result;
}

// Run the test
testDebugSMS().catch(console.error);