export const supabaseConfig = {
  auth: {
    providers: {
      google: {
        enabled: true,
        scopes: 'email profile',
        redirectTo: '/auth/callback',
      },
    },
    redirect: {
      signIn: '/auth/login',
      signUp: '/auth/signup',
      afterSignIn: '/dashboard',
      afterSignUp: '/dashboard',
      passwordReset: '/auth/reset-password',
      emailConfirm: '/auth/confirm-email',
    },
  },
  storage: {
    key: 'sb-milestone-ai',
  },
}
