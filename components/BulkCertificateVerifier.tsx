
import React, { useState, useCallback } from 'react';
import { extractCertificateInfo } from '../services/geminiService';
import { uploadImageToCloud } from '../services/cloudStorageService';
import { VerificationResult } from '../types';
import { UploadIcon, DownloadIcon, FileTextIcon } from './icons';
import { getCurrentUser } from '../services/authService';

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const BulkCertificateVerifier: React.FC = () => {
    const [files, setFiles] = useState<FileList | null>(null);
    const [results, setResults] = useState<VerificationResult[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [selectedCertificate, setSelectedCertificate] = useState<VerificationResult | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFiles(e.target.files);
        setResults([]);
        setError(null);
    };

    const handleVerify = useCallback(async () => {
        if (!files || files.length === 0) {
            setError('Please select one or more files.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResults([]);
        
        // Explicitly typing fileArray as File[] to prevent 'unknown' inference during iteration
        const fileArray: File[] = Array.from(files);
        for (const file of fileArray) {
            try {
                // Fix: Pass required extraction fields to extractCertificateInfo and map snake_case response to camelCase CertificateData
                const fields = ['Recipient Name', 'Certificate ID', 'Course Title', 'Issuing Authority', 'Issue Date'];
                const rawData = await extractCertificateInfo(file, fields);
                
                const data = {
                    recipientName: rawData.recipient_name,
                    certificateId: rawData.certificate_id,
                    courseTitle: rawData.course_title,
                    issuingAuthority: rawData.issuing_authority,
                    issueDate: rawData.issue_date
                };

                const dataUrl = await fileToDataUrl(file);
                setResults(prev => [...prev, { 
                    fileName: file.name, 
                    data, 
                    status: 'Verified', 
                    imageBase64: dataUrl,
                    mimeType: file.type 
                }]);
            } catch (err: any) {
                const errorMsg = err.message || "";
                // Fix: Handle specific API key error by resetting the key selection state and prompting the user to select a paid project key.
                if (errorMsg.includes("Requested entity was not found.")) {
                    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
                        window.aistudio.openSelectKey();
                    }
                }
                setResults(prev => [...prev, { 
                    fileName: file.name, 
                    data: null, 
                    status: 'Failed', 
                    error: errorMsg || 'Processing failed' 
                }]);
            }
        }
        setIsLoading(false);
    }, [files]);
    
    const exportToExcel = async () => {
        if (results.length === 0) return;
        
        setIsExporting(true);
        setExportProgress(0);
        const user = getCurrentUser();

        // 1. Sync all successful verifications to cloud
        const finalResults = [...results];
        for (let i = 0; i < finalResults.length; i++) {
            const res = finalResults[i];
            // Only upload if verified and has image data
            if (res.status === 'Verified' && res.imageBase64 && !res.cloudUrl) {
                try {
                    const url = await uploadImageToCloud(res.imageBase64, `verify_${i}_${Date.now()}.png`);
                    res.cloudUrl = url;
                } catch (e) { console.error(e); }
            }
            setExportProgress(Math.round(((i + 1) / finalResults.length) * 100));
        }
        setResults(finalResults);

        const headers = ['File Name', 'Status', 'Recipient Name', 'Certificate ID', 'Course Title', 'Issuing Authority', 'Issue Date', 'View Link'];
        
        let tableHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset='utf-8'>
                <style>
                    table { border-collapse: collapse; font-family: sans-serif; }
                    th { background-color: #0d9488; color: white; padding: 12px; border: 1px solid #0f766e; }
                    td { padding: 10px; border: 1px solid #cbd5e1; }
                    .btn-view {
                        display: inline-block;
                        padding: 6px 12px;
                        background-color: #0d9488;
                        color: white !important;
                        text-decoration: none;
                        border-radius: 4px;
                        font-weight: bold;
                    }
                    .status-failed { color: #dc2626; font-weight: bold; }
                    .status-verified { color: #16a34a; font-weight: bold; }
                </style>
            </head>
            <body>
                <h2>RepoCerti Bulk Verification Report</h2>
                <p>Generated by: ${user?.username || 'Staff'} | ${new Date().toLocaleString()}</p>
                <table>
                    <thead>
                        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
        `;

        finalResults.forEach(res => {
            const viewLink = res.cloudUrl 
                ? `<a href="${res.cloudUrl}" class="btn-view">View Image</a>` 
                : (res.status === 'Verified' ? 'Sync Failed' : 'N/A');
            
            tableHtml += `
                <tr>
                    <td>${res.fileName}</td>
                    <td class="${res.status === 'Verified' ? 'status-verified' : 'status-failed'}">${res.status}</td>
                    <td>${res.data?.recipientName || ''}</td>
                    <td>${res.data?.certificateId || ''}</td>
                    <td>${res.data?.courseTitle || ''}</td>
                    <td>${res.data?.issuingAuthority || ''}</td>
                    <td>${res.data?.issueDate || ''}</td>
                    <td style="text-align: center;">${viewLink}</td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table></body></html>`;

        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Verification_Results_${Date.now()}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setIsExporting(false);
    };

    return (
        <div className="relative">
            {isExporting && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in">
                    <div className="bg-white dark:bg-secondary p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-4">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <h3 className="text-lg font-bold">Generating Cloud Links...</h3>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${exportProgress}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-500">{exportProgress}% Complete</p>
                    </div>
                </div>
            )}

            <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center bg-white dark:bg-secondary mb-6">
                <input type="file" id="bulk-file-upload" className="hidden" onChange={handleFileChange} accept="image/*" multiple />
                <label htmlFor="bulk-file-upload" className="cursor-pointer">
                    <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {files && files.length > 0 ? `${files.length} file(s) selected` : 'Click to upload multiple images'}
                    </p>
                </label>
            </div>
            
            <button
                onClick={handleVerify}
                disabled={!files || files.length === 0 || isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg shadow-md transition-all duration-300 active:scale-[0.98] disabled:bg-gray-400"
            >
                <FileTextIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? `Verifying (${results.length}/${files?.length || 0})...` : 'Verify All with AI'}
            </button>
            
            <div className="mt-8 animate-slide-up">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Results ({results.length})</h2>
                    <button
                        onClick={exportToExcel}
                        disabled={results.length === 0 || isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg shadow-md transition-all"
                    >
                        <DownloadIcon className="w-5 h-5"/>
                        Export to Excel
                    </button>
                </div>
                <div className="overflow-x-auto bg-white dark:bg-secondary rounded-lg shadow-md border dark:border-gray-700">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 dark:bg-secondary-light text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3">File Name</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Recipient</th>
                                <th className="px-6 py-3">Course</th>
                                <th className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((res, idx) => (
                                <tr key={idx} className="border-b dark:border-gray-700">
                                    <td className="px-6 py-4 truncate max-w-[150px]">{res.fileName}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${res.status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {res.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{res.data?.recipientName || 'N/A'}</td>
                                    <td className="px-6 py-4">{res.data?.courseTitle || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => setSelectedCertificate(res)} className="text-primary font-bold hover:underline">View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedCertificate && (
                <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedCertificate(null)}>
                    <div className="bg-white dark:bg-secondary rounded-xl shadow-2xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4">{selectedCertificate.fileName}</h3>
                        {selectedCertificate.imageBase64 && (
                            <img src={selectedCertificate.imageBase64} alt="Cert" className="w-full rounded-lg mb-4 max-h-[50vh] object-contain bg-gray-100 dark:bg-gray-800" />
                        ) || (
                            <div className="p-12 text-center text-gray-500 italic">No image available for failed processing.</div>
                        )}
                        <button onClick={() => setSelectedCertificate(null)} className="w-full py-2 bg-gray-200 dark:bg-gray-700 rounded-lg font-bold">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};
