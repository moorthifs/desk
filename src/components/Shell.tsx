import type {ReactNode} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {AppShell} from '@astryxdesign/core/AppShell';
import {TopNav, TopNavHeading, TopNavItem} from '@astryxdesign/core/TopNav';
import {HStack} from '@astryxdesign/core/Layout';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Banner} from '@astryxdesign/core/Banner';
import {DocumentArrowUpIcon} from '@heroicons/react/24/outline';
import {useAuth} from '../lib/auth';
import {supabase, isConfigured} from '../lib/supabase';
import {BUSINESS} from '../lib/format';

export default function Shell({children}: {children: ReactNode}) {
  const {session, profile} = useAuth();
  const {pathname} = useLocation();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const nav = (
    <TopNav
      heading={
        <TopNavHeading
          logo={<Icon icon={DocumentArrowUpIcon} size="lg" color="accent" />}
          heading="TDS Upload"
          subheading={BUSINESS.name}
          headingHref="/"
        />
      }
      startContent={
        session ? (
          <HStack gap={1}>
            <TopNavItem label="My returns" href="/app" isSelected={pathname.startsWith('/app')} />
            {profile?.is_admin && (
              <>
                <TopNavItem label="Admin queue" href="/admin" isSelected={pathname === '/admin' || pathname.startsWith('/admin/returns')} />
                <TopNavItem label="Fees" href="/admin/fees" isSelected={pathname === '/admin/fees'} />
              </>
            )}
          </HStack>
        ) : undefined
      }
      endContent={
        session ? (
          <HStack gap={2} vAlign="center">
            <Button label="New return" variant="primary" href="/app/new" />
            <Button label="Sign out" variant="ghost" onClick={signOut} />
          </HStack>
        ) : (
          <HStack gap={2} vAlign="center">
            <Button label="Sign in" variant="ghost" href="/login" />
            <Button label="Create account" variant="primary" href="/signup" />
          </HStack>
        )
      }
    />
  );

  return (
    <AppShell
      topNav={nav}
      height="auto"
      variant="section"
      banner={
        isConfigured ? undefined : (
          <Banner
            status="warning"
            container="section"
            title="Setup pending: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect the portal."
          />
        )
      }>
      {children}
    </AppShell>
  );
}
