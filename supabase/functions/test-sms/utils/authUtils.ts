
interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
  statusCode?: number;
}

export async function authenticateAndAuthorize(req: Request, supabase: any): Promise<AuthResult> {
  console.log('🔐 Performing auth check...');
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader) {
    console.log('❌ No authorization header');
    return {
      success: false,
      error: 'No authorization header',
      statusCode: 401
    }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )

  if (authError || !user) {
    console.error('❌ Auth check failed:', authError);
    return {
      success: false,
      error: 'Unauthorized',
      statusCode: 401
    }
  }
  
  console.log('✅ Auth check passed for user:', user.id);

  console.log('👑 Performing admin check...');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    console.error('❌ Admin check failed for user:', user.id, 'Role:', profile?.role);
    return {
      success: false,
      error: 'Admin access required',
      statusCode: 403
    }
  }
  
  console.log('✅ Admin check passed');
  return {
    success: true,
    user
  }
}
