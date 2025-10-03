
export const designSystem = {
  colors: {
    gradients: {
      primary: 'bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600',
      secondary: 'bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600',
      success: 'bg-gradient-to-br from-emerald-500 to-green-600',
      warning: 'bg-gradient-to-br from-amber-500 to-orange-600',
      danger: 'bg-gradient-to-br from-red-500 to-rose-600',
      info: 'bg-gradient-to-br from-cyan-500 to-blue-600',
      glass: 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/20 dark:border-white/10',
      glassCard: 'bg-white/60 dark:bg-gray-800/60 backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-xl',
      glassSurface: 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border border-gray-200/30 dark:border-gray-700/30',
      messageOut: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30',
      messageIn: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200/50 dark:border-gray-600/50',
      autovantage: 'bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600'
    },
    surfaces: {
      elevated: 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl',
      glass: 'bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl border border-white/30 dark:border-white/10',
      card: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/30 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]',
      floatingCard: 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/40 dark:border-gray-700/20 shadow-2xl hover:shadow-blue-500/20 transition-all duration-300'
    }
  },
  animations: {
    fadeIn: 'animate-in fade-in-0 duration-500',
    slideUp: 'animate-in slide-in-from-bottom-4 duration-500',
    scaleIn: 'animate-in zoom-in-95 duration-300',
    hover: 'hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 ease-out',
    springIn: 'animate-in zoom-in-95 slide-in-from-bottom-2 duration-400',
    messageAppear: 'animate-in fade-in-0 slide-in-from-bottom-3 duration-400 ease-out',
    pulseGlow: 'animate-pulse-glow',
    smoothSlide: 'transition-all duration-500 ease-in-out'
  },
  shadows: {
    glow: 'shadow-2xl shadow-primary/25 dark:shadow-primary/40',
    glowBlue: 'shadow-xl shadow-blue-500/30 dark:shadow-blue-400/50',
    glowPurple: 'shadow-xl shadow-purple-500/30 dark:shadow-purple-400/50',
    soft: 'shadow-lg shadow-gray-200/60 dark:shadow-gray-900/60',
    elevated: 'shadow-2xl shadow-gray-900/10 dark:shadow-black/40',
    floating: 'shadow-2xl shadow-gray-900/20 dark:shadow-black/60 hover:shadow-3xl hover:shadow-gray-900/30 transition-shadow duration-300',
    autovantage: 'shadow-xl shadow-blue-600/25 dark:shadow-blue-400/40'
  },
  effects: {
    blur: {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-lg',
      xl: 'backdrop-blur-xl',
      '2xl': 'backdrop-blur-2xl'
    },
    gradient: {
      mesh: 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20',
      subtle: 'bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-800'
    }
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
