
import React, { useState, useRef, useEffect, memo } from 'react';
import { generateReportSection } from '../services/geminiService';
import { 
    FileTextIcon, SaveIcon, DownloadIcon, BoldIcon, ItalicIcon, ImageIcon, 
    UnderlineIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon,
    ListIcon, ListOrderedIcon 
} from './icons';
import { jsPDF } from "jspdf";
import { dbSaveFile } from '../services/databaseService';
import { getCurrentUser } from '../services/authService';

const ToolbarButton: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    title: string;
    isActive?: boolean;
    disabled?: boolean;
    className?: string;
}> = ({ onClick, children, title, isActive, disabled, className }) => (
    <button
        onMouseDown={(e) => { e.preventDefault(); if(!disabled) onClick(); }}
        disabled={disabled}
        className={`p-2 rounded-xl transition-all flex items-center justify-center ${
            disabled ? 'opacity-30 cursor-not-allowed' : 
            isActive ? 'bg-primary text-white shadow-lg' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        } ${className}`}
        title={title}
    >
        {children}
    </button>
);

export const ReportGenerator: React.FC = () => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [activityType, setActivityType] = useState<string>('');
    const [category, setCategory] = useState<string>('Academic');
    const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
    
    const [sigLeft, setSigLeft] = useState({ 
        name: '', 
        title: '' 
    });
    const [sigRight, setSigRight] = useState({ 
        name: '', 
        title: '' 
    });
    
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [lastRange, setLastRange] = useState<Range | null>(null);
    const draftTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        document.execCommand('styleWithCSS', false, 'true');
    }, []);

    // Cleanup draft timer on unmount
    useEffect(() => {
        return () => {
            if (draftTimerRef.current) {
                clearTimeout(draftTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const onRefresh = () => {
            clearDraft();
            setSuccessMsg('Old report cleared.');
            setTimeout(() => setSuccessMsg(null), 2000);
        };
        window.addEventListener('extractionComplete', onRefresh);
        return () => {
            window.removeEventListener('extractionComplete', onRefresh);
        };
    }, []);

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (editorRef.current?.contains(range.commonAncestorContainer)) {
                setLastRange(range.cloneRange());
            }
        }
    };

    const persistDraft = () => {
        // Draft persistence now handled by database on save
    };

    const clearDraft = () => {
        if (editorRef.current) {
            editorRef.current.innerHTML = '';
        }
        setActivityType('');
        setCategory('Academic');
        setReportDate(new Date().toISOString().split('T')[0]);
        setSigLeft({ name: '', title: '' });
        setSigRight({ name: '', title: '' });
    };

    const execCommand = (command: string, value: any = null) => {
        if (lastRange) {
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(lastRange);
        } else {
            editorRef.current?.focus();
        }
        document.execCommand(command, false, value);
        saveSelection();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const reader = new FileReader();
        reader.onload = () => {
            const imgHtml = `
                <div class="image-wrapper group relative my-8" contenteditable="false" style="display: block; text-align: center;">
                    <div style="position: relative; display: inline-block;">
                        <img src="${reader.result}" style="max-width: 100%; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);" />
                        <button 
                            onclick="this.closest('.image-wrapper').remove();" 
                            style="position: absolute; top: 12px; right: 12px; background: #ef4444; color: white; border: none; padding: 10px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;"
                            class="group-hover:opacity-100 shadow-xl"
                            title="Delete Image"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div><p><br></p>`;
            
            execCommand('insertHTML', imgHtml);
        };
        reader.readAsDataURL(files[0]);
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!activityType) {
            setError('Please provide a Report Title first.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const content = await generateReportSection(activityType);
            if (editorRef.current) {
                const formatted = content
                    .replace(/### (.*)/g, '<h3 style="font-size: 1.25rem; font-weight: 800; margin-top: 1.5rem; color: #1e293b;">$1</h3>')
                    .replace(/## (.*)/g, '<h2 style="font-size: 1.75rem; font-weight: 900; margin-top: 2rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; color: #0d9488;">$1</h2>')
                    .replace(/\* (.*)/g, '<li style="margin-left: 1rem;">$1</li>')
                    .replace(/\n\n/g, '<p style="margin-bottom: 1.25rem;"></p>')
                    .replace(/\n/g, '<br/>');
                
                execCommand('insertHTML', formatted);
                try {
                    window.dispatchEvent(new CustomEvent('reportGenerated'));
                } catch (e) { /* no-op */ }
            }
        } catch (err: any) {
            const errorMsg = err.message || "";
            if (errorMsg === "API_KEY_MISSING") {
              setError("Configuration Error: API Key is missing.");
              setTimeout(() => window.location.reload(), 2000);
            } else if (errorMsg.includes("Requested entity was not found.")) {
              setError("Invalid API Key: The key provided was not found or has expired.");
              if (window.aistudio) window.aistudio.openSelectKey();
            } else {
              setError(errorMsg || "An error occurred during AI generation.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(24);
        doc.setTextColor(13, 148, 136);
        doc.text(activityType.toUpperCase() || 'REPORT', 105, 25, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Category: ${category} | Date: ${reportDate}`, 20, 35);
        
        const content = editorRef.current?.innerText || '';
        const lines = doc.splitTextToSize(content, 170);
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text(lines, 20, 50);

        const pageHeight = doc.internal.pageSize.height;
        if (sigLeft.name) {
            doc.setFontSize(10);
            doc.text("Approved By:", 20, pageHeight - 35);
            doc.setFont("helvetica", "bold");
            doc.text(sigLeft.name, 20, pageHeight - 25);
            doc.setFont("helvetica", "normal");
            doc.text(sigLeft.title || "Principal", 20, pageHeight - 20);
        }
        if (sigRight.name) {
            doc.setFontSize(10);
            doc.text("Prepared By:", 140, pageHeight - 35);
            doc.setFont("helvetica", "bold");
            doc.text(sigRight.name, 140, pageHeight - 25);
            doc.setFont("helvetica", "normal");
            doc.text(sigRight.title || "Authorized Staff", 140, pageHeight - 20);
        }

        doc.save(`${(activityType || 'Report').replace(/\s+/g, '_')}.pdf`);
        try {
            window.dispatchEvent(new CustomEvent('reportGenerated'));
        } catch (e) { /* no-op */ }
        clearDraft();
    };

    return (
        <div className="space-y-6 max-w-[1440px] mx-auto pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <aside className="lg:col-span-1 space-y-4">
                    <div className="bg-white dark:bg-secondary p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-2xl space-y-6 sticky top-24">
                        <div className="flex items-center gap-3 border-b dark:border-gray-800 pb-4">
                           <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                               <FileTextIcon className="w-6 h-6 text-primary"/>
                           </div>
                           <h3 className="font-black text-xs tracking-widest uppercase">Report Setup</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 block mb-1 uppercase tracking-widest">Report Title</label>
                                <input type="text" value={activityType} onChange={e => { setActivityType(e.target.value); persistDraft(); }} placeholder="e.g. Monthly Summary" className="w-full p-4 bg-gray-50 dark:bg-black/20 border-2 dark:border-gray-700 rounded-2xl outline-none font-bold text-sm focus:border-primary transition-all" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 block mb-1 uppercase tracking-widest">Category</label>
                                <input type="text" value={category} onChange={e => { setCategory(e.target.value); persistDraft(); }} placeholder="e.g. Institutional" className="w-full p-4 bg-gray-50 dark:bg-black/20 border-2 dark:border-gray-700 rounded-2xl outline-none font-bold text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 block mb-1 uppercase tracking-widest">Date</label>
                                <input type="date" value={reportDate} onChange={e => { setReportDate(e.target.value); persistDraft(); }} className="w-full p-4 bg-gray-50 dark:bg-black/20 border-2 dark:border-gray-700 rounded-2xl outline-none font-bold text-sm" />
                            </div>
                        </div>

                        <button onClick={handleGenerate} disabled={isLoading} className="w-full py-5 bg-primary text-white font-black rounded-[1.5rem] hover:bg-primary-dark shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-95">
                            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FileTextIcon className="w-5 h-5"/>}
                            {isLoading ? 'AI is Writing...' : 'Auto-Generate Content'}
                        </button>
                        
                        <div className="pt-6 border-t dark:border-gray-800 space-y-6">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Signatories Configuration</h4>
                            <div className="space-y-4">
                                <div className="p-5 bg-gray-50 dark:bg-black/10 rounded-2xl space-y-2 border-2 dark:border-gray-800">
                                    <p className="text-[9px] font-black text-primary uppercase">Left Signature Dropbox</p>
                                    <input type="text" value={sigLeft.name} onChange={e => { setSigLeft({...sigLeft, name: e.target.value}); persistDraft(); }} placeholder="Signatory Name" className="w-full p-3 text-xs bg-white dark:bg-black/20 border dark:border-gray-700 rounded-xl outline-none font-bold" />
                                    <input type="text" value={sigLeft.title} onChange={e => { setSigLeft({...sigLeft, title: e.target.value}); persistDraft(); }} placeholder="Designation (e.g. Principal)" className="w-full p-3 text-xs bg-white dark:bg-black/20 border dark:border-gray-700 rounded-xl outline-none" />
                                </div>
                                <div className="p-5 bg-gray-50 dark:bg-black/10 rounded-2xl space-y-2 border-2 dark:border-gray-800">
                                    <p className="text-[9px] font-black text-primary uppercase">Right Signature Dropbox</p>
                                    <input type="text" value={sigRight.name} onChange={e => { setSigRight({...sigRight, name: e.target.value}); persistDraft(); }} placeholder="Signatory Name" className="w-full p-3 text-xs bg-white dark:bg-black/20 border dark:border-gray-700 rounded-xl outline-none font-bold" />
                                    <input type="text" value={sigRight.title} onChange={e => { setSigRight({...sigRight, title: e.target.value}); persistDraft(); }} placeholder="Designation (e.g. Staff)" className="w-full p-3 text-xs bg-white dark:bg-black/20 border dark:border-gray-700 rounded-xl outline-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                <section className="lg:col-span-3 space-y-4">
                    <div className="bg-white/95 dark:bg-secondary/95 p-3 rounded-[2rem] border-2 dark:border-gray-700 shadow-2xl sticky top-20 z-40 backdrop-blur-xl flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar border-primary/20">
                        <div className="flex items-center gap-2 pr-4 border-r dark:border-gray-700">
                             <select onChange={(e) => execCommand('fontName', e.target.value)} className="bg-gray-50 dark:bg-black/20 text-xs font-black outline-none px-4 py-2.5 rounded-xl border-2 dark:border-gray-700 min-w-[140px] cursor-pointer" title="Font Family">
                                <option value="Arial">Arial</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Verdana">Verdana</option>
                                <option value="Georgia">Georgia</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Tahoma">Tahoma</option>
                                <option value="Trebuchet MS">Trebuchet MS</option>
                             </select>
                             <select onChange={(e) => execCommand('fontSize', e.target.value)} className="bg-gray-50 dark:bg-black/20 text-xs font-black outline-none px-4 py-2.5 rounded-xl border-2 dark:border-gray-700 cursor-pointer" defaultValue="3" title="Font Size">
                                <option value="1">8 pt</option>
                                <option value="2">10 pt</option>
                                <option value="3">12 pt</option>
                                <option value="4">14 pt</option>
                                <option value="5">18 pt</option>
                                <option value="6">24 pt</option>
                                <option value="7">36 pt</option>
                             </select>
                        </div>

                        <div className="flex items-center gap-1 pr-4 border-r dark:border-gray-700">
                            <ToolbarButton onClick={() => execCommand('bold')} title="Bold"><BoldIcon className="w-5 h-5"/></ToolbarButton>
                            <ToolbarButton onClick={() => execCommand('italic')} title="Italic"><ItalicIcon className="w-5 h-5"/></ToolbarButton>
                            <ToolbarButton onClick={() => execCommand('underline')} title="Underline"><UnderlineIcon className="w-5 h-5"/></ToolbarButton>
                        </div>

                        <div className="flex items-center gap-2 pr-4 border-r dark:border-gray-700">
                            <input type="color" className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-none p-0" title="Text Color" onChange={(e) => execCommand('foreColor', e.target.value)} />
                            <input type="color" className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-none p-0" title="Text Highlight" defaultValue="#FFFF00" onChange={(e) => execCommand('hiliteColor', e.target.value)} />
                        </div>

                        <div className="flex items-center gap-1 pr-4 border-r dark:border-gray-700">
                            <ToolbarButton onClick={() => execCommand('justifyLeft')} title="Align Left"><AlignLeftIcon className="w-5 h-5"/></ToolbarButton>
                            <ToolbarButton onClick={() => execCommand('justifyCenter')} title="Align Center"><AlignCenterIcon className="w-5 h-5"/></ToolbarButton>
                            <ToolbarButton onClick={() => execCommand('justifyRight')} title="Align Right"><AlignRightIcon className="w-5 h-5"/></ToolbarButton>
                            <ToolbarButton onClick={() => execCommand('justifyFull')} title="Justify"><AlignJustifyIcon className="w-5 h-5"/></ToolbarButton>
                        </div>

                        <div className="flex items-center gap-1 pr-4 border-r dark:border-gray-700">
                            <ToolbarButton onClick={() => execCommand('insertUnorderedList')} title="Bullets"><ListIcon className="w-5 h-5"/></ToolbarButton>
                            <ToolbarButton onClick={() => execCommand('insertOrderedList')} title="Numbering"><ListOrderedIcon className="w-5 h-5"/></ToolbarButton>
                            <ToolbarButton onClick={() => execCommand('subscript')} title="Subscript"><span className="text-[10px] font-black">x₂</span></ToolbarButton>
                            <ToolbarButton onClick={() => execCommand('superscript')} title="Superscript"><span className="text-[10px] font-black">x²</span></ToolbarButton>
                        </div>

                        <div className="flex items-center gap-2">
                             <label className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl cursor-pointer flex items-center gap-2 text-primary font-black text-[10px] uppercase transition-all" title="Insert Image">
                                <ImageIcon className="w-6 h-6"/>
                                <span className="hidden sm:inline">Add Media</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                             <button onClick={() => execCommand('removeFormat')} className="p-3 text-red-500 hover:bg-red-50 rounded-2xl font-black text-xs uppercase" title="Clear Formatting">Reset Format</button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 min-h-[1100px] rounded-[3.5rem] shadow-2xl border-2 dark:border-gray-800 p-16 md:p-24 mx-auto max-w-[1000px] flex flex-col relative transition-colors">
                        <div className="text-center mb-16 border-b-4 border-gray-50 dark:border-gray-800 pb-12">
                            <span className="inline-block px-5 py-2 bg-primary/10 text-primary text-[11px] font-black uppercase rounded-full mb-6 tracking-[0.4em]">{category}</span>
                            <h1 className="text-5xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tighter leading-tight mb-6">
                                {activityType || 'REPORT DOCUMENT'}
                            </h1>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center justify-center gap-6">
                                <span>Ref: #{Math.floor(Math.random() * 900000 + 100000)}</span>
                                <span className="w-2 h-2 bg-gray-200 rounded-full"></span>
                                <span>Date: {reportDate}</span>
                            </div>
                        </div>
                        
                        <div 
                            ref={editorRef}
                            contentEditable
                            onBlur={persistDraft}
                            onMouseUp={saveSelection}
                            onInput={persistDraft}
                            className="outline-none min-h-[800px] text-xl leading-relaxed text-gray-700 dark:text-gray-200 prose dark:prose-invert max-w-none font-serif flex-grow selection:bg-primary/20"
                            style={{ caretColor: '#0d9488' }}
                        />

                        <div className="mt-24 flex justify-between items-start pt-16 border-t-2 border-gray-100 dark:border-gray-800">
                            <div className="w-72">
                                {sigLeft.name ? (
                                    <>
                                        <div className="h-16 flex items-end mb-4 border-b-2 border-gray-200 dark:border-gray-700"></div>
                                        <p className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{sigLeft.name}</p>
                                        <p className="text-[11px] font-black text-primary uppercase tracking-widest mt-1">{sigLeft.title || 'Authorized Signatory'}</p>
                                    </>
                                ) : (
                                    <p className="text-[10px] italic text-gray-400">Configure Left Signature in Sidebar</p>
                                )}
                            </div>
                            
                            <div className="w-72 text-right">
                                {sigRight.name ? (
                                    <>
                                        <div className="h-16 flex items-end justify-end mb-4 border-b-2 border-gray-200 dark:border-gray-700 ml-auto"></div>
                                        <p className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{sigRight.name}</p>
                                        <p className="text-[11px] font-black text-primary uppercase tracking-widest mt-1">{sigRight.title || 'Staff / Preparer'}</p>
                                    </>
                                ) : (
                                    <p className="text-[10px] italic text-gray-400">Configure Right Signature in Sidebar</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-5 justify-center py-12">
                        <button onClick={async () => {
                            const user = getCurrentUser();
                            if (user) {
                                persistDraft();
                                await dbSaveFile({
                                    userId: user.id, username: user.username, userRole: user.role, 
                                    userDesignation: user.designation,
                                    title: activityType || 'Report Draft', type: 'report', 
                                    category, content: editorRef.current?.innerHTML || '', reportDate,
                                    signature: sigRight
                                });
                            }
                            setSuccessMsg("Document synced to library successfully.");
                            setTimeout(() => setSuccessMsg(null), 3000);
                            try {
                                window.dispatchEvent(new CustomEvent('reportGenerated'));
                            } catch (e) { /* no-op */ }
                            clearDraft();
                        }} className="flex items-center gap-4 px-12 py-5 bg-emerald-600 text-white font-black rounded-[2rem] shadow-xl hover:bg-emerald-700 transition-all active:scale-95">
                            <SaveIcon className="w-6 h-6"/> Sync to Repository
                        </button>
                        <button onClick={downloadPDF} className="flex items-center gap-4 px-12 py-5 bg-red-600 text-white font-black rounded-[2rem] shadow-xl hover:bg-red-700 transition-all active:scale-95">
                            <DownloadIcon className="w-6 h-6"/> Export PDF
                        </button>
                    </div>
                    {successMsg && <p className="text-center text-emerald-500 font-black animate-bounce text-xl">{successMsg}</p>}
                    {error && (
                        <div className="p-8 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-[2.5rem] font-bold text-center border-2 border-red-100 whitespace-pre-wrap shadow-xl">
                            {error}
                            <div className="mt-4">
                              <button onClick={() => setError(null)} className="text-xs underline font-black uppercase">Dismiss Error</button>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};
