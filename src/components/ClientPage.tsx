'use client';

import { useState, useEffect } from 'react';
import { Download, AlertCircle, Search, Table as TableIcon, FileUp, Zap, Clock, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import FileUpload from '@/components/FileUpload';
import ProgressDisplay from '@/components/ProgressDisplay';

export default function ClientPage() {
  const [activeTab, setActiveTab] = useState<'search' | 'batch'>('search');
  const [state, setState] = useState('');
  const [npiType, setNpiType] = useState('');
  const [taxonomy, setTaxonomy] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);

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
    setElapsedTime(0);

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, npiType, taxonomy, limit: 200 }),
      });

      // Safely parse — server may return plain text on timeout/crash
      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server error: ${response.status} ${response.statusText}. The request may have timed out.`);
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to search NPPES');
      }

      setResults(data.results || []);
      setStatus('done');
      
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'An unexpected error occurred');
    } finally {
      clearInterval(interval);
    }
  };


  const handleBatchProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchFile) return;

    setStatus('processing');
    setErrorMsg('');
    setElapsedTime(0);

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const formData = new FormData();
      formData.append('file', batchFile);

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = 'Batch processing failed';
        try { errMsg = JSON.parse(errText)?.error || errMsg; } catch { /* plain text */ }
        throw new Error(errMsg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Extracted_${batchFile.name}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus('done');
      setBatchFile(null);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Processing failed');
    } finally {
      clearInterval(interval);
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
      {/* Tab Header */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => { setActiveTab('search'); setStatus('idle'); setErrorMsg(''); setResults([]); }}
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'search' 
              ? 'bg-slate-800/50 text-indigo-400 border-b-2 border-indigo-500' 
              : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          Registry Search
        </button>
        <button
          onClick={() => { setActiveTab('batch'); setStatus('idle'); setErrorMsg(''); setResults([]); }}
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'batch' 
              ? 'bg-slate-800/50 text-indigo-400 border-b-2 border-indigo-500' 
              : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          Batch Extraction
        </button>
      </div>

      <div className="p-6">
        <div className="space-y-8">
          {activeTab === 'search' ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                  <Search className="w-5 h-5 text-indigo-400" />
                  Search & Filter
                </h2>
                {status === 'processing' && (
                  <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-mono text-indigo-400 animate-pulse flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {elapsedTime}s elapsed (Est: ~15s)
                  </div>
                )}
              </div>
              
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Taxonomy / Specialty</label>
                  <input
                    type="text"
                    value={taxonomy}
                    onChange={e => setTaxonomy(e.target.value)}
                    placeholder="e.g. Audiologist, Clinic"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">NPI Type</label>
                    <select
                      value={npiType}
                      onChange={e => setNpiType(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option value="">Any Type</option>
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
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-6">
                  <button
                    type="submit"
                    disabled={status === 'processing'}
                    className="flex-1 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {status === 'processing' ? (
                      <>
                        <Clock className="w-5 h-5 animate-spin-slow" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Search Registry
                      </>
                    )}
                  </button>

                  {status === 'done' && results.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="flex-1 px-8 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white rounded-lg font-bold transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                      {isDownloading ? (
                        <>
                          <Clock className="w-5 h-5 animate-spin-slow" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          Download Results
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Batch Extraction
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Upload an Excel/CSV with columns for <span className="text-slate-300 font-medium">State, NPI Type</span>, and <span className="text-slate-300 font-medium">Taxonomy Description</span>.
                  </p>
                </div>
                {status === 'processing' && (
                  <div className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-xs font-mono text-yellow-500 animate-pulse flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {elapsedTime}s elapsed {rowCount ? `(Est: ~${Math.round(rowCount * 1.5)}s)` : '(Est: ~1.5s / row)'}
                  </div>
                )}
              </div>

              {!batchFile && (
                <FileUpload 
                  onFileSelect={async (file) => {
                    setBatchFile(file);
                    // Estimate row count
                    try {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const data = e.target?.result;
                        const workbook = XLSX.read(data, { type: 'binary' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        const json = XLSX.utils.sheet_to_json(worksheet);
                        setRowCount(json.length);
                      };
                      reader.readAsBinaryString(file);
                    } catch (err) {
                      console.error('Failed to parse row count', err);
                    }
                  }} 
                  disabled={status === 'processing'} 
                />
              )}

              {batchFile && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-700 rounded-lg">
                          <FileSpreadsheet className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-slate-200 font-semibold">{batchFile.name}</p>
                          <p className="text-xs text-slate-500">
                            {(batchFile.size / 1024).toFixed(1)} KB • {rowCount !== null ? `${rowCount} rows found` : 'Analyzing...'}
                          </p>
                        </div>
                      </div>
                      <button 
                         onClick={() => { setBatchFile(null); setRowCount(null); }}
                         disabled={status === 'processing'}
                         className="text-xs text-slate-500 hover:text-red-400 underline underline-offset-4"
                      >
                         Change File
                      </button>
                   </div>

                   {status === 'processing' ? (
                     <div className="space-y-4">
                        <div className="flex items-center gap-3 text-indigo-400 animate-pulse mb-2">
                           <Clock className="w-5 h-5 animate-spin-slow" />
                           <span className="font-semibold">Processing {rowCount} Rows...</span>
                        </div>
                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 animate-loading-bar" />
                        </div>
                        <p className="text-xs text-slate-400 text-center italic">
                          Estimated completion in ~{rowCount ? Math.round(rowCount * 1.5) : '...'} seconds. 
                        </p>
                     </div>
                   ) : (
                     <button
                        onClick={handleBatchProcess}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-3"
                     >
                        <Zap className="w-5 h-5" />
                        Start Batch Extraction
                     </button>
                   )}
                </div>
              )}
              
              {status === 'done' && !batchFile && (
                <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 flex items-center gap-3">
                  <Download className="w-5 h-5 text-green-400" />
                  <p className="text-green-400 text-sm font-medium">Batch processing complete! Your file has been downloaded.</p>
                </div>
              )}
            </div>
          )}
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
