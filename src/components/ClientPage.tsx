'use client';

import { useState } from 'react';
import { Download, AlertCircle, Search, Table as TableIcon } from 'lucide-react';

export default function ClientPage() {
  const [state, setState] = useState('');
  const [npiType, setNpiType] = useState('');
  const [taxonomy, setTaxonomy] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxonomy && !npiType && !state) {
      setErrorMsg('Please enter at least one field to search.');
      setStatus('error');
      return;
    }

    setStatus('processing');
    setErrorMsg('');
    setResults([]);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, npiType, taxonomy, limit: 200 }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to search NPPES');
      }

      const data = await response.json();
      setResults(data.results || []);
      setStatus('done');
      
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'An unexpected error occurred');
    }
  };

  const handleDownload = async () => {
    if (results.length === 0) return;
    setIsDownloading(true);
    try {
       const response = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results }),
       });

       if (!response.ok) throw new Error('Download failed');

       const blob = await response.blob();
       const url = window.URL.createObjectURL(blob);
       
       const a = document.createElement('a');
       a.href = url;
       a.download = 'NPPES_Search_Results.xlsx';
       document.body.appendChild(a);
       a.click();
       a.remove();
       window.URL.revokeObjectURL(url);
    } catch (err) {
       console.error('Failed to download excel:', err);
       alert('Failed to generate Excel file.');
    } finally {
       setIsDownloading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-slate-200 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Registry
          </h2>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Taxonomy / Specialty</label>
              <input
                type="text"
                value={taxonomy}
                onChange={e => setTaxonomy(e.target.value)}
                placeholder="e.g. Audiologist, Clinic"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">NPI Type</label>
                <select
                  value={npiType}
                  onChange={e => setNpiType(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Any</option>
                  <option value="1">Type 1 (Individual)</option>
                  <option value="2">Type 2 (Organization)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={e => setState(e.target.value)}
                  placeholder="e.g. MD, NY"
                  maxLength={2}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-4">
              <button
                type="submit"
                disabled={status === 'processing'}
                className="flex-1 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-indigo-300 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
              >
                {status === 'processing' ? 'Searching...' : 'Search Registry'}
              </button>

              {status === 'done' && results.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex-1 px-8 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white rounded-lg font-medium transition-colors shadow-lg shadow-green-500/20"
                >
                  {isDownloading ? 'Generating...' : 'Download Excel'}
                </button>
              )}
            </div>
          </form>
        </div>

        {status === 'error' && (
          <div className="pt-4 border-t border-slate-800">
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-400 font-medium">Search Failed</h3>
                <p className="text-red-300/80 text-sm mt-1">{errorMsg}</p>
              </div>
            </div>
          </div>
        )}

        {status === 'done' && results.length > 0 && (
          <div className="pt-8 border-t border-slate-800">
             <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                 <TableIcon className="w-5 h-5" />
                 Search Results ({results.length})
               </h2>
             </div>
             
             <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
               <table className="w-full text-left text-sm text-slate-300">
                 <thead className="bg-slate-800/50 border-b border-slate-700 uppercase font-medium text-slate-400">
                   <tr>
                     <th className="px-4 py-3">NPI Number</th>
                     <th className="px-4 py-3">Name</th>
                     <th className="px-4 py-3">State</th>
                     <th className="px-4 py-3">Taxonomy</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-700">
                   {results.slice(0, 100).map((r, i) => (
                     <tr key={i} className="hover:bg-slate-700/50 transition-colors">
                       <td className="px-4 py-3 font-mono text-xs">{r['NPI Number']}</td>
                       <td className="px-4 py-3">
                         {r['Organization Name'] || `${r['First Name']} ${r['Last Name']}`}
                       </td>
                       <td className="px-4 py-3">{r['State']}</td>
                       <td className="px-4 py-3 truncate max-w-xs" title={r['Taxonomy']}>{r['Taxonomy']}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               {results.length > 100 && (
                 <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-700">
                   Showing first 100 results. Download Excel to see all {results.length}.
                 </div>
               )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
