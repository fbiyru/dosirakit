import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set(name, value);
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set(name, value, options as Record<string, string>);
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set(name, '');
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set(name, '', options as Record<string, string>);
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Redirect unauthenticated users to login (except for login page and root)
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isRoot = request.nextUrl.pathname === '/';

  if (!session && !isLoginPage && !isRoot) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from login
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
