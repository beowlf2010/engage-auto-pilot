import { useAuth } from "@/components/auth/AuthProvider";
import { Navigate } from "react-router-dom";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SimpleSmartInboxPage = () => {
  const { profile, loading } = useAuth();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['simple-conversations'],
    queryFn: async () => {
      console.log('Fetching conversations...');
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          lead_id,
          body,
          direction,
          sent_at,
          read_at
        `)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      console.log('Conversations fetched:', data?.length);
      return data || [];
    },
    enabled: !!profile
  });

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Simple Smart Inbox</h1>
      <p className="mb-4">User: {profile.email}</p>
      
      {isLoading ? (
        <p>Loading conversations...</p>
      ) : (
        <div>
          <p className="mb-4">Found {conversations.length} conversations</p>
          <div className="space-y-2">
            {conversations.slice(0, 10).map((conv: any) => (
              <div key={conv.id} className="border p-3 rounded">
                <div className="text-sm text-gray-500">
                  Lead: {conv.lead_id} | Direction: {conv.direction} | 
                  Time: {new Date(conv.sent_at).toLocaleString()}
                </div>
                <div className="mt-1">{conv.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleSmartInboxPage;