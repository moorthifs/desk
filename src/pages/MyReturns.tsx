import {useEffect, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Center} from '@astryxdesign/core/Center';
import {Section} from '@astryxdesign/core/Section';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Table} from '@astryxdesign/core/Table';
import {Link} from '@astryxdesign/core/Link';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Banner} from '@astryxdesign/core/Banner';
import {Spinner} from '@astryxdesign/core/Spinner';
import {supabase, type TdsReturn} from '../lib/supabase';
import {useAuth} from '../lib/auth';
import {rupees, dateTime, returnTitle} from '../lib/format';
import {StatusToken} from '../components/ReturnParts';

export default function MyReturnsPage() {
  const {session, profile} = useAuth();
  const [rows, setRows] = useState<TdsReturn[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;
    supabase
      .from('tds_returns')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', {ascending: false})
      .then(({data, error: err}) => {
        if (err) setError(err.message);
        setRows((data as TdsReturn[]) ?? []);
      });
  }, [session]);

  return (
    <Center role="main" axis="horizontal">
      <VStack hAlign="center" width="100%">
        <Section width="100%" maxWidth={1100} padding={6} variant="transparent">
          <VStack gap={5}>
            <HStack hAlign="between" vAlign="center" gap={4} wrap="wrap">
              <VStack gap={1}>
                <Heading level={1}>My returns</Heading>
                <Text type="body" color="secondary">
                  {profile?.firm_name || profile?.full_name || 'Your'} TDS / TCS statements and receipts
                </Text>
              </VStack>
              <Button label="Upload a new return" variant="primary" href="/app/new" />
            </HStack>

            {error && <Banner status="error" title={error} />}

            {rows === null ? (
              <Center padding={10}>
                <Spinner size="lg" />
              </Center>
            ) : (
              <Table
                data={rows}
                idKey="id"
                hasHover
                emptyState={
                  <EmptyState
                    title="No returns yet"
                    description="Upload your first FVU file and Form 27A to get started."
                    actions={<Button label="Upload a return" variant="primary" href="/app/new" />}
                  />
                }
                columns={[
                  {
                    key: 'return',
                    header: 'Return',
                    renderCell: r => (
                      <VStack gap={0.5}>
                        <Link href={`/app/returns/${r.id}`} weight="semibold">
                          {returnTitle(r)}
                        </Link>
                        <Text type="supporting" color="secondary">
                          {r.deductor_name} · {r.tan}
                          {r.statement_type === 'correction' ? ' · Correction' : ''}
                        </Text>
                      </VStack>
                    ),
                  },
                  {key: 'status', header: 'Status', renderCell: r => <StatusToken status={r.status} />},
                  {key: 'token', header: 'Token no.', renderCell: r => r.token_number ?? '—'},
                  {key: 'amount', header: 'Amount', align: 'end', renderCell: r => rupees(r.total_amount)},
                  {key: 'date', header: 'Submitted', renderCell: r => dateTime(r.created_at)},
                ]}
              />
            )}
          </VStack>
        </Section>
      </VStack>
    </Center>
  );
}
