
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import { SecurityEnhancedLayout } from './components/security/SecurityEnhancedLayout';
import AppRoutes from './routes/AppRoutes';
import { Toaster } from '@/components/ui/toaster';
import { NetworkBanner } from '@/components/ui/error/NetworkBanner';
import { ThemeProvider } from 'next-themes';

const AppContent = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/50 to-muted">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-muted border-t-primary mx-auto"></div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Loading Dashboard</h2>
            <p className="text-sm text-muted-foreground">Setting up your automotive sales platform...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryProvider>
        <AuthProvider>
          <SecurityEnhancedLayout>
            <div className="min-h-screen bg-background text-foreground w-full">
              {/* Global network health banner */}
              <NetworkBanner />
              <AppContent />
              <Toaster />
            </div>
          </SecurityEnhancedLayout>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

export default App;
