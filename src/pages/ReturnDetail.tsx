import {useCallback, useEffect, useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Center} from '@astryxdesign/core/Center';
import {Section} from '@astryxdesign/core/Section';
import {Card} from '@astryxdesign/core/Card';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {Spinner} from '@astryxdesign/core/Spinner';
import {supabase, downloadFile, type TdsReturn} from '../lib/supabase';
import {useAuth} from '../lib/auth';
import {payForReturn} from '../lib/razorpay';
import {returnTitle, BUSINESS} from '../lib/format';
import {AmountBreakdown, FileButtons, ReturnFacts, StatusToken} from '../components/ReturnParts';

export default function ReturnDetailPage() {
  const {id} = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const {profile} = useAuth();
  const [r, setR] = useState<TdsReturn | null | undefined>(undefined);
  const [error, setError] = useState(params.get('error') ?? '');
  const [justPaid, setJustPaid] = useState(params.get('paid') === '1');

  const load = useCallback(async () => {
    const {data} = await supabase.from('tds_returns').select('*').eq('id', id).maybeSingle();
    setR((data as TdsReturn) ?? null);
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
        <Banner status="error" title="Return not found" endContent={<Button label="Back" href="/app" size="sm" />} />
      </Center>
    );
  }

  const pay = async () => {
    setError('');
    try {
      const result = await payForReturn(
        r.id,
        {name: profile?.full_name, email: profile?.email, contact: profile?.phone},
        returnTitle(r),
      );
      if (result === 'paid') setJustPaid(true);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async () => {
    const {error: e} = await supabase.rpc('delete_unpaid_return', {p_return_id: r.id});
    if (e) setError(e.message);
    else navigate('/app');
  };

  const filesReady = Boolean(r.fvu_path && r.form27a_path);

  return (
    <Center role="main" axis="horizontal">
      <VStack hAlign="center" width="100%">
        <Section width="100%" maxWidth={900} padding={6} paddingBlock={8} variant="transparent">
          <VStack gap={5}>
            <VStack gap={2}>
              <Button label="← My returns" variant="ghost" size="sm" href="/app" />
              <HStack gap={3} vAlign="center" wrap="wrap">
                <Heading level={1}>{returnTitle(r)}</Heading>
                <StatusToken status={r.status} />
              </HStack>
            </VStack>

            {error && <Banner status="error" title={error} />}
            {justPaid && r.status !== 'awaiting_payment' && (
              <Banner
                status="success"
                title="Payment received — thank you!"
                description="We will upload your statement and post the acknowledgement here. You will see the token number once it is done."
              />
            )}

            {r.status === 'uploaded' && (
              <Card padding={6} variant="green">
                <VStack gap={3}>
                  <Heading level={3}>Filed successfully</Heading>
                  <Text type="body">
                    Token / provisional receipt no.: <Text weight="bold">{r.token_number ?? '—'}</Text>
                  </Text>
                  {r.ack_path && (
                    <HStack>
                      <Button label="Download acknowledgement" variant="primary" clickAction={() => downloadFile(r.ack_path!)} />
                    </HStack>
                  )}
                  {r.admin_note && <Text type="supporting">{r.admin_note}</Text>}
                </VStack>
              </Card>
            )}

            {r.status === 'rejected' && (
              <Banner
                status="error"
                title="The TIN-FC could not accept this statement"
                description={r.admin_note || `Please call ${BUSINESS.phone} for details.`}
              />
            )}

            {r.status === 'awaiting_payment' && (
              <Card padding={6}>
                <VStack gap={4}>
                  <Heading level={3}>Payment pending</Heading>
                  {!filesReady && (
                    <Banner
                      status="warning"
                      title="Files are missing on this return"
                      description="Please delete it and upload again."
                    />
                  )}
                  <AmountBreakdown q={r} />
                  <HStack gap={2} wrap="wrap">
                    <Button
                      label={`Pay ₹${Number(r.total_amount)}`}
                      variant="primary"
                      size="lg"
                      clickAction={pay}
                      isDisabled={!filesReady}
                    />
                    <Button label="Delete this draft" variant="ghost" size="lg" clickAction={remove} />
                  </HStack>
                </VStack>
              </Card>
            )}

            <Card padding={6}>
              <VStack gap={4}>
                <Heading level={3}>Details</Heading>
                <ReturnFacts r={r} />
                {r.customer_note && (
                  <Text type="supporting" color="secondary">
                    Your note: {r.customer_note}
                  </Text>
                )}
                <FileButtons r={r} />
              </VStack>
            </Card>

            {r.status !== 'awaiting_payment' && (
              <Card padding={6}>
                <VStack gap={4}>
                  <Heading level={3}>Payment</Heading>
                  <AmountBreakdown q={r} />
                  <Text type="supporting" color="secondary">
                    Razorpay payment ID: {r.razorpay_payment_id ?? '—'}
                  </Text>
                </VStack>
              </Card>
            )}
          </VStack>
        </Section>
      </VStack>
    </Center>
  );
}
