interface UserActivity {
  type: 'conversation_hover' | 'conversation_selection' | 'search_query' | 'scroll_activity' | 'keyboard_shortcut' | 'mouse_move' | 'click' | 'idle';
  leadId?: string;
  query?: string;
  visibleLeads?: string[];
  timestamp: number;
  metadata?: any;
}

interface ActivityPattern {
  hourlyActivity: number[];
  dailyActivity: number[];
  conversationSequences: string[][];
  searchPatterns: string[];
  averageSessionLength: number;
  lastActiveTime: number;
}

type ActivityCallback = (activity: UserActivity) => void;
type IdleCallback = () => void;

class UserActivityMonitor {
  private activityCallbacks: ActivityCallback[] = [];
  private idleCallbacks: IdleCallback[] = [];
  private isTracking = false;
  private lastActivityTime = Date.now();
  private idleTimeout = 5000; // 5 seconds
  private isIdle = false;
  private currentSession = {
    startTime: Date.now(),
    activities: [] as UserActivity[],
    conversationsAccessed: new Set<string>()
  };

  private activityHistory: UserActivity[] = [];
  private patterns: ActivityPattern = {
    hourlyActivity: new Array(24).fill(0),
    dailyActivity: new Array(7).fill(0),
    conversationSequences: [],
    searchPatterns: [],
    averageSessionLength: 0,
    lastActiveTime: Date.now()
  };

  constructor() {
    this.startTracking();
    this.setupIdleDetection();
  }

  startTracking() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    console.log('👁️ [ACTIVITY MONITOR] Starting user activity tracking');

