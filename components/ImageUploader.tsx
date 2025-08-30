import React, { useRef, useState } from 'react';
import { Icon } from './Icon';

interface ImageUploaderProps {
    onFileUpload: (files: File[]) => void;
    imageUrl: string | null;
    onRemove: () => void;
    file: File | null;
}

const isValidFile = (file: File): boolean => {
    const validExtensions = ['.ai', '.eps'];
    const validMimeTypes = ['image/', 'video/'];
    const fileName = file.name.toLowerCase();
    const fileType = file.type;

    return validExtensions.some(ext => fileName.endsWith(ext)) || validMimeTypes.some(mime => fileType.startsWith(mime));
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFileUpload, imageUrl, onRemove, file }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const processFiles = (files: FileList | null) => {
        if (files && files.length > 0) {
            const validFiles = Array.from(files).filter(isValidFile);
            if (validFiles.length > 0) {
                onFileUpload(validFiles);
            }
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(event.target.files);
        // Reset the input value to allow uploading the same file again
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        processFiles(e.dataTransfer.files);
    };

    return (
        <div className="w-full">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*,.ai,.eps"
                // @ts-ignore
                webkitdirectory=""
                mozdirectory=""
                multiple
            />
            {file && imageUrl ? (
                <div className="relative group">
                    {(() => {
                        const isVideo = file.type.startsWith('video/');
                        const fileName = file.name.toLowerCase();
                        const isVector = fileName.endsWith('.ai') || fileName.endsWith('.eps');

                        if (isVector) {
                            return (
                                <div className="w-full h-64 border-2 border-slate-600 rounded-lg flex flex-col items-center justify-center text-slate-400 bg-slate-800/50">
                                    <Icon name="vector" className="h-16 w-16 mb-4 text-teal-400" />
                                    <span className="font-semibold text-slate-200">Vector File</span>
                                    <span className="text-sm text-slate-500 break-all px-4 text-center">{file.name}</span>
                                </div>
                            );
                        }

                        if (isVideo) {
                            return (
                                <video 
                                    src={imageUrl} 
                                    controls 
                                    className="w-full h-auto max-h-96 object-contain rounded-lg shadow-md"
                                >
                                    Your browser does not support the video tag.
                                </video>
                            );
                        }

                        return (
                             <img 
                                src={imageUrl} 
                                alt="Uploaded preview" 
                                className="w-full h-auto max-h-96 object-contain rounded-lg shadow-md" 
                            />
                        );
                    })()}
                    <button
                        onClick={onRemove}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-opacity opacity-0 group-hover:opacity-100"
                        aria-label="Remove asset"
                    >
                       <Icon name="close" />
                    </button>
                </div>
            ) : (
                <div
                    onClick={handleUploadClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-400 cursor-pointer transition-all duration-300 ${
                        isDragging ? 'border-teal-500 bg-slate-800/60 scale-105' : 'border-slate-600 hover:border-teal-500 hover:text-teal-400'
                    }`}
                >
                    <Icon name="uploadCloud" className="h-12 w-12 mb-2" />
                    <span className="font-semibold">Drag & drop your assets or folder here</span>
                    <span className="text-sm">or click to browse</span>
                </div>
            )}
        </div>
    );
};