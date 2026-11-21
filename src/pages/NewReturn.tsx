import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {VStack} from '@astryxdesign/core/Layout';
import {Center} from '@astryxdesign/core/Center';
import {Section} from '@astryxdesign/core/Section';
import {Grid} from '@astryxdesign/core/Grid';
import {Card} from '@astryxdesign/core/Card';
import {Text, Heading} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Selector} from '@astryxdesign/core/Selector';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {Divider} from '@astryxdesign/core/Divider';
import {supabase, quoteFrom, BUCKET, type TdsReturn} from '../lib/supabase';
import {useAuth} from '../lib/auth';
import {useFees} from '../lib/useFees';
import {payForReturn} from '../lib/razorpay';
import {FORM_TYPES, QUARTERS, financialYears, TAN_RE, returnTitle} from '../lib/format';
import {AmountBreakdown} from '../components/ReturnParts';

const MAX_SIZE = 25 * 1024 * 1024;
type Err = {type: 'error'; message: string} | undefined;
const err = (msg?: string): Err => (msg ? {type: 'error', message: msg} : undefined);
const one = (f: File | File[] | null) => (Array.isArray(f) ? (f[0] ?? null) : f);
const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80);

export default function NewReturnPage() {
  const {session, profile} = useAuth();
  const navigate = useNavigate();
  const fees = useFees();
  const years = useMemo(financialYears, []);

  const [tan, setTan] = useState('');
  const [deductor, setDeductor] = useState('');
  const [formType, setFormType] = useState<string>('26Q');
  const [fy, setFy] = useState<string>(years[0]);
  const [quarter, setQuarter] = useState<string | undefined>(undefined);
  const [stmt, setStmt] = useState('regular');
  const [records, setRecords] = useState('');
  const [note, setNote] = useState('');
  const [fvu, setFvu] = useState<File | null>(null);
  const [form27a, setForm27a] = useState<File | null>(null);
  const [extra, setExtra] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const tanUp = tan.trim().toUpperCase();
  const recordCount = parseInt(records, 10);
  const quote = quoteFrom(fees, recordCount > 0 ? recordCount : 1);

  const errors = submitted
    ? {
        tan: !TAN_RE.test(tanUp) ? 'Enter a valid 10-character TAN (e.g. CHEA12345B)' : undefined,
        deductor: !deductor.trim() ? 'Required' : undefined,
        quarter: !quarter ? 'Required' : undefined,
        records: !(recordCount > 0) ? 'Enter the number of deductee records' : undefined,
        fvu: !fvu ? 'Upload the .fvu file' : !fvu.name.toLowerCase().endsWith('.fvu') ? 'This must be a .fvu file' : undefined,
        form27a: !form27a ? 'Upload the signed Form 27A' : undefined,
      }
    : {};
  const hasErrors = Object.values(errors).some(Boolean);

  const submit = async () => {
    setSubmitted(true);
    setError('');
    const invalid =
      !TAN_RE.test(tanUp) || !deductor.trim() || !quarter || !(recordCount > 0) || !fvu ||
      !fvu.name.toLowerCase().endsWith('.fvu') || !form27a;
    if (invalid || !session) return;

    let created: TdsReturn | null = null;
    try {
      setBusy('Saving details…');
      const {data, error: e1} = await supabase.rpc('create_tds_return', {
        p_tan: tanUp,
        p_deductor_name: deductor.trim(),
        p_form_type: formType,
        p_financial_year: fy,
        p_quarter: quarter,
        p_statement_type: stmt,
        p_record_count: recordCount,
        p_customer_note: note.trim(),
      });
      if (e1) throw e1;
      created = data as TdsReturn;

      setBusy('Uploading files…');
      const base = `${session.user.id}/${created.id}`;
      const put = async (prefix: string, f: File) => {
        const path = `${base}/${prefix}-${safeName(f.name)}`;
        const {error: e} = await supabase.storage.from(BUCKET).upload(path, f, {upsert: false});
        if (e) throw e;
        return path;
      };
      const fvuPath = await put('fvu', fvu);
      const f27Path = await put('form27a', form27a);
      const extraPath = extra ? await put('extra', extra) : null;
      const {error: e2} = await supabase.rpc('attach_tds_files', {
        p_return_id: created.id,
        p_fvu_path: fvuPath,
        p_form27a_path: f27Path,
        p_extra_path: extraPath,
      });
      if (e2) throw e2;

      setBusy('Opening payment…');
      const result = await payForReturn(
        created.id,
        {name: profile?.full_name, email: profile?.email, contact: profile?.phone},
        returnTitle(created),
      );
      navigate(`/app/returns/${created.id}${result === 'paid' ? '?paid=1' : ''}`);
    } catch (e) {
      setBusy('');
      const msg = (e as Error).message || 'Something went wrong';
      if (created) {
        // Details are saved; the customer can finish from the return page.
        navigate(`/app/returns/${created.id}?error=${encodeURIComponent(msg)}`);
      } else {
        setError(msg);
      }
    }
  };

  return (
    <Center role="main" axis="horizontal">
      <VStack hAlign="center" width="100%">
        <Section width="100%" maxWidth={800} padding={6} paddingBlock={8} variant="transparent">
          <VStack gap={6}>
            <VStack gap={1}>
              <Heading level={1}>Upload a TDS / TCS return</Heading>
              <Text type="body" color="secondary">
                One statement per submission. Validate it with the latest FVU before uploading.
              </Text>
            </VStack>

            {error && <Banner status="error" title={error} />}
            {submitted && hasErrors && <Banner status="error" title="Please fix the highlighted fields." />}

            {/* Deductor */}
            <VStack gap={4}>
              <Heading level={3}>Deductor</Heading>
              <Grid columns={{minWidth: 260}} gap={4}>
                <TextInput
                  label="TAN"
                  value={tan}
                  onChange={v => setTan(v.toUpperCase())}
                  placeholder="CHEA12345B"
                  status={err(errors.tan)}
                />
                <TextInput
                  label="Deductor name"
                  value={deductor}
                  onChange={setDeductor}
                  placeholder="As per TAN"
                  status={err(errors.deductor)}
                />
              </Grid>
            </VStack>

            <Divider />

            {/* Statement */}
            <VStack gap={4}>
              <Heading level={3}>Statement</Heading>
              <Grid columns={{minWidth: 220}} gap={4}>
                <Selector label="Form" options={FORM_TYPES} value={formType} onChange={setFormType} />
                <Selector label="Financial year" options={years} value={fy} onChange={setFy} />
                <Selector
                  label="Quarter"
                  options={QUARTERS}
                  value={quarter}
                  onChange={setQuarter}
                  placeholder="Select quarter"
                  status={err(errors.quarter)}
                />
              </Grid>
              <RadioList label="Statement type" value={stmt} onChange={setStmt}>
                <RadioListItem label="Regular (original)" value="regular" />
                <RadioListItem label="Correction" value="correction" />
              </RadioList>
              <TextInput
                label="Number of deductee records"
                value={records}
                onChange={v => setRecords(v.replace(/\D/g, ''))}
                inputMode="numeric"
                description="Shown in the FVU statistics report. Decides the TIN-FC fee slab."
                status={err(errors.records)}
              />
            </VStack>

            <Divider />

            {/* Files */}
            <VStack gap={4}>
              <Heading level={3}>Files</Heading>
              <FileInput
                label="FVU file (.fvu)"
                mode="dropzone"
                accept=".fvu"
                maxSize={MAX_SIZE}
                value={fvu}
                onChange={f => setFvu(one(f))}
                isRequired
                status={err(errors.fvu)}
              />
              <FileInput
                label="Form 27A (signed, PDF or image)"
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={MAX_SIZE}
                value={form27a}
                onChange={f => setForm27a(one(f))}
                isRequired
                status={err(errors.form27a)}
              />
              <FileInput
                label="Other document"
                description="e.g. statistics report or authorisation letter"
                maxSize={MAX_SIZE}
                value={extra}
                onChange={f => setExtra(one(f))}
                isOptional
              />
              <TextArea label="Note for us" value={note} onChange={setNote} isOptional placeholder="Anything we should know" />
            </VStack>

            {/* Amount + pay */}
            <Card padding={6}>
              <VStack gap={4}>
                <Heading level={3}>Amount to pay</Heading>
                <AmountBreakdown q={quote} />
                <Text type="supporting" color="secondary">
                  You will pay securely through Razorpay (UPI, card, netbanking). We start the upload as
                  soon as payment is received.
                </Text>
                <Button
                  label={busy || `Pay ₹${quote.total_amount} and submit`}
                  variant="primary"
                  size="lg"
                  isLoading={Boolean(busy)}
                  onClick={submit}
                />
              </VStack>
            </Card>
          </VStack>
        </Section>
      </VStack>
    </Center>
  );
}
