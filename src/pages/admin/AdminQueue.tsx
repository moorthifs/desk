import {useEffect, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Center} from '@astryxdesign/core/Center';
import {Section} from '@astryxdesign/core/Section';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Table} from '@astryxdesign/core/Table';
import {Link} from '@astryxdesign/core/Link';
import {Selector} from '@astryxdesign/core/Selector';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Banner} from '@astryxdesign/core/Banner';
import {Spinner} from '@astryxdesign/core/Spinner';
import {supabase, type Profile, type TdsReturn} from '../../lib/supabase';
import {rupees, dateTime, returnTitle, STATUS} from '../../lib/format';
import {StatusToken} from '../../components/ReturnParts';

type Row = TdsReturn & {profiles: Pick<Profile, 'full_name' | 'firm_name' | 'phone'> | null};

const FILTERS = [
  {value: 'todo', label: 'To do (paid / uploading)'},
  {value: 'awaiting_payment', label: STATUS.awaiting_payment.label},
  {value: 'uploaded', label: STATUS.uploaded.label},
  {value: 'rejected', label: STATUS.rejected.label},
  {value: 'all', label: 'All'},
];

export default function AdminQueuePage() {
  const [filter, setFilter] = useState<string>('todo');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setRows(null);
    let q = supabase
      .from('tds_returns')
      .select('*, profiles(full_name, firm_name, phone)')
      .order('created_at', {ascending: filter === 'todo'})
      .limit(300);
    if (filter === 'todo') q = q.in('status', ['paid', 'in_progress']);
    else if (filter && filter !== 'all') q = q.eq('status', filter);
    q.then(({data, error: e}) => {
      if (e) setError(e.message);
      setRows((data as Row[]) ?? []);
    });
  }, [filter]);

  const paidThisMonth = (rows ?? []).filter(
    r => r.paid_at && new Date(r.paid_at).getMonth() === new Date().getMonth(),
  ).length;

  return (
    <Center role="main" axis="horizontal">
      <VStack hAlign="center" width="100%">
        <Section width="100%" maxWidth={1200} padding={6} variant="transparent">
          <VStack gap={5}>
            <HStack hAlign="between" vAlign="end" gap={4} wrap="wrap">
              <VStack gap={1}>
                <Heading level={1}>Admin queue</Heading>
                <Text type="body" color="secondary">
                  Oldest paid returns first. Download, upload at TIN-FC, then post the receipt.
                </Text>
              </VStack>
              <Selector label="Show" options={FILTERS} value={filter} onChange={setFilter} width={260} />
            </HStack>

            {error && <Banner status="error" title={error} />}

            {rows === null ? (
              <Center padding={10}>
                <Spinner size="lg" />
              </Center>
            ) : (
              <>
                <Text type="supporting" color="secondary">
                  {rows.length} shown{filter === 'all' ? ` · ${paidThisMonth} paid this month` : ''}
                </Text>
                <Table
                  data={rows}
                  idKey="id"
                  hasHover
                  emptyState={<EmptyState title="Nothing here" description="No returns match this filter." isCompact />}
                  columns={[
                    {
                      key: 'return',
                      header: 'Return',
                      renderCell: r => (
                        <VStack gap={0.5}>
                          <Link href={`/admin/returns/${r.id}`} weight="semibold">
                            {returnTitle(r)}
                          </Link>
                          <Text type="supporting" color="secondary">
                            {r.tan} · {r.record_count} records
                            {r.statement_type === 'correction' ? ' · Correction' : ''}
                          </Text>
                        </VStack>
                      ),
                    },
                    {
                      key: 'customer',
                      header: 'Customer',
                      renderCell: r => (
                        <VStack gap={0.5}>
                          <Text type="body">{r.profiles?.firm_name || r.profiles?.full_name || '—'}</Text>
                          <Text type="supporting" color="secondary">
                            {r.profiles?.phone}
                          </Text>
                        </VStack>
                      ),
                    },
                    {key: 'status', header: 'Status', renderCell: r => <StatusToken status={r.status} />},
                    {key: 'amount', header: 'Amount', align: 'end', renderCell: r => rupees(r.total_amount)},
                    {key: 'paid', header: 'Paid on', renderCell: r => dateTime(r.paid_at)},
                  ]}
                />
              </>
            )}
          </VStack>
        </Section>
      </VStack>
    </Center>
  );
}
