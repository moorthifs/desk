import {useCallback, useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Center} from '@astryxdesign/core/Center';
import {Section} from '@astryxdesign/core/Section';
import {Card} from '@astryxdesign/core/Card';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Banner} from '@astryxdesign/core/Banner';
import {Spinner} from '@astryxdesign/core/Spinner';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {supabase, downloadFile, BUCKET, type Profile, type TdsReturn} from '../../lib/supabase';
import {returnTitle, BUSINESS} from '../../lib/format';
import {AmountBreakdown, FileButtons, ReturnFacts, StatusToken} from '../../components/ReturnParts';

type Row = TdsReturn & {profiles: Profile | null};
const one = (f: File | File[] | null) => (Array.isArray(f) ? (f[0] ?? null) : f);

function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, '').slice(-10);
  return `https://wa.me/91${digits}?text=${encodeURIComponent(text)}`;
}

export default function AdminReturnPage() {
  const {id} = useParams();
  const [r, setR] = useState<Row | null | undefined>(undefined);
  const [token, setToken] = useState('');
  const [ack, setAck] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const load = useCallback(async () => {
    const {data} = await supabase.from('tds_returns').select('*, profiles(*)').eq('id', id).maybeSingle();
    const row = (data as Row) ?? null;
    setR(row);
    if (row) {
      setToken(row.token_number ?? '');
      setNote(row.admin_note ?? '');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (r === undefined) {
    return (
      <Center padding={10}>
        <Spinner size="lg" />
      </Center>
    );
  }
  if (r === null) {
    return (
      <Center padding={10}>
        <Banner status="error" title="Return not found" />
      </Center>
    );
  }

  const update = async (patch: Partial<TdsReturn>, message: string) => {
    setError('');
    setSaved('');
    const {error: e} = await supabase.from('tds_returns').update(patch).eq('id', r.id);
    if (e) return setError(e.message);
    setSaved(message);
    await load();
  };

  const markUploaded = async () => {
    setError('');
    if (!/^[0-9]{15}$/.test(token.trim())) {
      return setError('Enter the 15-digit token number from the provisional receipt.');
    }
    if (!ack && !r.ack_path) return setError('Attach the acknowledgement / provisional receipt.');
    let ackPath = r.ack_path;
    if (ack) {
      ackPath = `${r.user_id}/${r.id}/ack/${ack.name.replace(/[^A-Za-z0-9._-]+/g, '_')}`;
      const {error: e} = await supabase.storage.from(BUCKET).upload(ackPath, ack, {upsert: true});
      if (e) return setError(e.message);
    }
    await update(
      {
        status: 'uploaded',
        token_number: token.trim(),
        ack_path: ackPath,
        admin_note: note.trim(),
        completed_at: new Date().toISOString(),
      },
      'Marked as uploaded. The customer can now download the acknowledgement.',
    );
  };

  const reject = async () => {
    if (!note.trim()) return setError('Write the reason in the note so the customer knows what to fix.');
    await update({status: 'rejected', admin_note: note.trim()}, 'Marked as rejected.');
  };

  const c = r.profiles;
  const doneMsg = `Dear ${c?.full_name || 'Sir/Madam'}, your ${returnTitle(r)} TDS statement for TAN ${r.tan} has been uploaded. Token no. ${r.token_number ?? token}. Download the acknowledgement from your account on ${BUSINESS.site}. — ${BUSINESS.name}`;

  return (
    <Center role="main" axis="horizontal">
      <VStack hAlign="center" width="100%">
        <Section width="100%" maxWidth={1000} padding={6} paddingBlock={8} variant="transparent">
          <VStack gap={5}>
            <VStack gap={2}>
              <Button label="← Admin queue" variant="ghost" size="sm" href="/admin" />
              <HStack gap={3} vAlign="center" wrap="wrap">
                <Heading level={1}>{returnTitle(r)}</Heading>
                <StatusToken status={r.status} />
              </HStack>
            </VStack>

            {error && <Banner status="error" title={error} />}
            {saved && <Banner status="success" title={saved} />}

            <Card padding={6}>
              <VStack gap={4}>
                <Heading level={3}>Customer</Heading>
                <MetadataList columns="multi">
                  <MetadataListItem label="Name">{c?.full_name || '—'}</MetadataListItem>
                  <MetadataListItem label="Firm">{c?.firm_name || '—'}</MetadataListItem>
                  <MetadataListItem label="Mobile">{c?.phone || '—'}</MetadataListItem>
                  <MetadataListItem label="Email">{c?.email || '—'}</MetadataListItem>
                </MetadataList>
                {c?.phone && (
                  <HStack gap={2} wrap="wrap">
                    <Button label="Call" size="sm" href={`tel:+91${c.phone.replace(/\D/g, '').slice(-10)}`} />
                    <Button
                      label="WhatsApp"
                      size="sm"
                      href={whatsappLink(c.phone, r.status === 'uploaded' ? doneMsg : `Regarding your ${returnTitle(r)} TDS return (TAN ${r.tan}): `)}
                      target="_blank"
                    />
                  </HStack>
                )}
              </VStack>
            </Card>

            <Card padding={6}>
              <VStack gap={4}>
                <Heading level={3}>Return &amp; files</Heading>
                <ReturnFacts r={r} />
                {r.customer_note && <Banner status="info" title="Customer note" description={r.customer_note} />}
                <FileButtons r={r} />
              </VStack>
            </Card>

            {r.status === 'awaiting_payment' ? (
              <Banner status="warning" title="Not paid yet" description="Wait for payment before uploading." />
            ) : (
              <Card padding={6}>
                <VStack gap={4}>
                  <Heading level={3}>Process</Heading>
                  {r.status === 'paid' && (
                    <HStack>
                      <Button
                        label="Start — mark as uploading"
                        clickAction={() => update({status: 'in_progress'}, 'Marked as uploading.')}
                      />
                    </HStack>
                  )}
                  <TextInput
                    label="Token number (15 digits)"
                    value={token}
                    onChange={v => setToken(v.replace(/\D/g, '').slice(0, 15))}
                    inputMode="numeric"
                  />
                  <FileInput
                    label="Acknowledgement / provisional receipt"
                    description={r.ack_path ? 'Already attached — choose a file only to replace it.' : undefined}
                    accept=".pdf,.jpg,.jpeg,.png,.txt,.html"
                    value={ack}
                    onChange={f => setAck(one(f))}
                  />
                  {r.ack_path && (
                    <HStack>
                      <Button label="View current acknowledgement" size="sm" clickAction={() => downloadFile(r.ack_path!)} />
                    </HStack>
                  )}
                  <TextArea
                    label="Note to customer"
                    value={note}
                    onChange={setNote}
                    isOptional
                    description="Shown on the customer's return page. Required when rejecting."
                  />
                  <HStack gap={2} wrap="wrap">
                    <Button label="Mark as uploaded" variant="primary" clickAction={markUploaded} />
                    <Button label="Reject" variant="destructive" clickAction={reject} />
                  </HStack>
                </VStack>
              </Card>
            )}

            <Card padding={6}>
              <VStack gap={3}>
                <Heading level={3}>Payment</Heading>
                <AmountBreakdown q={r} />
                <Text type="supporting" color="secondary">
                  Razorpay order {r.razorpay_order_id ?? '—'} · payment {r.razorpay_payment_id ?? '—'}
                </Text>
              </VStack>
            </Card>
          </VStack>
        </Section>
      </VStack>
    </Center>
  );
}
