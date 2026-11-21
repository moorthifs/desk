import {useEffect, useState} from 'react';
import {VStack} from '@astryxdesign/core/Layout';
import {Center} from '@astryxdesign/core/Center';
import {Section} from '@astryxdesign/core/Section';
import {Grid} from '@astryxdesign/core/Grid';
import {Card} from '@astryxdesign/core/Card';
import {Text, Heading} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {supabase, quoteFrom, type FeeSettings} from '../../lib/supabase';
import {useFees} from '../../lib/useFees';
import {rupees} from '../../lib/format';

const FIELDS: {key: keyof FeeSettings; label: string; description: string}[] = [
  {key: 'slab1_fee', label: 'TIN fee: up to 100 records (₹)', description: 'Excluding GST'},
  {key: 'slab2_fee', label: 'TIN fee: 101 – 1,000 records (₹)', description: 'Excluding GST'},
  {key: 'slab3_fee', label: 'TIN fee: above 1,000 records (₹)', description: 'Excluding GST'},
  {key: 'tin_gst_rate', label: 'GST on TIN fee (%)', description: 'Usually 18'},
  {key: 'service_charge', label: 'Our service charge per return (₹)', description: 'Excluding GST'},
  {key: 'service_gst_rate', label: 'GST on service charge (%)', description: 'Set 18 if you bill GST, else 0'},
];

export default function AdminFeesPage() {
  const current = useFees();
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);

  useEffect(() => {
    setForm(Object.fromEntries(FIELDS.map(f => [f.key, String(current[f.key])])));
  }, [current]);

  const values = Object.fromEntries(FIELDS.map(f => [f.key, Number(form[f.key])])) as FeeSettings;
  const isValid = FIELDS.every(f => Number.isFinite(values[f.key]) && values[f.key] >= 0);

  const save = async () => {
    setMsg(null);
    if (!isValid) return setMsg({ok: false, text: 'Every value must be a number, 0 or more.'});
    const {error} = await supabase
      .from('fee_settings')
      .update({...values, updated_at: new Date().toISOString()})
      .eq('id', 1);
    setMsg(error ? {ok: false, text: error.message} : {ok: true, text: 'Fees saved. New returns use these prices.'});
  };

  return (
    <Center role="main" axis="horizontal">
      <VStack hAlign="center" width="100%">
        <Section width="100%" maxWidth={800} padding={6} paddingBlock={8} variant="transparent">
          <VStack gap={5}>
            <VStack gap={1}>
              <Heading level={1}>Fees</Heading>
              <Text type="body" color="secondary">
                Update these when Protean revises TIN-FC charges. Returns already created keep their price.
              </Text>
            </VStack>
            {msg && <Banner status={msg.ok ? 'success' : 'error'} title={msg.text} />}
            <Grid columns={{minWidth: 260}} gap={4}>
              {FIELDS.map(f => (
                <TextInput
                  key={f.key}
                  label={f.label}
                  description={f.description}
                  value={form[f.key] ?? ''}
                  onChange={v => setForm(prev => ({...prev, [f.key]: v.replace(/[^0-9.]/g, '')}))}
                  inputMode="decimal"
                />
              ))}
            </Grid>
            {isValid && (
              <Card padding={5}>
                <VStack gap={1}>
                  <Text type="body" weight="bold">
                    Customer pays
                  </Text>
                  <Text type="body" color="secondary">
                    ≤100 records: {rupees(quoteFrom(values, 100).total_amount)} · 101–1,000:{' '}
                    {rupees(quoteFrom(values, 1000).total_amount)} · &gt;1,000:{' '}
                    {rupees(quoteFrom(values, 1001).total_amount)}
                  </Text>
                </VStack>
              </Card>
            )}
            <Button label="Save fees" variant="primary" size="lg" clickAction={save} />
          </VStack>
        </Section>
      </VStack>
    </Center>
  );
}