    // Track mouse movements and clicks
    document.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: true });
    document.addEventListener('click', this.handleClick.bind(this), { passive: true });
    document.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    document.addEventListener('keydown', this.handleKeydown.bind(this), { passive: true });

    // Track conversation list interactions
    this.setupConversationTracking();
    
    // Track search activity
    this.setupSearchTracking();
  }

  private setupConversationTracking() {
    // Use MutationObserver to detect conversation list changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const element = node as Element;
              
              // Track conversation items
              const conversationItems = element.querySelectorAll('[data-lead-id]');
              conversationItems.forEach((item) => {
                this.setupConversationItemTracking(item as HTMLElement);
              });
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private setupConversationItemTracking(element: HTMLElement) {
    const leadId = element.getAttribute('data-lead-id');
    if (!leadId) return;

    // Track hover events
    element.addEventListener('mouseenter', () => {
      this.trackActivity({
        type: 'conversation_hover',
        leadId,
        timestamp: Date.now()
      });
    }, { passive: true });

    // Track selection events
    element.addEventListener('click', () => {
      this.trackActivity({
        type: 'conversation_selection',
        leadId,
        timestamp: Date.now()
      });
      this.currentSession.conversationsAccessed.add(leadId);
    }, { passive: true });
  }

  private setupSearchTracking() {
    // Track search input changes
    const checkForSearchInputs = () => {
      const searchInputs = document.querySelectorAll('input[placeholder*="search" i], input[type="search"]');
      searchInputs.forEach((input) => {
        if (!input.hasAttribute('data-activity-tracked')) {
          input.setAttribute('data-activity-tracked', 'true');
          
          let searchTimeout: NodeJS.Timeout;
          input.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            clearTimeout(searchTimeout);
            
            searchTimeout = setTimeout(() => {
              if (target.value.trim()) {
                this.trackActivity({
                  type: 'search_query',
                  query: target.value.trim(),
                  timestamp: Date.now()
                });
                this.patterns.searchPatterns.push(target.value.trim());
              }
            }, 300);
          }, { passive: true });
        }
      });
    };

    // Check for search inputs periodically
    setInterval(checkForSearchInputs, 2000);
    checkForSearchInputs();
  }

  private setupIdleDetection() {
    setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivityTime;
      
      if (timeSinceLastActivity > this.idleTimeout && !this.isIdle) {
        this.isIdle = true;
        console.log('😴 [ACTIVITY MONITOR] User is now idle');
        this.idleCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('Error in idle callback:', error);
          }
        });
      } else if (timeSinceLastActivity <= this.idleTimeout && this.isIdle) {
        this.isIdle = false;
        console.log('🎯 [ACTIVITY MONITOR] User is now active');
      }
    }, 1000);
  }

  private handleMouseMove(event: MouseEvent) {
    this.updateLastActivity();
    
    // Track scroll activity if moving while near conversation list
    const conversationList = document.querySelector('[data-conversation-list]');
    if (conversationList) {
      const rect = conversationList.getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom) {
        
        // Get visible conversations
        const visibleLeads = this.getVisibleConversations();
        if (visibleLeads.length > 0) {
          this.trackActivity({
            type: 'scroll_activity',
            visibleLeads,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  private handleClick(event: MouseEvent) {
    this.updateLastActivity();
    
    this.trackActivity({
      type: 'click',
      timestamp: Date.now(),
      metadata: {
        target: (event.target as Element)?.tagName,
        x: event.clientX,
        y: event.clientY
      }
    });
  }

  private handleScroll(event: Event) {
    this.updateLastActivity();
    
    // Get visible conversations after scroll
    setTimeout(() => {
      const visibleLeads = this.getVisibleConversations();
      if (visibleLeads.length > 0) {
        this.trackActivity({
          type: 'scroll_activity',
          visibleLeads,
          timestamp: Date.now()
        });
      }
    }, 100);
  }

  private handleKeydown(event: KeyboardEvent) {
    this.updateLastActivity();
    
    // Track keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      this.trackActivity({
        type: 'keyboard_shortcut',
        timestamp: Date.now(),
        metadata: {
          key: event.key,
          ctrl: event.ctrlKey,
          meta: event.metaKey,
          shift: event.shiftKey
        }
      });
    }
  }

  private getVisibleConversations(): string[] {
    const conversationItems = document.querySelectorAll('[data-lead-id]');
    const visibleLeads: string[] = [];
    
    conversationItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
        const leadId = item.getAttribute('data-lead-id');
        if (leadId) {
          visibleLeads.push(leadId);
        }
      }
    });
    
    return visibleLeads;
  }

  private updateLastActivity() {
    this.lastActivityTime = Date.now();
    this.patterns.lastActiveTime = this.lastActivityTime;
  }

  private trackActivity(activity: UserActivity) {
    // Add to current session
    this.currentSession.activities.push(activity);
    
    // Add to history (keep last 1000 activities)
    this.activityHistory.push(activity);
    if (this.activityHistory.length > 1000) {
      this.activityHistory.shift();
    }

    // Update patterns
    this.updateActivityPatterns(activity);

    // Notify callbacks
    this.activityCallbacks.forEach(callback => {
      try {
        callback(activity);
      } catch (error) {
        console.error('Error in activity callback:', error);
      }
    });

    console.log(`📱 [ACTIVITY MONITOR] ${activity.type}:`, activity);
  }

  private updateActivityPatterns(activity: UserActivity) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    this.patterns.hourlyActivity[hour]++;
    this.patterns.dailyActivity[dayOfWeek]++;

    // Track conversation sequences
    if (activity.type === 'conversation_selection' && activity.leadId) {
      const recentConversations = this.activityHistory
        .filter(a => a.type === 'conversation_selection' && a.timestamp > Date.now() - 60000)
        .map(a => a.leadId!)
        .filter(Boolean);
      
      if (recentConversations.length > 1) {
        this.patterns.conversationSequences.push(recentConversations);
      }
    }
  }

  // Public API
  onActivity(callback: ActivityCallback) {
    this.activityCallbacks.push(callback);
    return () => {
      const index = this.activityCallbacks.indexOf(callback);
      if (index > -1) {
        this.activityCallbacks.splice(index, 1);
      }
    };
  }

  onIdle(callback: IdleCallback) {
    this.idleCallbacks.push(callback);
    return () => {
      const index = this.idleCallbacks.indexOf(callback);
      if (index > -1) {
        this.idleCallbacks.splice(index, 1);
      }
    };
  }

  getActivityPatterns(): ActivityPattern {
    return { ...this.patterns };
  }

  getCurrentSession() {
    return {
      ...this.currentSession,
      duration: Date.now() - this.currentSession.startTime,
      conversationsAccessed: Array.from(this.currentSession.conversationsAccessed)
    };
  }

  getRecentActivity(minutes = 5): UserActivity[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.activityHistory.filter(activity => activity.timestamp > cutoff);
  }

  isUserIdle(): boolean {
    return this.isIdle;
  }

  stop() {
    this.isTracking = false;
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('scroll', this.handleScroll);
    document.removeEventListener('keydown', this.handleKeydown);
    console.log('🛑 [ACTIVITY MONITOR] Stopped tracking user activity');
  }
}

export const userActivityMonitor = new UserActivityMonitor();
