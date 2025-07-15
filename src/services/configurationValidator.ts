import { supabase } from '@/integrations/supabase/client';

interface ConfigurationRule {
  id: string;
  name: string;
  category: 'critical' | 'important' | 'recommended';
  description: string;
  check: () => Promise<ConfigurationIssue | null>;
  autoFix?: () => Promise<void>;
}

interface ConfigurationIssue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: any;
  fixable: boolean;
  recommendations: string[];
}

interface ConfigurationValidationReport {
  timestamp: Date;
  overallStatus: 'healthy' | 'warnings' | 'errors';
  issues: ConfigurationIssue[];
  score: number;
  summary: string;
}

export class ConfigurationValidator {
  private static instance: ConfigurationValidator;
  private rules: ConfigurationRule[] = [];

  static getInstance(): ConfigurationValidator {
    if (!ConfigurationValidator.instance) {
      ConfigurationValidator.instance = new ConfigurationValidator();
    }
    return ConfigurationValidator.instance;
  }

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    this.rules = [
      {
        id: 'emergency-settings-exist',
        name: 'Emergency Settings Configuration',
        category: 'critical',
        description: 'Verify emergency control settings are properly configured',
        check: async () => {
          const { data, error } = await supabase
            .from('ai_emergency_settings')
            .select('*')
            .limit(1);

          if (error || !data || data.length === 0) {
            return {
              rule: 'emergency-settings-exist',
              severity: 'error' as const,
              message: 'Emergency settings not configured',
              fixable: true,
              recommendations: [
                'Initialize emergency settings table',
                'Configure emergency stop controls',
                'Set up AI disable mechanisms'
              ]
            };
          }
          return null;
        },
        autoFix: async () => {
          await supabase.from('ai_emergency_settings').insert({
            ai_disabled: false,
            disable_reason: null
          });
        }
      },
      {
        id: 'automation-control-configured',
        name: 'AI Automation Control Settings',
        category: 'critical',
        description: 'Verify AI automation control parameters are set',
        check: async () => {
          const { data, error } = await supabase
            .from('ai_automation_control')
            .select('*')
            .limit(1);

          if (error || !data || data.length === 0) {
            return {
              rule: 'automation-control-configured',
              severity: 'error' as const,
              message: 'AI automation control not configured',
              fixable: true,
              recommendations: [
                'Initialize automation control settings',
                'Set concurrency limits',
                'Configure timeout values'
              ]
            };
          }

          const config = data[0];
          const issues = [];
          
          if (!config.max_concurrent_runs || config.max_concurrent_runs > 5) {
            issues.push('Max concurrent runs should be set between 1-5');
          }
          
          if (!config.global_timeout_minutes || config.global_timeout_minutes > 10) {
            issues.push('Global timeout should be set between 1-10 minutes');
          }

          if (issues.length > 0) {
            return {
              rule: 'automation-control-configured',
              severity: 'warning' as const,
              message: 'Automation control settings need optimization',
              details: issues,
              fixable: true,
              recommendations: [
                'Optimize concurrency settings for stability',
                'Set appropriate timeout values',
                'Review performance impact'
              ]
            };
          }
          
          return null;
        },
        autoFix: async () => {
          await supabase.from('ai_automation_control').upsert({
            max_concurrent_runs: 2,
            global_timeout_minutes: 5,
            automation_enabled: true,
            emergency_stop: false
          });
        }
      },
      {
        id: 'message-templates-available',
        name: 'AI Message Templates',
        category: 'important',
        description: 'Ensure AI message templates are configured',
        check: async () => {
          const { data, error } = await supabase
            .from('ai_message_templates')
            .select('*')
            .eq('is_active', true);

          if (error) {
            return {
              rule: 'message-templates-available',
              severity: 'error' as const,
              message: 'Cannot access message templates',
              fixable: false,
              recommendations: [
                'Check database connectivity',
                'Verify table permissions'
              ]
            };
          }

          if (!data || data.length < 3) {
            return {
              rule: 'message-templates-available',
              severity: 'warning' as const,
              message: `Only ${data?.length || 0} active message templates found`,
              fixable: false,
              recommendations: [
                'Add more message template variations',
                'Ensure templates cover all conversation stages',
                'Test template effectiveness'
              ]
            };
          }

          return null;
        }
      },
      {
        id: 'edge-functions-responsive',
        name: 'Edge Function Health',
        category: 'critical',
        description: 'Verify critical edge functions are responsive',
        check: async () => {
          try {
            const startTime = Date.now();
            const { error } = await supabase.functions.invoke('test-simple', {
              body: { test: true }
            });
            const responseTime = Date.now() - startTime;

            if (error) {
              return {
                rule: 'edge-functions-responsive',
                severity: 'error' as const,
                message: 'Edge functions not responding',
                details: { error: error.message },
                fixable: false,
                recommendations: [
                  'Check edge function deployment status',
                  'Verify function permissions',
                  'Review function logs for errors'
                ]
              };
            }

            if (responseTime > 5000) {
              return {
                rule: 'edge-functions-responsive',
                severity: 'warning' as const,
                message: `Edge function response time elevated (${responseTime}ms)`,
                fixable: false,
                recommendations: [
                  'Investigate function performance',
                  'Check for cold starts',
                  'Optimize function code'
                ]
              };
            }

            return null;
          } catch (error) {
            return {
              rule: 'edge-functions-responsive',
              severity: 'error' as const,
              message: 'Edge function test failed',
              details: { error: error instanceof Error ? error.message : 'Unknown error' },
              fixable: false,
              recommendations: [
                'Check network connectivity',
                'Verify Supabase project status',
                'Review edge function deployment'
              ]
            };
          }
        }
      },
      {
        id: 'database-performance',
        name: 'Database Performance',
        category: 'important',
        description: 'Check database query performance',
        check: async () => {
          try {
            const startTime = Date.now();
            const { data, error } = await supabase
              .from('leads')
              .select('id')
              .limit(10);
            const queryTime = Date.now() - startTime;

            if (error) {
              return {
                rule: 'database-performance',
                severity: 'error' as const,
                message: 'Database query failed',
                details: { error: error.message },
                fixable: false,
                recommendations: [
                  'Check database connectivity',
                  'Verify table permissions',
                  'Review RLS policies'
                ]
              };
            }

            if (queryTime > 2000) {
              return {
                rule: 'database-performance',
                severity: 'warning' as const,
                message: `Database queries are slow (${queryTime}ms)`,
                fixable: false,
                recommendations: [
                  'Check database load',
                  'Review query optimization',
                  'Consider indexing improvements'
                ]
              };
            }

            return null;
          } catch (error) {
            return {
              rule: 'database-performance',
              severity: 'error' as const,
              message: 'Database performance test failed',
              fixable: false,
              recommendations: [
                'Check database connectivity',
                'Verify Supabase project status'
              ]
            };
          }
        }
      },
      {
        id: 'stuck-processes',
        name: 'Stuck Process Detection',
        category: 'important',
        description: 'Detect and report stuck automation processes',
        check: async () => {
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          
          const { data, error } = await supabase
            .from('ai_automation_runs')
            .select('id, started_at, status')
            .eq('status', 'running')
            .lt('started_at', thirtyMinutesAgo);

          if (error) {
            return {
              rule: 'stuck-processes',
              severity: 'warning' as const,
              message: 'Cannot check for stuck processes',
              fixable: false,
              recommendations: [
                'Check database connectivity',
                'Verify automation runs table access'
              ]
            };
          }

          if (data && data.length > 0) {
            return {
              rule: 'stuck-processes',
              severity: 'warning' as const,
              message: `${data.length} automation processes may be stuck`,
              details: { stuckProcesses: data },
              fixable: true,
              recommendations: [
                'Review stuck process details',
                'Consider manual intervention',
                'Check for edge function timeouts'
              ]
            };
          }

          return null;
        },
        autoFix: async () => {
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          
          await supabase
            .from('ai_automation_runs')
            .update({ 
              status: 'failed', 
              error_message: 'Marked as failed by configuration validator - process stuck',
              completed_at: new Date().toISOString()
            })
            .eq('status', 'running')
            .lt('started_at', thirtyMinutesAgo);
        }
      }
    ];
  }

  async validateConfiguration(): Promise<ConfigurationValidationReport> {
    console.log('🔍 Starting configuration validation...');
    
    const issues: ConfigurationIssue[] = [];
    const startTime = Date.now();

    // Run all validation rules
    for (const rule of this.rules) {
      try {
        const issue = await rule.check();
        if (issue) {
          issues.push(issue);
        }
      } catch (error) {
        issues.push({
          rule: rule.id,
          severity: 'error',
          message: `Validation rule '${rule.name}' failed to execute`,
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          fixable: false,
          recommendations: ['Review validation rule implementation']
        });
      }
    }

    // Calculate overall status and score
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    
    const overallStatus: ConfigurationValidationReport['overallStatus'] = 
      errorCount > 0 ? 'errors' : 
      warningCount > 0 ? 'warnings' : 'healthy';

    const score = Math.round(((this.rules.length - errorCount - (warningCount * 0.5)) / this.rules.length) * 100);

    const report: ConfigurationValidationReport = {
      timestamp: new Date(),
      overallStatus,
      issues,
      score,
      summary: this.generateSummary(issues, errorCount, warningCount)
    };

    console.log(`✅ Configuration validation completed in ${Date.now() - startTime}ms - Score: ${score}%`);
    return report;
  }

  private generateSummary(issues: ConfigurationIssue[], errorCount: number, warningCount: number): string {
    if (issues.length === 0) {
      return 'All configuration checks passed successfully';
    }
    
    const parts = [];
    if (errorCount > 0) {
      parts.push(`${errorCount} error${errorCount === 1 ? '' : 's'}`);
    }
    if (warningCount > 0) {
      parts.push(`${warningCount} warning${warningCount === 1 ? '' : 's'}`);
    }
    
    return `Configuration validation found ${parts.join(' and ')}`;
  }

  async autoFixIssues(): Promise<{ fixed: number; failed: number; details: string[] }> {
    console.log('🔧 Starting automatic issue remediation...');
    
    const report = await this.validateConfiguration();
    const fixableIssues = report.issues.filter(i => i.fixable);
    
    let fixed = 0;
    let failed = 0;
    const details: string[] = [];

    for (const issue of fixableIssues) {
      const rule = this.rules.find(r => r.id === issue.rule);
      if (rule?.autoFix) {
        try {
          await rule.autoFix();
          fixed++;
          details.push(`✅ Fixed: ${rule.name}`);
          console.log(`✅ Auto-fixed: ${rule.name}`);
        } catch (error) {
          failed++;
          details.push(`❌ Failed to fix: ${rule.name} - ${error instanceof Error ? error.message : 'Unknown error'}`);
          console.error(`❌ Auto-fix failed for ${rule.name}:`, error);
        }
      }
    }

    console.log(`🔧 Auto-remediation completed: ${fixed} fixed, ${failed} failed`);
    return { fixed, failed, details };
  }

  getRules(): ConfigurationRule[] {
    return [...this.rules];
  }

  addCustomRule(rule: ConfigurationRule): void {
    this.rules.push(rule);
  }
}