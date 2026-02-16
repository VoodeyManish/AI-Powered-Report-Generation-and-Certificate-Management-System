
import React, { useEffect, useState, useMemo, memo } from 'react';
import { dbGetFilesForUser, dbDeleteAllUserFiles, dbDeleteFile } from '../services/databaseService';
import { getCurrentUser, logoutUser } from '../services/authService';
import { StoredFile } from '../types';
import { FileTextIcon, SaveIcon, DownloadIcon } from './icons';

const Dashboard: React.FC = () => {
    const [allFiles, setAllFiles] = useState<StoredFile[]>([]);
    const [filterType, setFilterType] = useState<'all' | 'report' | 'certificate'>('all');
    const [filterCategory, setFilterCategory] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [viewingFile, setViewingFile] = useState<StoredFile | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    
    const user = getCurrentUser();

    // Debounce search term to avoid excessive filtering
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (currentUser) {
            dbGetFilesForUser(currentUser.id).then(files => {
                setAllFiles(files.reverse());
            }).catch(err => {
                console.error('Failed to fetch files:', err);
                setAllFiles([]);
            });
        }
    }, []);

    const clearAllData = async () => {
        const currentUser = getCurrentUser();
        const myFilesCount = allFiles.filter(f => f.userId === currentUser?.id).length;
        
        if (myFilesCount === 0) {
            alert('You have no files to delete.');
            return;
        }
        
        if (window.confirm(`ARE YOU SURE? This will permanently delete all ${myFilesCount} of YOUR files (drafts, reports, and certificates). Files from other users will not be affected.`)) {
            try {
                if (currentUser) {
                    await dbDeleteAllUserFiles(currentUser.id);
                    // Update UI by removing only current user's files
                    setAllFiles(prevFiles => prevFiles.filter(f => f.userId !== currentUser.id));
                    setSelectedFiles(new Set());
                    alert('Your files have been deleted successfully!');
                }
            } catch (error) {
                console.error('Failed to clear data:', error);
                alert('Failed to delete data. Please try again.');
            }
        }
    };

    const deleteSelectedFiles = async () => {
        if (selectedFiles.size === 0) {
            alert('Please select at least one file to delete.');
            return;
        }
        
        if (window.confirm(`Are you sure you want to delete ${selectedFiles.size} selected file(s)? This action cannot be undone.`)) {
            try {
                // Delete each selected file
                const deletePromises = Array.from(selectedFiles).map(fileId => dbDeleteFile(fileId));
                await Promise.all(deletePromises);
                
                // Update the UI by removing deleted files
                setAllFiles(prevFiles => prevFiles.filter(f => !selectedFiles.has(f.id)));
                setSelectedFiles(new Set());
                
                alert('Selected files deleted successfully!');
            } catch (error) {
                console.error('Failed to delete files:', error);
                alert('Failed to delete some files. Please try again.');
            }
        }
    };

    const toggleSelectFile = (fileId: string) => {
        setSelectedFiles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fileId)) {
                newSet.delete(fileId);
            } else {
                newSet.add(fileId);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedFiles.size === filteredFiles.length && filteredFiles.length > 0) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
        }
    };

    // Clear selection when filter changes
    useEffect(() => {
        setSelectedFiles(new Set());
    }, [filterType, filterCategory, debouncedSearchTerm]);

    const categories = useMemo(() => {
        const cats = new Set<string>(['All']);
        allFiles.forEach(f => { 
            if(f.category) cats.add(f.category); 
        });
        return Array.from(cats);
    }, [allFiles]);

    const filteredFiles = useMemo(() => {
        return allFiles.filter(f => {
            const matchesSearch = f.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
                                f.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
            const matchesType = filterType === 'all' || f.type === filterType;
            const matchesCategory = filterCategory === 'All' || f.category === filterCategory;
            return matchesSearch && matchesType && matchesCategory;
        });
    }, [allFiles, debouncedSearchTerm, filterType, filterCategory]);

    const certificateHeaders = useMemo(() => {
        if (filterType !== 'certificate') return [];
        const keys = new Set<string>();
        filteredFiles.forEach(f => {
            if (f.type === 'certificate') {
                try {
                    const parsed = JSON.parse(f.content);
                    Object.keys(parsed).forEach(k => {
                        if (!k.startsWith('_')) keys.add(k);
                    });
                } catch (e) {}
            }
        });
        return Array.from(keys);
    }, [filteredFiles, filterType]);

    const exportToExcel = () => {
        const filesToExport = selectedFiles.size > 0 
            ? filteredFiles.filter(f => selectedFiles.has(f.id))
            : filteredFiles;
        
        if (filesToExport.length === 0) {
            alert('No files to export. Please select at least one document.');
            return;
        }
        
        let content = '';
        if (filterType === 'certificate') {
            const headers = ['File Title', 'Category', 'Generated By', 'Date', ...certificateHeaders];
            content = headers.join('\t') + '\n';
            
            filesToExport.forEach(f => {
                const row = [f.title, f.category || 'N/A', f.username, new Date(f.createdAt).toLocaleDateString()];
                try {
                    const data = JSON.parse(f.content);
                    certificateHeaders.forEach(h => row.push(String(data[h] || 'N/A').replace(/\t/g, ' ')));
                } catch(e) { certificateHeaders.forEach(() => row.push('ERR')); }
                content += row.join('\t') + '\n';
            });
        } else {
            const headers = ['Title', 'Type', 'Category', 'Author', 'Created Date'];
            content = headers.join('\t') + '\n';
            filesToExport.forEach(f => {
                const row = [f.title, f.type, f.category || 'N/A', f.username, new Date(f.createdAt).toLocaleDateString()];
                content += row.join('\t') + '\n';
            });
        }

        const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RepoCerti_${selectedFiles.size > 0 ? 'Selected' : 'Filtered'}_${filterType}_${Date.now()}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (!user) return null;

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">Library Hub</h1>
                    <p className="text-gray-500 font-medium mt-2">Manage your repository and automated document archives.</p>
                </div>
                
                <div className="flex flex-wrap gap-4">
                    {selectedFiles.size > 0 && (
                        <button onClick={deleteSelectedFiles} className="px-6 py-3 bg-orange-50 text-orange-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all border-2 border-orange-100">
                            Delete Selected ({selectedFiles.size})
                        </button>
                    )}
                    <button onClick={clearAllData} className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border-2 border-red-100">
                        Delete All My Files
                    </button>
                    <div className="flex bg-white dark:bg-secondary p-1.5 rounded-[1.5rem] shadow-xl border dark:border-gray-700">
                        {(['all', 'report', 'certificate'] as const).map((type) => (
                            <button key={type} onClick={() => {setFilterType(type); setFilterCategory('All');}} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}>
                                {type}s
                            </button>
                        ))}
                    </div>
                    
                    <button 
                        onClick={exportToExcel}
                        className="flex items-center gap-3 px-8 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-primary transition-all shadow-xl disabled:opacity-30"
                    >
                        <DownloadIcon className="w-5 h-5" /> 
                        {selectedFiles.size > 0 ? `Export Selected (${selectedFiles.size})` : 'Export All Results'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <div className="relative group">
                    <input 
                        type="text" 
                        placeholder="Search document archives..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full p-8 bg-white dark:bg-secondary rounded-[3rem] border-2 dark:border-gray-700 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 shadow-2xl transition-all text-xl font-medium pl-20"
                    />
                    <svg className="w-8 h-8 absolute left-8 top-8 text-gray-300 group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide no-scrollbar items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2 whitespace-nowrap">Filter by Category:</span>
                    {categories.map(cat => (
                        <button 
                            key={cat} 
                            onClick={() => setFilterCategory(cat)}
                            className={`px-8 py-4 rounded-[2rem] whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all border-2 ${filterCategory === cat ? 'bg-secondary text-white border-secondary' : 'bg-white dark:bg-secondary dark:border-gray-700 text-gray-500 hover:border-primary'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-secondary rounded-[3.5rem] shadow-2xl border-2 dark:border-gray-800 overflow-hidden min-h-[500px]">
                {filterType === 'certificate' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b dark:border-gray-800">
                                <tr>
                                    <th className="px-8 py-6">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-5 h-5 rounded border-gray-300 cursor-pointer"
                                            title="Select All"
                                        />
                                    </th>
                                    <th className="px-8 py-6">Proof</th>
                                    <th className="px-8 py-6">Title</th>
                                    <th className="px-8 py-6">Category</th>
                                    {certificateHeaders.map(h => (
                                        <th key={h} className="px-8 py-6">{h.replace(/_/g, ' ')}</th>
                                    ))}
                                    <th className="px-8 py-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-800">
                                {filteredFiles.map((file) => {
                                    let data: any = {};
                                    try { data = JSON.parse(file.content); } catch(e) {}
                                    return (
                                        <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-all group">
                                            <td className="px-8 py-5">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedFiles.has(file.id)}
                                                    onChange={() => toggleSelectFile(file.id)}
                                                    className="w-5 h-5 rounded border-gray-300 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-8 py-5">
                                                <button onClick={() => setViewingImage(data._image)} className="w-16 h-16 rounded-2xl overflow-hidden border-2 dark:border-gray-700 shadow-sm hover:scale-125 hover:rotate-2 transition-transform">
                                                    <img src={data._image} className="w-full h-full object-cover" alt="Cert"/>
                                                </button>
                                            </td>
                                            <td className="px-8 py-5 font-black text-gray-900 dark:text-white">{file.title}</td>
                                            <td className="px-8 py-5">
                                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-[9px] font-black uppercase text-gray-400">{file.category || 'N/A'}</span>
                                            </td>
                                            {certificateHeaders.map(h => (
                                                <td key={h} className="px-8 py-5 font-bold text-gray-600 dark:text-gray-300">
                                                    {data[h] || '—'}
                                                </td>
                                            ))}
                                            <td className="px-8 py-5 text-right">
                                                <button onClick={() => setViewingFile(file)} className="px-6 py-2.5 bg-gray-50 dark:bg-gray-800 text-[10px] font-black uppercase rounded-xl hover:bg-primary hover:text-white transition-all">Details</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredFiles.length === 0 && <div className="p-32 text-center font-bold text-gray-300 text-xl italic animate-pulse">No records found.</div>}
                    </div>
                ) : (
                    <div className="divide-y dark:divide-gray-800">
                        {filteredFiles.map((file) => (
                            <div key={file.id} className="p-10 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all group">
                                <div className="flex items-center gap-8">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedFiles.has(file.id)}
                                        onChange={() => toggleSelectFile(file.id)}
                                        className="w-6 h-6 rounded border-gray-300 cursor-pointer flex-shrink-0"
                                    />
                                    <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg ${file.type === 'report' ? 'bg-teal-50 text-teal-600 shadow-teal-100' : 'bg-blue-50 text-blue-600 shadow-blue-100'}`}>
                                        {file.type === 'report' ? <FileTextIcon className="w-10 h-10"/> : <SaveIcon className="w-10 h-10"/>}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-4">
                                            <p className="font-black text-3xl tracking-tighter text-gray-900 dark:text-white">{file.title}</p>
                                            {file.category && <span className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">{file.category}</span>}
                                        </div>
                                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-2">
                                            {new Date(file.createdAt).toLocaleDateString()} • Authorized by {file.username}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setViewingFile(file)} 
                                    className="px-12 py-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg active:scale-95"
                                >
                                    Open Document
                                </button>
                            </div>
                        ))}
                        {filteredFiles.length === 0 && <div className="p-32 text-center font-bold text-gray-300 text-xl italic animate-pulse">No reports available.</div>}
                    </div>
                )}
            </div>

            {/* EXPANDED MODALS */}
            {viewingFile && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-2xl animate-fade-in" onClick={() => setViewingFile(null)}>
                    <div className="bg-white dark:bg-secondary-dark w-full max-w-5xl max-h-[95vh] rounded-[4rem] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-10 border-b-2 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-black/10">
                            <div>
                                <h3 className="text-4xl font-black tracking-tighter">{viewingFile.title}</h3>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="px-3 py-1 bg-primary text-white text-[9px] font-black uppercase rounded-full">{viewingFile.category || 'Archived'}</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {viewingFile.id}</span>
                                </div>
                            </div>
                            <button onClick={() => setViewingFile(null)} className="w-14 h-14 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-xl hover:bg-red-500 hover:text-white transition-all text-3xl font-thin">×</button>
                        </div>
                        <div className="p-16 overflow-y-auto flex-grow bg-white dark:bg-slate-950 no-scrollbar">
                            {viewingFile.type === 'report' ? (
                                <div className="space-y-16 max-w-3xl mx-auto">
                                    <div className="prose prose-2xl dark:prose-invert max-w-none font-serif leading-relaxed selection:bg-primary/20" dangerouslySetInnerHTML={{ __html: viewingFile.content }} />
                                    {viewingFile.signature?.name && (
                                        <div className="border-t-4 border-gray-100 dark:border-gray-800 pt-10 w-80 ml-auto">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Certified By Authority</p>
                                            <p className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{viewingFile.signature.name}</p>
                                            <p className="text-xs font-black text-primary uppercase tracking-widest mt-1">{viewingFile.signature.title || 'Preparer'}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-20">
                                    <div className="bg-gray-50/50 dark:bg-black/20 rounded-[3rem] p-12 border-2 dark:border-gray-800 shadow-inner h-fit">
                                        <h4 className="text-[12px] font-black uppercase text-primary tracking-[0.3em] mb-10 pb-4 border-b dark:border-gray-700">Metadata Extraction</h4>
                                        <table className="w-full text-left">
                                            <tbody className="divide-y-2 dark:divide-gray-800">
                                                {Object.entries(JSON.parse(viewingFile.content)).filter(([k]) => !k.startsWith('_')).map(([key, value]) => (
                                                    <tr key={key}>
                                                        <td className="py-6 pr-6 text-[11px] font-black text-gray-400 uppercase tracking-tighter w-1/3">{key.replace(/_/g, ' ')}</td>
                                                        <td className="py-6 text-lg font-black text-gray-800 dark:text-gray-100">{String(value)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {JSON.parse(viewingFile.content)._image && (
                                        <div className="space-y-8">
                                            <h4 className="text-[12px] font-black uppercase text-gray-400 tracking-[0.3em] text-center">Reference Document</h4>
                                            <img src={JSON.parse(viewingFile.content)._image} className="w-full rounded-[3rem] border-4 dark:border-gray-700 shadow-2xl" alt="Certificate"/>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export { Dashboard };
