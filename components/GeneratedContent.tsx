
import React, { useState, useEffect } from 'react';
import type { GeneratedData } from '../types';
import { CopyButton } from './CopyButton';
import { Icon } from './Icon';

interface GeneratedContentProps {
    data: GeneratedData;
    file: File;
}

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void }> = ({ enabled, onChange }) => {
    return (
        <label htmlFor="toggle" className="flex items-center cursor-pointer">
            <div className="relative">
                <input id="toggle" type="checkbox" className="sr-only" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${enabled ? 'bg-teal-500' : 'bg-slate-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${enabled ? 'transform translate-x-full' : ''}`}></div>
            </div>
        </label>
    );
};


export const GeneratedContent: React.FC<GeneratedContentProps> = ({ data, file }) => {
    const [editableFilename, setEditableFilename] = useState(data.filename);
    const [isRenameEnabled, setIsRenameEnabled] = useState(true);

    useEffect(() => {
        setEditableFilename(data.filename);
    }, [data.filename]);

    const handleDownload = () => {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = editableFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleSiteCsvDownload = (site: 'adobe' | 'shutterstock' | 'vecteezy' | '123rf' | 'dreamstime') => {
        let headers: string[] = [];
        let rowData: (string | undefined)[] = [];
        let siteName = '';

        const escapeCsvField = (field: string | undefined) => `"${(field || '').replace(/"/g, '""')}"`;
        const keywords = data.keywords.join(',');

        switch (site) {
            case 'adobe':
                siteName = 'Adobe_Stock';
                headers = ['"Filename"', '"Title"', '"Keywords"', '"Category"'];
                rowData = [editableFilename, data.title, keywords, data.adobeStockCategory];
                break;
            case 'shutterstock':
                 siteName = 'Shutterstock';
                // Shutterstock uses the 'Description' field for the title.
                headers = ['"Filename"', '"Description"', '"Keywords"', '"Category 1"'];
                rowData = [editableFilename, data.title, keywords, data.shutterstockCategory];
                break;
            case 'vecteezy':
                siteName = 'Vecteezy';
                headers = ['"Title"', '"Description"', '"Keywords"', '"Category"'];
                rowData = [data.title, data.description, keywords, data.vecteezyCategory];
                break;
            case '123rf':
                siteName = '123RF';
                headers = ['"Title"', '"Description"', '"Keywords"', '"Category"'];
                rowData = [data.title, data.description, keywords, data.one23rfCategory];
                break;
            case 'dreamstime':
                siteName = 'Dreamstime';
                headers = ['"Title"', '"Description"', '"Keywords"', '"Category"'];
                rowData = [data.title, data.description, keywords, data.dreamstimeCategory];
                break;
        }

        const csvContent = `${headers.join(',')}\n${rowData.map(escapeCsvField).join(',')}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const baseFilename = editableFilename.replace(/\.[^/.]+$/, "");
        const csvFilename = `${baseFilename}_${siteName}.csv`;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = csvFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    return (
        <div className="w-full space-y-5 animate-fade-in">
            <ContentSection title="Title" text={data.title} />
            <ContentSection title="Description" text={data.description} isParagraph={true} />
            <ContentSection title="Keywords" text={data.keywords.join(', ')} />

            <div>
                <h3 className="text-sm font-semibold uppercase text-slate-400 tracking-wider mb-1">Stock Site Categories</h3>
                <div className="bg-slate-900/70 p-3 rounded-md text-slate-200 space-y-2">
                    <CategoryItem site="Adobe Stock" category={data.adobeStockCategory} />
                    <CategoryItem site="Shutterstock" category={data.shutterstockCategory} />
                    <CategoryItem site="Vecteezy" category={data.vecteezyCategory} />
                    <CategoryItem site="123RF" category={data.one23rfCategory} />
                    <CategoryItem site="Dreamstime" category={data.dreamstimeCategory} />
                </div>
            </div>
            
            <div>
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                         <h3 className="text-sm font-semibold uppercase text-slate-400 tracking-wider">Rename File</h3>
                         <ToggleSwitch enabled={isRenameEnabled} onChange={setIsRenameEnabled} />
                    </div>
                    <CopyButton textToCopy={editableFilename} />
                </div>
                <div className={`p-3 rounded-md transition-colors ${isRenameEnabled ? 'bg-slate-900/70' : 'bg-slate-800/50'}`}>
                    <input
                        type="text"
                        value={editableFilename}
                        onChange={(e) => setEditableFilename(e.target.value)}
                        className="w-full bg-transparent text-base font-medium focus:outline-none disabled:cursor-not-allowed disabled:text-slate-400"
                        aria-label="Editable filename"
                        disabled={!isRenameEnabled}
                    />
                </div>
            </div>
            
            <div className="pt-2 space-y-4">
                 <button
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center gap-2 bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-500"
                >
                    <Icon name="download" />
                    Download Asset
                </button>

                <div>
                    <h3 className="text-sm font-semibold uppercase text-slate-400 tracking-wider text-center mb-2">Download Site-Specific CSV</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                         <SiteCsvButton site="adobe" onClick={handleSiteCsvDownload} />
                         <SiteCsvButton site="shutterstock" onClick={handleSiteCsvDownload} />
                         <SiteCsvButton site="vecteezy" onClick={handleSiteCsvDownload} />
                         <SiteCsvButton site="123rf" onClick={handleSiteCsvDownload} />
                         <SiteCsvButton site="dreamstime" onClick={handleSiteCsvDownload} />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface SiteCsvButtonProps {
    site: 'adobe' | 'shutterstock' | 'vecteezy' | '123rf' | 'dreamstime';
    onClick: (site: SiteCsvButtonProps['site']) => void;
}

const SITE_NAMES: Record<SiteCsvButtonProps['site'], string> = {
    adobe: 'Adobe Stock',
    shutterstock: 'Shutterstock',
    vecteezy: 'Vecteezy',
    '123rf': '123RF',
    dreamstime: 'Dreamstime'
};

const SiteCsvButton: React.FC<SiteCsvButtonProps> = ({ site, onClick }) => (
    <button
        onClick={() => onClick(site)}
        className="w-full flex items-center justify-center text-sm gap-2 bg-slate-600 text-white font-semibold py-2 px-3 rounded-md hover:bg-slate-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500"
    >
        <Icon name="fileText" className="h-4 w-4" />
        {SITE_NAMES[site]}
    </button>
);

interface ContentSectionProps {
    title: string;
    text: string;
    isParagraph?: boolean;
}

const ContentSection: React.FC<ContentSectionProps> = ({ title, text, isParagraph = false }) => (
    <div>
        <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-semibold uppercase text-slate-400 tracking-wider">{title}</h3>
            <CopyButton textToCopy={text} />
        </div>
        <div className="bg-slate-900/70 p-3 rounded-md text-slate-200">
            {isParagraph ? <p className="text-base leading-relaxed">{text}</p> : <p className="text-base font-medium">{text}</p>}
        </div>
    </div>
);

const CategoryItem: React.FC<{ site: string; category?: string }> = ({ site, category }) => (
    <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-slate-400">{site}:</span>
        <span className="font-semibold text-slate-100">{category || 'N/A'}</span>
    </div>
);
