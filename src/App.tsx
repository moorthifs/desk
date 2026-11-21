import {forwardRef, type AnchorHTMLAttributes, type ReactNode} from 'react';
import {BrowserRouter, Link as RouterLink, Navigate, Route, Routes} from 'react-router-dom';
import {Theme} from '@astryxdesign/core/theme';
import {LinkProvider} from '@astryxdesign/core/Link';
import {Center} from '@astryxdesign/core/Center';
import {Spinner} from '@astryxdesign/core/Spinner';
import {themes, defaultThemeSlug} from './astryx-themes';
import {AuthProvider, useAuth} from './lib/auth';
import Shell from './components/Shell';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import MyReturnsPage from './pages/MyReturns';
import NewReturnPage from './pages/NewReturn';
import ReturnDetailPage from './pages/ReturnDetail';
import AdminQueuePage from './pages/admin/AdminQueue';
import AdminReturnPage from './pages/admin/AdminReturn';
import AdminFeesPage from './pages/admin/AdminFees';

// Lets every Astryx link and button use client-side routing for in-app paths.
const AppLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & {href?: string}>(
  function AppLink({href = '', ...rest}, ref) {
    if (/^(https?:|mailto:|tel:|\/\/)/.test(href)) return <a ref={ref} href={href} {...rest} />;
    return <RouterLink ref={ref} to={href} {...rest} />;
  },
);

function Loading() {
  return (
    <Center axis="both" padding={10}>
      <Spinner size="lg" />
    </Center>
  );
}

function RequireUser({children}: {children: ReactNode}) {
  const {session, isLoading} = useAuth();
  if (isLoading) return <Loading />;
  return session ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireAdmin({children}: {children: ReactNode}) {
  const {session, profile, isLoading} = useAuth();
  if (isLoading || (session && !profile)) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  return profile?.is_admin ? <>{children}</> : <Navigate to="/app" replace />;
}

export default function App() {
  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <BrowserRouter>
        <LinkProvider component={AppLink}>
          <AuthProvider>
            <Shell>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/app" element={<RequireUser><MyReturnsPage /></RequireUser>} />
                <Route path="/app/new" element={<RequireUser><NewReturnPage /></RequireUser>} />
                <Route path="/app/returns/:id" element={<RequireUser><ReturnDetailPage /></RequireUser>} />
                <Route path="/admin" element={<RequireAdmin><AdminQueuePage /></RequireAdmin>} />
                <Route path="/admin/returns/:id" element={<RequireAdmin><AdminReturnPage /></RequireAdmin>} />
                <Route path="/admin/fees" element={<RequireAdmin><AdminFeesPage /></RequireAdmin>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Shell>
          </AuthProvider>
        </LinkProvider>
      </BrowserRouter>
    </Theme>
  );
}
