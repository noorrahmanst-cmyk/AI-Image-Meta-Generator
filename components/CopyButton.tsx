
import React, { useState } from 'react';
import { Icon } from './Icon';

interface CopyButtonProps {
    textToCopy: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-colors"
            aria-label="Copy to clipboard"
        >
            {copied ? <Icon name="check" className="text-teal-400" /> : <Icon name="copy" />}
        </button>
    );
};
