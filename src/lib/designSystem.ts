
export const designSystem = {
  colors: {
    gradients: {
      primary: 'bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700',
      secondary: 'bg-gradient-to-br from-green-500 via-green-600 to-teal-600',
      success: 'bg-gradient-to-br from-emerald-500 to-green-600',
      warning: 'bg-gradient-to-br from-amber-500 to-orange-600',
      danger: 'bg-gradient-to-br from-red-500 to-rose-600',
      info: 'bg-gradient-to-br from-cyan-500 to-blue-600',
      glass: 'bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl',
      darkGlass: 'bg-gradient-to-br from-gray-900/60 to-gray-800/40 backdrop-blur-xl',
      autovantage: 'bg-gradient-to-r from-blue-700 via-blue-800 to-purple-700'
    },
    surfaces: {
      elevated: 'bg-white/95 backdrop-blur-md border border-white/20 shadow-xl',
      glass: 'bg-white/10 backdrop-blur-md border border-white/20',
      card: 'bg-white border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300'
    }
  },
  animations: {
    fadeIn: 'animate-in fade-in-0 duration-500',
    slideUp: 'animate-in slide-in-from-bottom-4 duration-500',
    scaleIn: 'animate-in zoom-in-95 duration-300',
    hover: 'hover:scale-105 hover:-translate-y-1 transition-all duration-300'
  },
  shadows: {
    glow: 'shadow-2xl shadow-blue-500/25',
    soft: 'shadow-lg shadow-gray-200/50',
    elevated: 'shadow-xl shadow-gray-900/10',
    autovantage: 'shadow-lg shadow-blue-600/20'
  }
};

export const getStatusColor = (status: string) => {
  const statusColors = {
    'new': 'bg-gradient-to-r from-blue-500 to-blue-600',
    'contacted': 'bg-gradient-to-r from-yellow-500 to-orange-500',
    'qualified': 'bg-gradient-to-r from-green-500 to-emerald-600',
    'negotiating': 'bg-gradient-to-r from-purple-500 to-purple-600',
    'won': 'bg-gradient-to-r from-emerald-500 to-green-600',
    'lost': 'bg-gradient-to-r from-red-500 to-red-600',
    'cold': 'bg-gradient-to-r from-gray-400 to-gray-500'
  };
  return statusColors[status as keyof typeof statusColors] || statusColors.new;
};
