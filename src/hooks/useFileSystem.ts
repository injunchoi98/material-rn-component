import { useState, useCallback, useMemo } from 'react';
import * as FileSystem from 'expo-file-system';

type FileSystemType = {
    file: string | null;
    progress: number;
    downloading: boolean;
    size: number;
    error: string | null;
    success: boolean;
    documentDirectory: string | null;
    cacheDirectory: string | null;
    bundleDirectory: string | undefined;
    readAsStringAsync: (
        fileUri: string,
        options?: { encoding?: 'utf8' | 'base64' }
    ) => Promise<string>;
    writeAsStringAsync: (
        fileUri: string,
        contents: string,
        options?: { encoding?: 'utf8' | 'base64' }
    ) => Promise<void>;
    deleteAsync: (fileUri: string) => Promise<void>;
    downloadFile: (
        fromUrl: string,
        toFile: string
    ) => Promise<{ uri: string | null; mimeType: string | null }>;
    getFileInfo: (fileUri: string) => Promise<{
        uri: string;
        exists: boolean;
        isDirectory: boolean;
        size: number | undefined;
    }>;
};

export function useFileSystem(): FileSystemType {
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [downloadSuccess, setDownloadSuccess] = useState(false);
    const [downloadedFile, setDownloadedFile] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState(0);

    const downloadFile = useCallback(async (fromUrl: string, toFile: string) => {
        setIsDownloading(true);
        setDownloadProgress(0);
        setDownloadSuccess(false);
        setDownloadError(null);

        const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
            const progress =
                downloadProgress.totalBytesWritten /
                downloadProgress.totalBytesExpectedToWrite;
            setDownloadProgress(progress);
        };

        const downloadResumable = FileSystem.createDownloadResumable(
            fromUrl,
            toFile,
            {},
            callback
        );

        try {
            const result = await downloadResumable.downloadAsync();

            if (result && result.uri) {
                setDownloadSuccess(true);
                setDownloadedFile(result.uri);
                const info = await FileSystem.getInfoAsync(result.uri);
                if (info.exists) {
                    setFileSize(info.size);
                }
                setIsDownloading(false);
                return {
                    uri: result.uri,
                    mimeType: result.mimeType || null,
                };
            } else {
                throw new Error('Download failed');
            }
        } catch (error: any) {
            setDownloadError(error.message);
            setIsDownloading(false);
            throw error;
        }
    }, [setIsDownloading, setDownloadProgress, setDownloadSuccess, setDownloadError, setDownloadedFile, setFileSize]);

    const readAsStringAsync = useCallback(async (fileUri: string, options?: { encoding?: 'utf8' | 'base64' }) => {
        const encoding = options?.encoding === 'base64' ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8;
        return FileSystem.readAsStringAsync(fileUri, { encoding });
    }, []);

    const writeAsStringAsync = useCallback(async (fileUri: string, contents: string, options?: { encoding?: 'utf8' | 'base64' }) => {
        const encoding = options?.encoding === 'base64' ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8;
        return FileSystem.writeAsStringAsync(fileUri, contents, { encoding });
    }, []);

    const deleteAsync = useCallback(async (fileUri: string) => {
        return FileSystem.deleteAsync(fileUri, { idempotent: true });
    }, []);

    const getFileInfo = useCallback(async (fileUri: string) => {
        const info = await FileSystem.getInfoAsync(fileUri);
        return {
            uri: info.uri,
            exists: info.exists,
            isDirectory: info.isDirectory,
            size: info.exists ? info.size : undefined,
        };
    }, []);

    return useMemo(() => ({
        file: downloadedFile,
        progress: downloadProgress,
        downloading: isDownloading,
        size: fileSize,
        error: downloadError,
        success: downloadSuccess,
        documentDirectory: FileSystem.documentDirectory,
        cacheDirectory: FileSystem.cacheDirectory,
        bundleDirectory: FileSystem.bundleDirectory || undefined,
        readAsStringAsync,
        writeAsStringAsync,
        deleteAsync,
        downloadFile,
        getFileInfo,
    }), [
        downloadedFile,
        downloadProgress,
        isDownloading,
        fileSize,
        downloadError,
        downloadSuccess,
        readAsStringAsync,
        writeAsStringAsync,
        deleteAsync,
        downloadFile,
        getFileInfo
    ]);
}