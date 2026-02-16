
import React, { useState } from 'react';
import { extractCertificateInfo } from '../services/geminiService';
import { dbSaveFile } from '../services/databaseService';
import { getCurrentUser } from '../services/authService';
import { uploadImageToCloud } from '../services/cloudStorageService';
import { UploadIcon, FileTextIcon, DownloadIcon, ImageIcon } from './icons';

export const CertificateExtractor: React.FC = () => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [processingCount, setProcessingCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [columns, setColumns] = useState<string[]>(['Recipient Name', 'Course Title', 'Issuing Authority', 'Issue Date', 'Certificate ID']);
    const [newColumn, setNewColumn] = useState('');
    const [sessionResults, setSessionResults] = useState<any[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const addColumn = () => {
        if (newColumn.trim() && !columns.includes(newColumn)) {
            setColumns([...columns, newColumn.trim()]);
            setNewColumn('');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            setSelectedFiles(Array.from(files));
            setError(null);
        }
    };

    const handleExtract = async () => {
        if (selectedFiles.length === 0) return;
        setIsLoading(true);
        setProcessingCount(0);
        setError(null);
        
        const user = getCurrentUser();

        for (const file of selectedFiles) {
            try {
                setProcessingCount(prev => prev + 1);
                const data = await extractCertificateInfo(file, columns);
                
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
                const imageBase64 = await base64Promise;

                let cloudUrl = '';
                try {
                    cloudUrl = await uploadImageToCloud(imageBase64, `cert_${Date.now()}.png`);
                } catch (e) { console.warn("Cloud sync skipped", e); }

                const resultItem = { ...data, _image: imageBase64, _cloudUrl: cloudUrl, _fileName: file.name };
                setSessionResults(prev => [resultItem, ...prev]);
                
                if (user) {
                    const title = `Extracted: ${data.course_title || data['Course Title'] || file.name}`;
                    console.log('Saving file:', { userId: user.id, username: user.username, title });
                    await dbSaveFile({
                        userId: user.id, username: user.username, userRole: user.role,
                        userDesignation: user.designation,
                        title: title,
                        type: 'certificate',
                        content: JSON.stringify(resultItem, null, 2),
                        reportDate: data.issue_date || data['Issue Date'] || new Date().toISOString(),
                        category: 'Verification'
                    });
                    console.log('File saved successfully');
                } else {
                    console.error('No user logged in - cannot save file');
                }
            } catch (err: any) {
                console.error(`Extraction failed for ${file.name}:`, err);
                if (err.message === "MISSING_API_KEY") {
                  setError("Connection Error: Gemini API Key is missing. Please refresh the page.");
                  break;
                } else {
                  setError(err.message || `Failed to process ${file.name}.`);
                }
            }
        }

        setSelectedFiles([]);
        setIsLoading(false);

        // Notify other modules (e.g., ReportGenerator) to refresh after extraction
        try {
            window.dispatchEvent(new CustomEvent('extractionComplete'));
        } catch (e) {/* no-op */}
    };

    const toggleSelection = (idx: number) => {
        const next = new Set(selectedIndices);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setSelectedIndices(next);
    };

    const selectAll = () => {
        if (selectedIndices.size === sessionResults.length) setSelectedIndices(new Set());
        else setSelectedIndices(new Set(sessionResults.keys()));
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 max-w-[1600px] mx-auto animate-fade-in">
            <div className="xl:col-span-1 space-y-6">
                <div className="bg-white dark:bg-secondary p-8 rounded-[3rem] border dark:border-gray-700 shadow-2xl space-y-8 sticky top-24">
                    <h3 className="font-black text-[10px] text-primary tracking-[0.4em] uppercase mb-6">Extraction Schema</h3>
                    <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {columns.map(col => (
                            <div key={col} className="flex justify-between items-center bg-gray-50 dark:bg-black/20 p-3.5 rounded-2xl border-2 dark:border-gray-800">
                                <span className="text-[11px] font-black uppercase text-gray-500">{col}</span>
                                <button onClick={() => setColumns(columns.filter(c => c !== col))} className="text-red-400 font-bold px-2">×</button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input type="text" value={newColumn} onChange={e => setNewColumn(e.target.value)} placeholder="Add Field..." className="flex-1 p-4 text-xs bg-gray-50 dark:bg-black/40 border-2 dark:border-gray-800 rounded-2xl outline-none font-bold" />
                        <button onClick={addColumn} className="bg-primary text-white w-14 rounded-2xl font-black text-2xl shadow-lg active:scale-90 transition-transform">+</button>
                    </div>

                    <div className="border-t-2 dark:border-gray-800 pt-8">
                        <input type="file" id="cert-upload" className="hidden" onChange={handleFileChange} accept="image/*" multiple />
                        <label htmlFor="cert-upload" className="cursor-pointer block border-4 border-dashed border-gray-100 dark:border-gray-800 p-12 rounded-[2.5rem] hover:border-primary transition-all text-center group">
                            <UploadIcon className="mx-auto h-16 w-16 text-gray-300 group-hover:text-primary transition-colors" />
                            <p className="mt-4 text-[10px] font-black uppercase text-gray-400 group-hover:text-primary">Upload Multiple</p>
                        </label>
                        <button onClick={handleExtract} disabled={selectedFiles.length === 0 || isLoading} className="w-full mt-8 py-6 bg-primary text-white font-black rounded-[2rem] shadow-2xl flex items-center justify-center gap-3">
                            {isLoading ? `${processingCount}/${selectedFiles.length} Done` : <><FileTextIcon className="w-6 h-6"/> Bulk Extraction</>}
                        </button>
                    </div>
                </div>
                {error && <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-3xl font-black text-center text-xs uppercase tracking-widest border-2 border-red-100">{error}</div>}
            </div>

            <div className="xl:col-span-3 space-y-6">
                <div className="bg-white dark:bg-secondary rounded-[3.5rem] shadow-2xl border dark:border-gray-700 overflow-hidden min-h-[600px] flex flex-col">
                    <div className="p-10 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/30 dark:bg-black/10">
                        <h3 className="font-black text-3xl tracking-tighter">Extraction Results</h3>
                        {sessionResults.length > 0 && (
                            <button onClick={selectAll} className="px-8 py-3.5 bg-gray-100 dark:bg-gray-800 rounded-2xl text-[10px] font-black uppercase hover:bg-gray-200">
                                {selectedIndices.size === sessionResults.length ? 'Deselect All' : 'Select All'}
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto flex-grow custom-scrollbar">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-gray-50/50 dark:bg-black/20 font-black uppercase text-gray-400 text-[10px] border-b dark:border-gray-800">
                                <tr>
                                    <th className="px-10 py-8 w-10">Select</th>
                                    <th className="px-8 py-8">Certificate</th>
                                    {columns.map(c => <th key={c} className="px-8 py-8">{c}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-800">
                                {sessionResults.map((data, idx) => (
                                    <tr key={idx} className={`hover:bg-primary/5 transition-all ${selectedIndices.has(idx) ? 'bg-primary/5' : ''}`}>
                                        <td className="px-10 py-6 text-center">
                                            <input type="checkbox" checked={selectedIndices.has(idx)} onChange={() => toggleSelection(idx)} className="w-5 h-5 rounded-lg border-2 border-gray-300 text-primary cursor-pointer" />
                                        </td>
                                        <td className="px-8 py-6">
                                            <button onClick={() => setViewingImage(data._image)} className="w-16 h-16 rounded-[1.25rem] overflow-hidden border-2 dark:border-gray-700 shadow-lg">
                                                <img src={data._image} className="w-full h-full object-cover" alt="Cert"/>
                                            </button>
                                        </td>
                                        {columns.map(c => {
                                            const key = c.toLowerCase().replace(/\s+/g, '_');
                                            return <td key={c} className="px-8 py-6 font-bold text-gray-600 dark:text-gray-300">{data[key] || '—'}</td>;
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {viewingImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-12 bg-black/95 backdrop-blur-3xl animate-fade-in" onClick={() => setViewingImage(null)}>
                     <img src={viewingImage} className="max-w-full max-h-full rounded-[4rem] shadow-2xl border-8 border-white/5" alt="Preview"/>
                </div>
            )}
        </div>
    );
};
