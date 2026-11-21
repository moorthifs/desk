import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {Button} from '@astryxdesign/core/Button';
import {Divider} from '@astryxdesign/core/Divider';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import type {Quote, TdsReturn, TdsStatus} from '../lib/supabase';
import {downloadFile} from '../lib/supabase';
import {STATUS, rupees, dateTime, FORM_TYPES, QUARTERS} from '../lib/format';

export function StatusToken({status}: {status: TdsStatus}) {
  const s = STATUS[status];
  return <Token label={s.label} color={s.color} size="sm" />;
}

export function ReturnFacts({r}: {r: TdsReturn}) {
  return (
    <MetadataList columns="multi">
      <MetadataListItem label="Deductor">{r.deductor_name}</MetadataListItem>
      <MetadataListItem label="TAN">{r.tan}</MetadataListItem>
      <MetadataListItem label="Form">
        {FORM_TYPES.find(f => f.value === r.form_type)?.label ?? r.form_type}
      </MetadataListItem>
      <MetadataListItem label="Period">
        {QUARTERS.find(q => q.value === r.quarter)?.label} · FY {r.financial_year}
      </MetadataListItem>
      <MetadataListItem label="Statement">
        {r.statement_type === 'regular' ? 'Regular' : 'Correction'}
      </MetadataListItem>
      <MetadataListItem label="Deductee records">{r.record_count}</MetadataListItem>
      <MetadataListItem label="Submitted">{dateTime(r.created_at)}</MetadataListItem>
      <MetadataListItem label="Paid">{dateTime(r.paid_at)}</MetadataListItem>
    </MetadataList>
  );
}

function Line({label, value, isBold}: {label: string; value: number; isBold?: boolean}) {
  return (
    <HStack hAlign="between" gap={4}>
      <Text type="body" weight={isBold ? 'bold' : undefined} color={isBold ? 'primary' : 'secondary'}>
        {label}
      </Text>
      <Text type="body" weight={isBold ? 'bold' : undefined}>
        {rupees(value)}
      </Text>
    </HStack>
  );
}

export function AmountBreakdown({q}: {q: Quote}) {
  return (
    <VStack gap={2}>
      <Line label="TIN-FC upload fee (at cost)" value={q.tin_fee} />
      <Line label="GST on TIN fee" value={q.tin_gst} />
      <Line label="Service charge" value={q.service_fee} />
      {Number(q.service_gst) > 0 && <Line label="GST on service charge" value={q.service_gst} />}
      <Divider />
      <Line label="Total (rounded)" value={q.total_amount} isBold />
    </VStack>
  );
}

export function FileButtons({r}: {r: TdsReturn}) {
  const files = [
    {label: 'FVU file', path: r.fvu_path},
    {label: 'Form 27A', path: r.form27a_path},
    {label: 'Other document', path: r.extra_path},
  ].filter(f => f.path);
  if (files.length === 0) {
    return (
      <Text type="supporting" color="secondary">
        No files uploaded yet.
      </Text>
    );
  }
  return (
    <HStack gap={2} wrap="wrap">
      {files.map(f => (
        <Button key={f.label} label={`Download ${f.label}`} size="sm" clickAction={() => downloadFile(f.path!)} />
      ))}
    </HStack>
  );
}
