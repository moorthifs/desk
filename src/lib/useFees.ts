import {useEffect, useState} from 'react';
import {supabase, isConfigured, type FeeSettings} from './supabase';

export const DEFAULT_FEES: FeeSettings = {
  slab1_fee: 42.37,
  slab2_fee: 178,
  slab3_fee: 578.5,
  tin_gst_rate: 18,
  service_charge: 199,
  service_gst_rate: 0,
};

export function useFees() {
  const [fees, setFees] = useState<FeeSettings>(DEFAULT_FEES);
  useEffect(() => {
    if (!isConfigured) return;
    supabase
      .from('fee_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({data}) => data && setFees(data as FeeSettings));
  }, []);
  return fees;
}
