import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://eeszlgndckfyhreoynuo.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlc3psZ25kY2tmeWhyZW95bnVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3Njk3MzIsImV4cCI6MjEwNDM0NTczMn0.73uIZTHvfDzxy8yBhXh6OaVdHzmT4fMNO9QZaruII6U';

// Get Supabase credentials from Vite environment (.env) or fallback
export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('clm_supabase_url') : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('clm_supabase_key') : null;

  return {
    url: (envUrl || storedUrl || DEFAULT_SUPABASE_URL).trim(),
    key: (envKey || storedKey || DEFAULT_SUPABASE_ANON_KEY).trim(),
  };
};

let supabaseInstance = null;

export const getSupabaseClient = () => {
  const { url, key } = getSupabaseConfig();
  if (url && key) {
    if (!supabaseInstance || supabaseInstance.supabaseUrl !== url) {
      supabaseInstance = createClient(url, key);
    }
    return supabaseInstance;
  }
  return null;
};

export const saveSupabaseCredentials = (url, key) => {
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem('clm_supabase_url', url.trim());
    if (key) localStorage.setItem('clm_supabase_key', key.trim());
    supabaseInstance = null;
  }
};

export const isSupabaseConfigured = () => {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key);
};

// Fetch live contracts directly from Supabase 'contracts' table
export async function fetchContracts() {
  const client = getSupabaseClient();
  if (!client) {
    return { 
      data: [], 
      error: new Error('Supabase is not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env or via the Connection Settings.'),
      isConfigured: false 
    };
  }

  try {
    const { data, error } = await client
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error on contracts table:', error);
      return { data: [], error, isConfigured: true };
    }
    return { data: data || [], error: null, isConfigured: true };
  } catch (err) {
    console.error('Error querying Supabase contracts:', err);
    return { data: [], error: err, isConfigured: true };
  }
}

// Fetch live status history directly from Supabase 'contract_status_history' table
export async function fetchStatusHistory() {
  const client = getSupabaseClient();
  if (!client) {
    return { 
      data: [], 
      error: new Error('Supabase is not configured.'), 
      isConfigured: false 
    };
  }

  try {
    const { data, error } = await client
      .from('contract_status_history')
      .select('*')
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Supabase query error on contract_status_history table:', error);
      return { data: [], error, isConfigured: true };
    }
    return { data: data || [], error: null, isConfigured: true };
  } catch (err) {
    console.error('Error querying Supabase contract_status_history:', err);
    return { data: [], error: err, isConfigured: true };
  }
}

// Create new contract record(s) with status 'in_review' in Supabase
export async function createContractRecords(contractsList) {
  const client = getSupabaseClient();
  if (!client) {
    return { 
      data: contractsList, 
      error: new Error('Supabase is not configured. Please set your Supabase URL and Anon Key in Connection Settings or .env.'), 
      isConfigured: false 
    };
  }

  try {
    const { data, error } = await client
      .from('contracts')
      .insert(contractsList)
      .select();

    if (error) {
      console.error('Supabase insert error on contracts table:', error);
      return { data: [], error, isConfigured: true };
    }

    // Insert corresponding initial status history event for each contract
    if (data && data.length > 0) {
      const historyRows = data.map(c => ({
        contract_id: c.id,
        company_name: c.company_name || c.client_name || c.client_company_name,
        doc_type: c.doc_type,
        from_status: 'draft',
        to_status: 'in_review',
        changed_by: c.client_email || 'system',
        changed_at: new Date().toISOString(),
        notes: 'Document generated and moved to review'
      }));

      try {
        await client.from('contract_status_history').insert(historyRows);
      } catch (histErr) {
        console.warn('Could not record contract_status_history entry:', histErr);
      }
    }

    return { data: data || [], error: null, isConfigured: true };
  } catch (err) {
    console.error('Error creating contract records in Supabase:', err);
    return { data: [], error: err, isConfigured: true };
  }
}

// Clean up specific contract records and their history
export async function deleteContractRecords(contractIds) {
  const client = getSupabaseClient();
  if (!client || !contractIds || contractIds.length === 0) {
    return { data: null, error: null, isConfigured: Boolean(client) };
  }

  try {
    const validIds = contractIds.filter(Boolean);
    if (validIds.length === 0) return { data: null, error: null, isConfigured: true };

    await client.from('contract_status_history').delete().in('contract_id', validIds);
    const { data, error } = await client.from('contracts').delete().in('id', validIds);

    return { data, error, isConfigured: true };
  } catch (err) {
    console.error('Error deleting contract records:', err);
    return { data: null, error: err, isConfigured: true };
  }
}

// Clean up premature contract records created during document generation
export async function cleanupPrematureContracts(sinceIsoTimestamp, clientEmail, companyName) {
  const client = getSupabaseClient();
  if (!client || !sinceIsoTimestamp) {
    return { isConfigured: Boolean(client) };
  }

  try {
    const { data: rows, error } = await client
      .from('contracts')
      .select('id, company_name, client_email, created_at')
      .gte('created_at', sinceIsoTimestamp);

    if (error) {
      console.warn('Error querying premature contracts:', error);
      return { isConfigured: true };
    }

    if (rows && rows.length > 0) {
      const emailLower = (clientEmail || '').toLowerCase().trim();
      const compLower = (companyName || '').toLowerCase().trim();

      const targetRows = rows.filter(r => {
        const rEmail = (r.client_email || '').toLowerCase().trim();
        const rComp = (r.company_name || '').toLowerCase().trim();
        if (emailLower && rEmail && rEmail === emailLower) return true;
        if (compLower && rComp && rComp === compLower) return true;
        return true;
      });

      const idsToDelete = targetRows.map(r => r.id).filter(Boolean);
      if (idsToDelete.length > 0) {
        await client.from('contract_status_history').delete().in('contract_id', idsToDelete);
        await client.from('contracts').delete().in('id', idsToDelete);
      }
    }
    return { isConfigured: true };
  } catch (err) {
    console.warn('Error cleaning up premature contracts:', err);
    return { isConfigured: true };
  }
}
