import React, { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { GeneratedContent } from './components/GeneratedContent';
import { Loader } from './components/Loader';
import { analyzeImage } from './services/geminiService';
import type { GeneratedData } from './types';
import { Icon } from './components/Icon';
import JSZip from 'jszip';

const App: React.FC = () => {
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);

    // State for the active file's processing
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [generatedData, setGeneratedData] = useState<(GeneratedData | null)[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isZipping, setIsZipping] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    // State for batch generation
    const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

    const activeFile = activeFileIndex !== null ? uploadedFiles[activeFileIndex] : null;
    const activeGeneratedData = activeFileIndex !== null ? generatedData[activeFileIndex] : null;

    const resetProcessingState = useCallback(() => {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        setImageUrl(null);
        setError(null);
        setIsLoading(false);
    }, [imageUrl]);

    const handleSelectFile = useCallback((index: number) => {
        if (index < 0 || index >= uploadedFiles.length) return;
        
        resetProcessingState();
        setActiveFileIndex(index);
        
        const file = uploadedFiles[index];
        setImageUrl(URL.createObjectURL(file));
    }, [uploadedFiles, resetProcessingState]);

    const handleFileUpload = (newFiles: File[]) => {
        const wasEmpty = uploadedFiles.length === 0;
        setUploadedFiles(prev => [...prev, ...newFiles]);
        setGeneratedData(prev => [...prev, ...Array(newFiles.length).fill(null)]);
        if (wasEmpty && newFiles.length > 0) {
            handleSelectFile(0);
        }
    };
    
    useEffect(() => {
        if (uploadedFiles.length > 0 && activeFileIndex === null) {
            handleSelectFile(0);
        }
    }, [uploadedFiles, activeFileIndex, handleSelectFile]);

    const handleGeneration = useCallback(async () => {
        if (!activeFile || activeFileIndex === null) {
            setError("Please upload and select a file first.");
            return;
        }
        setIsLoading(true);
        setError(null);
        
        const currentData = [...generatedData];
        currentData[activeFileIndex] = null;
        setGeneratedData(currentData);

        try {
            const fileName = activeFile.name.toLowerCase();
            const isVector = fileName.endsWith('.ai') || fileName.endsWith('.eps');
            const data = await analyzeImage(activeFile, isVector);
            
            const newDataArray = [...generatedData];
            newDataArray[activeFileIndex] = data;
            setGeneratedData(newDataArray);

        } catch (err: any) {
            console.error(err);
            setError(`Failed to generate content. ${err.message || 'Please try again.'}`);
        } finally {
            setIsLoading(false);
        }
    }, [activeFile, activeFileIndex, generatedData]);
    
    const handleRemoveActiveFile = () => {
        if (activeFileIndex === null) return;

        resetProcessingState();
        
        const newFiles = uploadedFiles.filter((_, index) => index !== activeFileIndex);
        const newGeneratedData = generatedData.filter((_, index) => index !== activeFileIndex);

        if (newFiles.length === 0) {
            setUploadedFiles([]);
            setActiveFileIndex(null);
            setGeneratedData([]);
        } else {
            const newIndex = activeFileIndex >= newFiles.length ? newFiles.length - 1 : activeFileIndex;
            setUploadedFiles(newFiles);
            setGeneratedData(newGeneratedData);
            // Must re-trigger selection logic manually since state updates are batched
            const file = newFiles[newIndex];
            setActiveFileIndex(newIndex);
            setImageUrl(URL.createObjectURL(file));
        }
    };
    
    const handleClearQueue = () => {
        resetProcessingState();
        setUploadedFiles([]);
        setActiveFileIndex(null);
        setGeneratedData([]);
    };
    
    const handleGenerateAll = async () => {
        const unprocessedIndices = uploadedFiles.reduce((acc, _, index) => {
            if (!generatedData[index]) {
                acc.push(index);
            }
            return acc;
        }, [] as number[]);

        if (unprocessedIndices.length === 0) return;

        setIsBatchGenerating(true);
        setError(null);
        setBatchProgress({ current: 0, total: unprocessedIndices.length });

        for (const fileIndex of unprocessedIndices) {
            const file = uploadedFiles[fileIndex];
            setBatchProgress(prev => ({ ...prev, current: prev.current + 1 }));

            try {
                const fileName = file.name.toLowerCase();
                const isVector = fileName.endsWith('.ai') || fileName.endsWith('.eps');
                const data = await analyzeImage(file, isVector);
                
                setGeneratedData(prevData => {
                    const newData = [...prevData];
                    newData[fileIndex] = data;
                    return newData;
                });

            } catch (err: any) {
                console.error(`Failed to process ${file.name}:`, err);
            }
        }
        
        setIsBatchGenerating(false);
    };

    const handleDownloadAll = async () => {
        setIsZipping(true);
        setError(null);
        try {
            const zip = new JSZip();
            const assetsFolder = zip.folder("assets");
            if (!assetsFolder) throw new Error("Could not create a folder in zip.");

            const headers = [
                '"Title"', '"Description"', '"Keywords"', '"Filename"',
                '"Adobe Stock Category"', '"Shutterstock Category"', '"Vecteezy Category"',
                '"123RF Category"', '"Dreamstime Category"'
            ];
            const csvRows = [headers.join(',')];
            const escapeCsvField = (field: string | undefined) => `"${(field || '').replace(/"/g, '""')}"`;

            uploadedFiles.forEach((file, index) => {
                const data = generatedData[index];
                if (data) {
                    assetsFolder.file(data.filename, file);
                    const row = [
                        escapeCsvField(data.title),
                        escapeCsvField(data.description),
                        escapeCsvField(data.keywords.join('; ')),
                        escapeCsvField(data.filename),
                        escapeCsvField(data.adobeStockCategory),
                        escapeCsvField(data.shutterstockCategory),
                        escapeCsvField(data.vecteezyCategory),
                        escapeCsvField(data.one23rfCategory),
                        escapeCsvField(data.dreamstimeCategory)
                    ];
                    csvRows.push(row.join(','));
                }
            });

            if (csvRows.length > 1) {
                 zip.file("metadata.csv", csvRows.join('\n'));
            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = 'Zepiy_Generated_Assets.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (err: any) {
            setError("Failed to create ZIP file. " + err.message);
        } finally {
            setIsZipping(false);
        }
    };
    
    const processedFilesCount = generatedData.filter(Boolean).length;
    const unprocessedFilesCount = uploadedFiles.length - processedFilesCount;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
            <header className="w-full max-w-6xl flex flex-col items-center text-center mb-8">
                <div
                    role="img"
                    aria-label="Muhammad Aslam"
                    style={{ backgroundImage: `url('https://i.ibb.co/yYd5d9c/image.png')` }}
                    className="h-24 w-24 rounded-2xl bg-cover bg-center border-4 border-teal-500/50 shadow-lg mb-4 transition-all hover:scale-105 hover:shadow-teal-500/20"
                ></div>
                <h1 className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-sky-500">
                    Zepiy
                </h1>
                <p className="text-slate-400 mt-1 text-md">
                    By Muhammad Aslam
                </p>
            </header>

            <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col gap-6 p-6 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-lg">
                    <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
                        <Icon name="upload" />
                        1. Upload Your Assets
                    </h2>
                    
                    <ImageUploader 
                        onFileUpload={handleFileUpload} 
                        imageUrl={imageUrl} 
                        onRemove={handleRemoveActiveFile}
                        file={activeFile}
                    />
                    
                    {uploadedFiles.length > 0 && (
                        <div className="mt-2 animate-fade-in">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold text-slate-300">File Queue ({uploadedFiles.length})</h3>
                                <div className="flex items-center gap-4">
                                     <button
                                        onClick={handleGenerateAll}
                                        disabled={unprocessedFilesCount === 0 || isLoading || isZipping || isBatchGenerating}
                                        className="text-sm font-semibold text-slate-400 hover:text-teal-400 transition-colors disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1"
                                    >
                                        <Icon name="sparkles" className="h-4 w-4" />
                                        {isBatchGenerating 
                                            ? `Generating (${batchProgress.current}/${batchProgress.total})...`
                                            : `Generate All (${unprocessedFilesCount})`
                                        }
                                    </button>
                                     <button
                                        onClick={handleDownloadAll}
                                        disabled={processedFilesCount === 0 || isLoading || isZipping || isBatchGenerating}
                                        className="text-sm font-semibold text-slate-400 hover:text-teal-400 transition-colors disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1"
                                    >
                                        <Icon name="download" className="h-4 w-4" />
                                        {isZipping ? 'Zipping...' : `Download All (${processedFilesCount})`}
                                    </button>
                                    <button 
                                        onClick={handleClearQueue} 
                                        disabled={isLoading || isZipping || isBatchGenerating}
                                        className="text-sm font-semibold text-slate-400 hover:text-red-400 transition-colors disabled:text-slate-600 disabled:cursor-not-allowed">
                                        Clear All
                                    </button>
                                </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-2 rounded-lg bg-slate-900/50 p-2">
                                {uploadedFiles.map((file, index) => {
                                     const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'vector';
                                     const isProcessed = generatedData[index] !== null;
                                    return (
                                        <button
                                            key={`${file.name}-${file.lastModified}-${index}`}
                                            onClick={() => handleSelectFile(index)}
                                            disabled={isLoading || isZipping || isBatchGenerating}
                                            className={`w-full text-left p-2 rounded-md transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${
                                                index === activeFileIndex ? 'bg-teal-500/30 text-teal-300 ring-2 ring-teal-500' : 'bg-slate-700/50 hover:bg-slate-700'
                                            }`}
                                        >
                                            <Icon name={fileType} className="h-5 w-5 flex-shrink-0" />
                                            <span className="truncate text-sm font-medium flex-grow">{file.name}</span>
                                            {isProcessed && <Icon name="check" className="h-5 w-5 text-teal-400 flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}


                    {activeFile && (
                        <button
                            onClick={handleGeneration}
                            disabled={isLoading || isZipping || isBatchGenerating}
                            className="w-full flex items-center justify-center gap-3 bg-teal-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-500"
                        >
                           {isLoading ? (
                                <>
                                    <Loader />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Icon name="sparkles" />
                                    Generate Metadata
                                </>
                            )}
                        </button>
                    )}
                </div>

                <div className="flex flex-col gap-6 p-6 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-lg min-h-[300px]">
                    <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
                        <Icon name="document" />
                        2. Generated Content
                    </h2>
                    <div className="flex-grow flex items-center justify-center">
                        {isLoading || isBatchGenerating ? (
                            <div className="text-center text-slate-400">
                                <Loader />
                                <p className="mt-2 animate-pulse">
                                  {isBatchGenerating 
                                    ? `Generating content (${batchProgress.current}/${batchProgress.total})...`
                                    : 'Analyzing asset and generating content...'
                                  }
                                </p>
                            </div>
                        ) : error ? (
                            <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
                                <p className="font-semibold">An Error Occurred</p>
                                <p>{error}</p>
                            </div>
                        ) : activeGeneratedData ? (
                            <GeneratedContent data={activeGeneratedData} file={activeFile!} />
                        ) : (
                            <div className="text-center text-slate-500">
                                {activeFile ? (
                                    <>
                                        <Icon name="sparkles" className="mx-auto h-12 w-12" />
                                        <p>Ready to generate metadata for <br/><span className="font-semibold text-slate-400">{activeFile.name}</span></p>
                                    </>
                                ) : (
                                    <>
                                     <Icon name="image" className="mx-auto h-12 w-12" />
                                     <p>Upload files to begin.</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
             <footer className="w-full max-w-6xl text-center mt-12 text-slate-500 text-sm">
                <p>© 2024 Zepiy By Muhammad Aslam. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default App;