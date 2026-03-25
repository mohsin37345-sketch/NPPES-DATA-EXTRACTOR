import ClientPage from '@/components/ClientPage';

export default function Home() {
  return (
    <main className="container mx-auto max-w-4xl py-12 px-4">
      <div className="text-center mb-10">
        <h2 className="text-lg font-bold text-slate-400 mb-2 tracking-widest uppercase">JHS Professionals</h2>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-3">
          NPPES Data Extractor
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Enter <strong className="text-slate-300">State</strong>, <strong className="text-slate-300">NPI Type</strong>, and <strong className="text-slate-300">Taxonomy Description</strong>. We'll query the NPPES registry and extract all matching provider details into a downloadable Excel sheet.
        </p>
      </div>

      <ClientPage />
    </main>
  );
}
