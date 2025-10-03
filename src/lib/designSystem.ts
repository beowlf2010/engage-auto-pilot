export const designSystem = {
  colors: {
    gradients: {
      primary: 'bg-gradient-to-br from-primary via-primary/90 to-primary-glow',
      secondary: 'bg-gradient-to-br from-secondary via-secondary/90 to-accent',
      success: 'bg-gradient-to-br from-success/90 to-success',
      warning: 'bg-gradient-to-br from-warning/90 to-warning',
      danger: 'bg-gradient-to-br from-destructive/90 to-destructive',
      info: 'bg-gradient-to-br from-primary/80 to-primary',
      glass: 'bg-background/70 backdrop-blur-xl border border-border/50',
      glassCard: 'bg-card/60 backdrop-blur-2xl border border-border/30 shadow-[var(--shadow-card)]',
      glassSurface: 'bg-background/80 backdrop-blur-lg border border-border/30',
      messageOut: 'bg-gradient-to-br from-primary to-primary/90 shadow-lg shadow-primary/30',
      messageIn: 'bg-gradient-to-br from-card/90 to-muted/80 border border-border/50',
      autovantage: 'bg-gradient-to-r from-primary via-primary/90 to-primary-glow',
      mesh: 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-accent/5'
    },
    surfaces: {
      elevated: 'bg-card/95 backdrop-blur-xl border border-border/50 shadow-[var(--shadow-floating)]',
      glass: 'bg-card/40 backdrop-blur-2xl border border-border/30',
      card: 'bg-card/80 backdrop-blur-md border border-border/50 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-floating)] transition-all duration-500 hover:scale-[1.02]',
      floatingCard: 'bg-card/90 backdrop-blur-xl border border-border/40 shadow-[var(--shadow-floating)] hover:shadow-primary/20 transition-all duration-300',
      frostedGlass: 'bg-background/60 backdrop-blur-3xl border border-border/20 shadow-[var(--shadow-elegant)]',
      modernCard: 'bg-gradient-to-br from-card to-card/95 backdrop-blur-sm border border-border/40 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elegant)] transition-all duration-300'
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
    smoothSlide: 'transition-all duration-500 ease-in-out',
    smoothTransition: 'transition-[var(--transition-smooth)]',
    bounceTransition: 'transition-[var(--transition-bounce)]',
    springTransition: 'transition-[var(--transition-spring)]',
    staggeredFadeIn: 'animate-in fade-in-0 slide-in-from-bottom-2 duration-400',
    hoverLift: 'hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 ease-out hover:shadow-[var(--shadow-floating)]',
    subtleHover: 'hover:bg-accent/50 transition-all duration-200'
  },
  shadows: {
    glow: 'shadow-[var(--shadow-glow)]',
    glowPrimary: 'shadow-xl shadow-primary/30',
    glowSuccess: 'shadow-xl shadow-success/30',
    glowWarning: 'shadow-xl shadow-warning/30',
    soft: 'shadow-[var(--shadow-card)]',
    elegant: 'shadow-[var(--shadow-elegant)]',
    elevated: 'shadow-[var(--shadow-floating)]',
    floating: 'shadow-[var(--shadow-floating)] hover:shadow-[var(--shadow-elegant)] transition-shadow duration-300',
    autovantage: 'shadow-xl shadow-primary/25',
    modernCard: 'shadow-[0_2px_8px_-1px_hsl(var(--foreground)/0.1)] hover:shadow-[0_8px_25px_-5px_hsl(var(--foreground)/0.15)]'
  },
  effects: {
    blur: {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-lg',
      xl: 'backdrop-blur-xl',
      '2xl': 'backdrop-blur-2xl',
      '3xl': 'backdrop-blur-[40px]'
    },
    gradient: {
      mesh: 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-accent/5',
      subtle: 'bg-gradient-to-b from-background/50 to-background',
      meshAnimated: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-primary-glow/5',
      cardGradient: 'bg-gradient-to-br from-card to-card/95'
    },
    glow: {
      primary: 'before:absolute before:inset-0 before:rounded-[inherit] before:bg-primary/10 before:blur-xl before:-z-10',
      soft: 'after:absolute after:inset-0 after:rounded-[inherit] after:bg-gradient-to-t after:from-primary/5 after:to-transparent after:-z-10'
    }
  },
  typography: {
    heading: 'font-bold tracking-tight text-foreground',
    subheading: 'font-semibold text-foreground/90',
    body: 'text-foreground/80',
    muted: 'text-muted-foreground',
    gradient: 'bg-gradient-to-r from-primary via-primary/90 to-primary-glow bg-clip-text text-transparent'
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
