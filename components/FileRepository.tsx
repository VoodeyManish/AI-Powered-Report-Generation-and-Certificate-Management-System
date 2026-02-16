
import React, { useEffect, useState } from 'react';
import { dbGetFilesForUser } from '../services/databaseService';
import { getCurrentUser } from '../services/authService';
import { StoredFile } from '../types';
import { DownloadIcon } from './icons';
import { jsPDF } from "jspdf";

export const FileRepository: React.FC = () => {
    const [files, setFiles] = useState<StoredFile[]>([]);
    const [currentUser, setCurrentUser] = useState(getCurrentUser());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadFiles = async () => {
            try {
                const user = getCurrentUser();
                console.log('FileRepository: Current user:', user);
                setCurrentUser(user);
                if (user) {
                    const userFiles = await dbGetFilesForUser(user.id);
                    console.log('FileRepository: Loaded files:', userFiles);
                    setFiles(userFiles);
                } else {
                    console.log('FileRepository: No user logged in');
                }
            } catch (err: any) {
                console.error('FileRepository: Error loading files:', err);
            }
        };
        loadFiles();

        // Refresh files when extraction or report generation completes
        const handleRefresh = () => {
            console.log('FileRepository: Refreshing files after event');
            loadFiles();
        };
        window.addEventListener('extractionComplete', handleRefresh);
        window.addEventListener('reportGenerated', handleRefresh);

        return () => {
            window.removeEventListener('extractionComplete', handleRefresh);
            window.removeEventListener('reportGenerated', handleRefresh);
        };
    }, []);

    const downloadPDF = (file: StoredFile) => {
        try {
            const doc = new jsPDF();
            const margin = 20;
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            const maxWidth = pageWidth - 2 * margin;
            
            // Title
            doc.setFontSize(20);
            doc.setTextColor(13, 148, 136); // teal color
            doc.text(file.title, margin, 20);
            
            // Metadata
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Created by: ${file.username} (${file.userDesignation || file.userRole})`, margin, 28);
            doc.text(`Type: ${file.type}`, margin, 33);
            doc.text(`Date: ${new Date(file.createdAt).toLocaleDateString()}`, margin, 38);
            
            doc.setTextColor(0, 0, 0);
            let cursorY = 48;
            
            // Handle certificates with images
            if (file.type === 'certificate') {
                try {
                    const jsonContent = JSON.parse(file.content);
                    
                    // Add certificate image if available
                    if (jsonContent._image) {
                        try {
                            doc.addImage(jsonContent._image, 'PNG', margin, cursorY, 170, 120);
                            cursorY += 130;
                            if (cursorY > pageHeight - 40) {
                                doc.addPage();
                                cursorY = margin;
                            }
                        } catch (e) {
                            console.warn('Could not add certificate image:', e);
                        }
                    }
                    
                    // Add extracted data as formatted text
                    doc.setFontSize(12);
                    Object.entries(jsonContent)
                        .filter(([key]) => !key.startsWith('_'))
                        .forEach(([key, value]) => {
                            if (cursorY > pageHeight - margin - 10) {
                                doc.addPage();
                                cursorY = margin;
                            }
                            doc.setFontSize(11);
                            doc.setTextColor(13, 148, 136);
                            doc.text(`${key}:`, margin, cursorY);
                            
                            doc.setFontSize(10);
                            doc.setTextColor(0, 0, 0);
                            const valueText = doc.splitTextToSize(String(value || ''), maxWidth - 20);
                            cursorY += 6;
                            valueText.forEach((line: string) => {
                                if (cursorY > pageHeight - margin) {
                                    doc.addPage();
                                    cursorY = margin;
                                }
                                doc.text(line, margin + 10, cursorY);
                                cursorY += 6;
                            });
                            cursorY += 3;
                        });
                } catch (e) {
                    console.error('Error parsing certificate:', e);
                }
            } else if (file.type === 'report') {
                // For reports, use html2canvas to capture the formatted content
                doc.setFontSize(12);
                
                // Remove HTML tags but preserve line breaks
                let reportText = file.content
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<p[^>]*>/gi, '')
                    .replace(/<\/p>/gi, '\n')
                    .replace(/<[^>]*>/g, '')
                    .trim();
                
                const splitText = doc.splitTextToSize(reportText, maxWidth);
                splitText.forEach((line: string) => {
                    if (cursorY > pageHeight - margin) {
                        doc.addPage();
                        cursorY = margin;
                    }
                    doc.text(line, margin, cursorY);
                    cursorY += 7;
                });
            }
            
            doc.save(`${file.title.replace(/\s+/g, '_')}.pdf`);
            console.log('PDF downloaded successfully');
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Error downloading PDF. Check console for details.');
        }
    };

    const downloadDoc = (file: StoredFile) => {
        try {
            let displayContent = '';
            let imageContent = '';
            
            // Parse content based on type
            if (file.type === 'certificate') {
                try {
                    const jsonContent = JSON.parse(file.content);
                    
                    // Add certificate image if available
                    if (jsonContent._image) {
                        imageContent = `<div style="text-align: center; margin-bottom: 20pt;">
                            <img src="${jsonContent._image}" style="max-width: 100%; max-height: 400px; border: 1px solid #ccc;" />
                        </div>`;
                    }
                    
                    // Format extracted data
                    displayContent = Object.entries(jsonContent)
                        .filter(([key]) => !key.startsWith('_'))
                        .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
                        .join('');
                } catch (e) {
                    displayContent = `<p>${file.content}</p>`;
                }
            } else {
                // For reports, preserve HTML formatting
                displayContent = file.content;
            }

            const htmlContent = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                    <meta charset='utf-8'>
                    <title>${file.title}</title>
                    <style>
                        body { font-family: 'Calibri', sans-serif; font-size: 11pt; margin: 1in; }
                        h1 { color: #0d9488; font-size: 24pt; margin-bottom: 12pt; border-bottom: 2pt solid #0d9488; padding-bottom: 6pt; }
                        .metadata { color: #666; font-size: 10pt; margin-bottom: 24pt; border-bottom: 1pt solid #ddd; padding-bottom: 12pt; }
                        p { margin-bottom: 12pt; line-height: 1.5; }
                        strong { font-weight: bold; color: #0d9488; }
                        img { max-width: 100%; height: auto; }
                        .image-section { text-align: center; margin: 24pt 0; }
                    </style>
                </head>
                <body>
                    <h1>${file.title}</h1>
                    <div class="metadata">
                        <p><strong>Created by:</strong> ${file.username} (${file.userDesignation || file.userRole})</p>
                        <p><strong>Type:</strong> ${file.type}</p>
                        <p><strong>Date:</strong> ${new Date(file.createdAt).toLocaleDateString()}</p>
                    </div>
                    ${imageContent}
                    <div>${displayContent}</div>
                </body>
                </html>
            `;

            const blob = new Blob([htmlContent], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${file.title.replace(/\s+/g, '_')}.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log('DOC downloaded successfully');
        } catch (err) {
            console.error('Error generating DOC:', err);
            alert('Error downloading document. Check console for details.');
        }
    };

    const filteredFiles = files.filter(f => 
        f.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        f.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white dark:bg-secondary rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 animate-fade-in">
            <div style={{backgroundColor: '#fff', padding: '10px', marginBottom: '10px', border: '1px solid #ccc'}}>
                <p style={{color: '#000', margin: '0', fontSize: '14px'}}>DEBUG: Files loaded: {files.length}, Current user: {currentUser?.username || 'None'}</p>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 animate-slide-down">
                <div>
                    <h2 className="text-2xl font-bold" style={{color: '#1f2937'}}>File Repository</h2>
                    <p className="text-sm" style={{color: '#666'}}>
                        Viewing as: <span className="font-bold uppercase text-primary">{currentUser?.designation || currentUser?.role}</span>
                    </p>
                </div>
                <input 
                    type="text" 
                    placeholder="Search by title or student..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="p-2 border rounded-lg bg-gray-50 dark:bg-secondary-light dark:border-gray-600 focus:ring-2 focus:ring-primary focus:outline-none w-full md:w-64 transition-all focus:shadow-lg"
                />
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 dark:bg-secondary-light text-xs uppercase text-gray-700 dark:text-gray-300 font-semibold" style={{color: '#444'}}>
                        <tr>
                            <th className="px-6 py-3">Title</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Created By</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFiles.length > 0 ? filteredFiles.map((file, index) => (
                            <tr 
                                key={file.id} 
                                className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-secondary-light transition-colors animate-fade-in"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <td className="px-6 py-4 font-medium" style={{color: '#000'}}>{file.title || 'Untitled'}</td>
                                <td className="px-6 py-4 capitalize" style={{color: '#333'}}>
                                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded" style={{color: '#333'}}>{file.type || 'unknown'}</span>
                                </td>
                                <td className="px-6 py-4" style={{color: '#111'}}>{file.username || 'Unknown User'}</td>
                                <td className="px-6 py-4 capitalize">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        file.userRole === 'student' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                    }`}>
                                        {file.userDesignation || file.userRole || 'N/A'}
                                    </span>
                                </td>
                                <td className="px-6 py-4" style={{color: '#666'}}>{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <button 
                                            onClick={() => { console.log('File data:', file); downloadPDF(file); }}
                                            className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-1 transition-colors transform hover:scale-105"
                                        >
                                            <DownloadIcon className="w-3 h-3" /> PDF
                                        </button>
                                        <button 
                                            onClick={() => downloadDoc(file)}
                                            className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center gap-1 transition-colors transform hover:scale-105"
                                        >
                                            <DownloadIcon className="w-3 h-3" /> DOC
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr className="animate-fade-in">
                                <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    No files found. 
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};