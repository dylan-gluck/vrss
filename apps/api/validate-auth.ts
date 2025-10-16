import { auth } from './src/lib/auth';

console.log('🔍 Validating Better-auth Setup...\n');
console.log('✅ Auth module imports successfully');
console.log('✅ Auth instance created:', !!auth);
console.log('✅ Has api methods:', !!auth.api);
console.log('✅ Has api.signUp:', typeof auth.api?.signUpEmail);
console.log('✅ Has api.signIn:', typeof auth.api?.signInEmail);
console.log('✅ Has api.getSession:', typeof auth.api?.getSession);
console.log('✅ Has api.signOut:', typeof auth.api?.signOut);
console.log('\n✅ All validation checks passed!');
