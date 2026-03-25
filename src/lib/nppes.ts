import axios from 'axios';

// The NPPES API base URL
const NPPES_URL = 'https://npiregistry.cms.hhs.gov/api/';

export interface NPPESMatchResult {
  npi_number: string;
  organization_name: string;
  auth_first_name: string;
  auth_last_name: string;
  auth_title: string;
  auth_phone: string;
  matched_state: string;
  matched_npi_type: string;
  matched_taxonomy: string;
  match_status: 'Exact' | 'Best Effort' | 'No Match';
  error_message?: string;
}

export async function queryNPPES(params: {
  state?: string;
  npiType?: string;
  taxonomyDescription?: string;
}): Promise<NPPESMatchResult> {
  const defaultResult: NPPESMatchResult = {
    npi_number: '',
    organization_name: '',
    auth_first_name: '',
    auth_last_name: '',
    auth_title: '',
    auth_phone: '',
    matched_state: '',
    matched_npi_type: '',
    matched_taxonomy: '',
    match_status: 'No Match',
  };

  try {
    // 1. Normalize NPI Type to what the API expects (NPI-1 or NPI-2)
    let enumType = '';
    const rawType = (params.npiType || '').trim().toLowerCase();
    if (rawType.includes('2') || rawType === 'organization') {
      enumType = 'NPI-2';
    } else if (rawType.includes('1') || rawType === 'individual') {
      enumType = 'NPI-1';
    }

    // 2. Prepare API Query Parameters
    const queryParams: Record<string, string> = {
      version: '2.1',
      limit: '50', // Fetch max 50 to find best matching taxonomy
    };
    
    if (params.state) {
      queryParams.state = params.state.trim().toUpperCase();
    }
    
    if (enumType) {
      queryParams.enumeration_type = enumType;
    }
    
    // Taxonomy desc is our primary search filter
    if (params.taxonomyDescription) {
      queryParams.taxonomy_description = params.taxonomyDescription.trim();
    }

    // 3. Make API Call
    // Add a tiny artificial delay to help with rate limits
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const response = await axios.get(NPPES_URL, { params: queryParams });
    const data = response.data;

    // Check errors from API
    if (data.Errors && data.Errors.length > 0) {
      return {
        ...defaultResult,
        error_message: data.Errors.map((e: any) => e.description).join('; ')
      };
    }

    if (!data.results || data.results.length === 0) {
      return {
        ...defaultResult,
        match_status: 'No Match',
        error_message: 'No results found for given filters.'
      };
    }

    // 4. Score and Find Best Match
    // We try to find the result whose Primary Taxonomy description most closely matches the input.
    // If not searching by taxonomy, just grab the top result.
    let bestMatch = data.results[0];
    let isExact = false;
    let fallbackStatus: 'Exact' | 'Best Effort' = 'Best Effort';

    if (params.taxonomyDescription) {
       const searchTax = params.taxonomyDescription.toLowerCase();
       
       for (const result of data.results) {
         // Find primary taxonomy
         const primaryTax = result.taxonomies.find((t: any) => t.primary === true) || result.taxonomies[0];
         if (!primaryTax) continue;
         
         const resTax = (primaryTax.desc || '').toLowerCase();
         if (resTax === searchTax) {
             bestMatch = result;
             isExact = true;
             fallbackStatus = 'Exact';
             break; // Perfect match found
         }
         
         if (resTax.includes(searchTax) || searchTax.includes(resTax)) {
             bestMatch = result; // Better partial match, keep checking
         }
       }
    } else {
       fallbackStatus = 'Best Effort'; // If they didn't provide taxonomy to match against
    }

    // Extract desired fields from the best matched result
    const basic = bestMatch.basic || {};
    const primaryTaxonomy = bestMatch.taxonomies?.find((t: any) => t.primary === true) || bestMatch.taxonomies?.[0];
    const locationAddress = bestMatch.addresses?.find((a: any) => a.address_purpose === 'LOCATION') || bestMatch.addresses?.[0];

    return {
      npi_number: bestMatch.number || '',
      organization_name: basic.organization_name || '',
      auth_first_name: basic.authorized_official_first_name || '',
      auth_last_name: basic.authorized_official_last_name || '',
      auth_title: basic.authorized_official_title_or_position || '',
      auth_phone: basic.authorized_official_telephone_number || '',
      matched_state: locationAddress?.state || '',
      matched_npi_type: bestMatch.enumeration_type || '',
      matched_taxonomy: primaryTaxonomy?.desc || '',
      match_status: fallbackStatus,
    };
  } catch (error: any) {
    return {
      ...defaultResult,
      match_status: 'No Match',
      error_message: error.response?.data?.Errors?.[0]?.description || error.message || 'API Request Failed'
    };
  }
}

export async function searchNPPESList(params: {
  state?: string;
  npiType?: string;
  taxonomyDescription?: string;
  limit?: number;
}): Promise<any[]> {
  let enumType = '';
  const rawType = (params.npiType || '').trim().toLowerCase();
  if (rawType.includes('2') || rawType === 'organization') {
    enumType = 'NPI-2';
  } else if (rawType.includes('1') || rawType === 'individual') {
    enumType = 'NPI-1';
  }

  const baseQueryParams: Record<string, string> = {
    version: '2.1',
    limit: '200',
  };
  
  if (params.state) baseQueryParams.state = params.state.trim().toUpperCase();
  if (enumType) baseQueryParams.enumeration_type = enumType;
  if (params.taxonomyDescription) baseQueryParams.taxonomy_description = params.taxonomyDescription.trim();

  let allResults: any[] = [];
  let skip = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      const queryParams = { ...baseQueryParams, skip: skip.toString() };
      
      if (skip > 0) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const response = await axios.get(NPPES_URL, { params: queryParams });
      const data = response.data;

      if (data.Errors && data.Errors.length > 0) {
        if (allResults.length > 0) {
            break;
        }
        throw new Error(data.Errors.map((e: any) => e.description).join('; '));
      }

      if (!data.results || data.results.length === 0) {
        hasMore = false;
        break;
      }

      for (const bestMatch of data.results) {
        const basic = bestMatch.basic || {};
        const primaryTaxonomy = bestMatch.taxonomies?.find((t: any) => t.primary === true) || bestMatch.taxonomies?.[0];
        const locationAddress = bestMatch.addresses?.find((a: any) => a.address_purpose === 'LOCATION') || bestMatch.addresses?.[0];

        allResults.push({
          'NPI Number': bestMatch.number || '',
          'Organization Name': basic.organization_name || '',
          'First Name': basic.authorized_official_first_name || basic.first_name || '',
          'Last Name': basic.authorized_official_last_name || basic.last_name || '',
          'Title/Position': basic.authorized_official_title_or_position || '',
          'Phone Number': basic.authorized_official_telephone_number || locationAddress?.telephone_number || '',
          'State': locationAddress?.state || '',
          'NPI Type': bestMatch.enumeration_type || '',
          'Taxonomy': primaryTaxonomy?.desc || '',
        });
      }

      if (data.results.length < 200) {
        hasMore = false;
      } else {
        skip += 200;
      }
    }

    return allResults;
  } catch (error: any) {
    if (allResults.length > 0) return allResults;
    throw new Error(error.response?.data?.Errors?.[0]?.description || error.message || 'API Request Failed');
  }
}

