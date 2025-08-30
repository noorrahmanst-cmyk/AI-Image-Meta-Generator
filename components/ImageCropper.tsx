import React, { useState, useRef } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Icon } from './Icon';

interface ImageCropperProps {
    originalFile: File;
    onConfirm: (file: File) => void;
    onCancel: () => void;
}

function getCroppedImg(image: HTMLImageElement, crop: Crop, fileName: string, fileType: string): Promise<File> {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    const pixelCrop = {
      x: Math.round(crop.x * scaleX),
      y: Math.round(crop.y * scaleY),
      width: Math.round(crop.width * scaleX),
      height: Math.round(crop.height * scaleY),
    };

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('No 2d context');
    }

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            const croppedFile = new File([blob], fileName, { type: fileType });
            resolve(croppedFile);
        }, fileType, 0.95);
    });
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ originalFile, onConfirm, onCancel }) => {
    const [crop, setCrop] = useState<Crop>();
    const imgRef = useRef<HTMLImageElement>(null);
    const [imageUrl] = useState(() => URL.createObjectURL(originalFile));

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const initialCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, 16 / 9, width, height),
            width,
            height
        );
        setCrop(initialCrop);
    };

    const handleConfirmClick = async () => {
        if (imgRef.current && crop?.width && crop?.height) {
            try {
                const croppedFile = await getCroppedImg(imgRef.current, crop, originalFile.name, originalFile.type);
                onConfirm(croppedFile);
            } catch (e) {
                console.error("Error cropping image:", e);
                onCancel();
            }
        }
    };
    
    return (
        <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
            <p className="text-slate-300 text-center text-sm">Adjust the selection to crop your image.</p>
            <div className="max-h-96 w-full flex justify-center bg-slate-900/50 rounded-lg overflow-hidden">
                 <ReactCrop
                    crop={crop}
                    onChange={c => setCrop(c)}
                    aspect={16 / 9}
                    minWidth={100}
                 >
                    <img
                        ref={imgRef}
                        src={imageUrl}
                        alt="Crop preview"
                        onLoad={onImageLoad}
                        style={{ maxHeight: '24rem' }}
                        className="object-contain"
                    />
                </ReactCrop>
            </div>
            <div className="w-full flex flex-col sm:flex-row gap-3">
                <button
                    onClick={onCancel}
                    className="w-full flex items-center justify-center gap-2 bg-slate-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-700 transition-colors"
                >
                    <Icon name="close" />
                    Cancel
                </button>
                <button
                    onClick={handleConfirmClick}
                    className="w-full flex items-center justify-center gap-2 bg-teal-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-600 transition-colors"
                >
                    <Icon name="check" />
                    Confirm Crop
                </button>
            </div>
        </div>
    );
};
