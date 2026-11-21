import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Center} from '@astryxdesign/core/Center';
import {Section} from '@astryxdesign/core/Section';
import {Grid} from '@astryxdesign/core/Grid';
import {Card} from '@astryxdesign/core/Card';
import {Button} from '@astryxdesign/core/Button';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Table} from '@astryxdesign/core/Table';
import {Divider} from '@astryxdesign/core/Divider';
import {Link} from '@astryxdesign/core/Link';
import {
  ArrowUpTrayIcon,
  CreditCardIcon,
  CloudArrowUpIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';
import {useAuth} from '../lib/auth';
import {useFees} from '../lib/useFees';
import {quoteFrom} from '../lib/supabase';
import {rupees, BUSINESS} from '../lib/format';

const STEPS = [
  {
    icon: ArrowUpTrayIcon,
    title: '1. Upload',
    description: 'Upload the validated .fvu file and signed Form 27A for each statement.',
  },
  {
    icon: CreditCardIcon,
    title: '2. Pay online',
    description: 'Pay the TIN-FC fee at cost plus our service charge by UPI, card or netbanking.',
  },
  {
    icon: CloudArrowUpIcon,
    title: '3. We file it',
    description: 'Our TIN Facilitation Centre uploads your statement to Protean, usually the same working day.',
  },
  {
    icon: DocumentCheckIcon,
    title: '4. Get the receipt',
    description: 'The provisional receipt and token number appear in your account to download.',
  },
];

export default function HomePage() {
  const {session} = useAuth();
  const fees = useFees();

  const slabs = [
    {id: 's1', records: 'Up to 100 deductee records', q: quoteFrom(fees, 100)},
    {id: 's2', records: '101 to 1,000 records', q: quoteFrom(fees, 1000)},
    {id: 's3', records: 'More than 1,000 records', q: quoteFrom(fees, 1001)},
  ];

  return (
    <Center role="main" axis="horizontal">
      <VStack hAlign="center" width="100%">
        <Section width="100%" maxWidth={960} padding={6} paddingBlock={10} variant="transparent">
          <VStack gap={8}>
            {/* Hero */}
            <VStack gap={3} hAlign="center">
              <Text as="h1" type="display-1" weight="bold" justify="center">
                File your TDS / TCS returns online
              </Text>
              <Text type="large" color="secondary" justify="center">
                Upload your FVU file from anywhere. We file it through our authorised TIN
                Facilitation Centre and send the acknowledgement straight to your account.
              </Text>
              <HStack gap={2} hAlign="center" wrap="wrap">
                <Button
                  label={session ? 'Upload a return' : 'Create a free account'}
                  variant="primary"
                  size="lg"
                  href={session ? '/app/new' : '/signup'}
                />
                <Button label="WhatsApp us" size="lg" href={BUSINESS.whatsapp} target="_blank" />
              </HStack>
              <Text type="supporting" color="secondary" justify="center">
                For auditors, tax practitioners and companies · 24Q, 26Q, 27Q, 27EQ · Regular and
                correction statements
              </Text>
            </VStack>

            {/* How it works */}
            <Grid columns={{minWidth: 200}} gap={4}>
              {STEPS.map(step => (
                <Card key={step.title}>
                  <VStack gap={3}>
                    <Icon icon={step.icon} size="lg" color="accent" />
                    <VStack gap={1}>
                      <Text type="body" weight="bold">
                        {step.title}
                      </Text>
                      <Text type="supporting" color="secondary">
                        {step.description}
                      </Text>
                    </VStack>
                  </VStack>
                </Card>
              ))}
            </Grid>

            {/* Pricing */}
            <Card padding={6}>
              <VStack gap={4}>
                <VStack gap={1}>
                  <Heading level={2}>Simple pricing per return</Heading>
                  <Text type="body" color="secondary">
                    Protean TIN-FC upload fee at cost, plus {rupees(fees.service_charge)} service
                    charge. No hidden fees.
                  </Text>
                </VStack>
                <Table
                  data={slabs}
                  idKey="id"
                  columns={[
                    {
                      key: 'records',
                      header: 'Statement size',
                      renderCell: s => (
                        <VStack gap={0.5}>
                          <Text type="body">{s.records}</Text>
                          <Text type="supporting" color="secondary">
                            TIN fee {rupees(s.q.tin_fee + s.q.tin_gst)} (incl. GST) + service{' '}
                            {rupees(s.q.service_fee + s.q.service_gst)}
                          </Text>
                        </VStack>
                      ),
                    },
                    {
                      key: 'total',
                      header: 'You pay',
                      align: 'end',
                      renderCell: s => (
                        <Text type="large" weight="bold">
                          ₹{s.q.total_amount}
                        </Text>
                      ),
                    },
                  ]}
                />
                <Text type="supporting" color="secondary">
                  The fee is charged again for every correction statement, as per Protean rules.
                </Text>
              </VStack>
            </Card>

            <Divider />

            {/* Contact */}
            <VStack gap={1} hAlign="center">
              <Text type="body" weight="bold">
                {BUSINESS.name}
              </Text>
              <Text type="supporting" color="secondary" justify="center">
                TIN Facilitation Centre · Gingee &amp; Thiruvannamalai · Call{' '}
                <Link href={`tel:+91${BUSINESS.phone.replace(/\s/g, '')}`} type="supporting">
                  {BUSINESS.phone}
                </Link>
              </Text>
            </VStack>
          </VStack>
        </Section>
      </VStack>
    </Center>
  );
}
