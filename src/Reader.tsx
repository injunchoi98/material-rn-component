import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { LoadingFile } from './utils/LoadingFile';
import type { ReaderProps } from './types';
import { View } from './View';
import { useInjectWebViewVariables } from './hooks/useInjectWebviewVariables';
import { defaultTheme as initialTheme } from './hooks/useBook';
import { useBookContext } from './context';
import { isURL } from './utils/isURL';
import { getSourceType } from './utils/getSourceType';
import { getSourceName } from './utils/getPathname';
import { SourceType } from './utils/enums/source-type.enum';
import { isFsUri } from './utils/isFsUri';
import jszip from './utils/core/jszip';
import epubjs from './utils/core/epubjs';

export function Reader({
  src,
  width = '100%',
  height = '100%',
  defaultTheme = initialTheme,
  initialLocations,
  allowScriptedContent = Platform.OS === 'ios',
  onPressExternalLink,
  renderLoadingFileComponent = (props) => (
    <LoadingFile {...props} width={width} height={height} />
  ),
  fileSystem: useFileSystem,
  menuItems,
  manager = 'default',
  flow = 'auto',
  snap,
  spread,
  fullsize,
  charactersPerLocation,
  ...rest
}: ReaderProps) {
  const {
    downloadFile,
    size: fileSize,
    progress: downloadProgress,
    success: downloadSuccess,
    error: downloadError,
    documentDirectory,
    writeAsStringAsync,
  } = useFileSystem();
  const enableSelection = menuItems ? true : rest.enableSelection || false;
  const allowPopups = onPressExternalLink ? true : rest.allowPopups || false;

  const {
    setIsLoading,
    isLoading,
    registerBook,
    setTotalLocations,
    setCurrentLocation,
    setMeta,
    setProgress,
    setLocations,
    setAtStart,
    setAtEnd,
    goNext,
    goPrevious,
    isRendering,
    setIsRendering,
    goToLocation,
    changeTheme,
    setKey,
    setSearchResults,
    theme,
    removeSelection,
    setAnnotations,
    setInitialAnnotations,
    section,
    setSection,
    setToc,
    setLandmarks,
    setBookmarks,
    bookmarks,

    currentLocation,
    setIsSearching,
    setFlow,
    manageAnnotation,
    injectJavascript,
    annotations,
    locations,
    toc,
    landmarks,
    isBookmarked,
    getLocations,
    getCurrentLocation,
    getMeta,
    search,
    clearSearchResults,
    isSearching,
    searchResults,
    atStart,
    atEnd,
    totalLocations,
    meta,
    progress,
    changeFontFamily,
    changeFontSize,
    changeFlow,
    bookKey,
  } = useBookContext();
  const { injectWebViewVariables } = useInjectWebViewVariables();
  const [template, setTemplate] = useState<string | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [allowedUris, setAllowedUris] = useState<string | null>(null);
  const [initialAnnotations] = useState(annotations);

  useEffect(() => {
    (async () => {
      setIsLoading(true);

      const jszipFileUri = `${documentDirectory}/jszip.min.js`;
      const epubjsFileUri = `${documentDirectory}/epub.min.js`;
      try {
        await writeAsStringAsync(jszipFileUri, jszip);
      } catch (e) {
        throw new Error('failed to write jszip js file');
      }

      try {
        await writeAsStringAsync(epubjsFileUri, epubjs);
      } catch (e) {
        throw new Error('failed to write epubjs js file');
      }

      setAllowedUris(`${jszipFileUri},${epubjsFileUri}`);

      if (src) {
        const sourceType = getSourceType(src);
        const isExternalSource = isURL(src);
        const isSrcInFs = isFsUri(src);

        if (!sourceType) {
          throw new Error(`Invalid source type: ${src}`);
        }

        if (!isExternalSource) {
          if (isSrcInFs) {
            setAllowedUris(`${src}${jszipFileUri},${epubjsFileUri}`);
          }
          if (sourceType === SourceType.BASE64) {
            // -- DIRECT INJECTION --
            // We pass variables like `initialAnnotations` here. They become part of the `template` HTML string.
            // This ensures they are available immediately when the WebView loads, avoiding "flash of unstyled content".
            setTemplate(
              injectWebViewVariables({
                jszip: jszipFileUri,
                epubjs: epubjsFileUri,
                type: SourceType.BASE64,
                book: src,
                theme: defaultTheme,
                locations: initialLocations,
                enableSelection,
                allowScriptedContent,
                allowPopups,
                manager,
                flow,
                snap,
                spread,
                fullsize,
                charactersPerLocation,
                initialAnnotations,
              })
            );

            setIsLoading(false);
          } else {
            setTemplate(
              injectWebViewVariables({
                jszip: jszipFileUri,
                epubjs: epubjsFileUri,
                type: SourceType.BINARY,
                book: src,
                theme: defaultTheme,
                locations: initialLocations,
                enableSelection,
                allowScriptedContent,
                allowPopups,
                manager,
                flow,
                snap,
                spread,
                fullsize,
                charactersPerLocation,
                initialAnnotations,
              })
            );

            setIsLoading(false);
          }
        }

        if (isExternalSource) {
          const sourceName = getSourceName(src);

          if (!sourceName) {
            throw new Error(`Invalid source name: ${src}`);
          }

          if (sourceType === SourceType.OPF || sourceType === SourceType.EPUB) {
            setTemplate(
              injectWebViewVariables({
                jszip: jszipFileUri,
                epubjs: epubjsFileUri,
                type: sourceType,
                book: src,
                theme: defaultTheme,
                locations: initialLocations,
                enableSelection,
                allowScriptedContent,
                allowPopups,
                manager,
                flow,
                snap,
                spread,
                fullsize,
                charactersPerLocation,
                initialAnnotations,
              })
            );

            setIsLoading(false);
          } else {
            const { uri: bookFileUri } = await downloadFile(src, sourceName);

            if (!bookFileUri) throw new Error("Couldn't download book");

            setAllowedUris(`${bookFileUri},${jszipFileUri},${epubjsFileUri}`);

            setTemplate(
              injectWebViewVariables({
                jszip: jszipFileUri,
                epubjs: epubjsFileUri,
                type: sourceType,
                book: bookFileUri,
                theme: defaultTheme,
                locations: initialLocations,
                enableSelection,
                allowScriptedContent,
                allowPopups,
                manager,
                flow,
                snap,
                spread,
                fullsize,
                charactersPerLocation,
                initialAnnotations,
              })
            );

            setIsLoading(false);
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    allowPopups,
    allowScriptedContent,
    defaultTheme,
    documentDirectory,
    downloadFile,
    enableSelection,
    initialLocations,
    injectWebViewVariables,
    setIsLoading,
    src,
    // ! Causing unknown loop
    // writeAsStringAsync,
  ]);

  useEffect(() => {
    const saveTemplateFileToDoc = async () => {
      try {
        if (template) {
          const content = template;

          const fileUri = `${documentDirectory}/index.html`;
          await writeAsStringAsync(fileUri, content);
          setTemplateUrl(fileUri);
        }
      } catch (error) {
        throw new Error('Error saving index.html file:');
      }
    };
    if (template) {
      saveTemplateFileToDoc();
    }
  }, [documentDirectory, template, writeAsStringAsync]);

  if (isLoading) {
    return renderLoadingFileComponent({
      fileSize,
      downloadProgress,
      downloadSuccess,
      downloadError,
    });
  }

  if (!templateUrl || !allowedUris) {
    return renderLoadingFileComponent({
      fileSize,
      downloadProgress,
      downloadSuccess,
      downloadError,
    });
  }
  return (
    <View
      templateUri={templateUrl}
      allowedUris={allowedUris}
      width={width}
      height={height}
      defaultTheme={defaultTheme || initialTheme}
      onPressExternalLink={onPressExternalLink}
      enableSelection={enableSelection}
      menuItems={menuItems}
      manager={manager}

      flow={flow}
      snap={snap}
      registerBook={registerBook}
      setTotalLocations={setTotalLocations}
      setCurrentLocation={setCurrentLocation}
      setMeta={setMeta}
      setProgress={setProgress}
      setLocations={setLocations}
      setIsLoading={setIsLoading}
      isLoading={isLoading}
      locations={locations}
      setAtStart={setAtStart}
      setAtEnd={setAtEnd}
      goNext={goNext}
      goPrevious={goPrevious}
      isRendering={isRendering}
      setIsRendering={setIsRendering}
      goToLocation={goToLocation}
      changeTheme={changeTheme}
      setKey={setKey}
      setSearchResults={setSearchResults}
      theme={theme}
      removeSelection={removeSelection}
      setAnnotations={setAnnotations}
      setInitialAnnotations={setInitialAnnotations}
      section={section}
      setSection={setSection}
      setToc={setToc}
      setLandmarks={setLandmarks}
      setBookmarks={setBookmarks}
      bookmarks={bookmarks}

      currentLocation={currentLocation}
      setIsSearching={setIsSearching}
      setFlow={setFlow}
      manageAnnotation={manageAnnotation}
      injectJavascript={injectJavascript}
      annotations={annotations}
      toc={toc}
      landmarks={landmarks}
      isBookmarked={isBookmarked}
      getLocations={getLocations}
      getCurrentLocation={getCurrentLocation}
      getMeta={getMeta}
      search={search}
      clearSearchResults={clearSearchResults}
      isSearching={isSearching}
      searchResults={searchResults}
      atStart={atStart}
      atEnd={atEnd}
      totalLocations={totalLocations}
      meta={meta}
      progress={progress}
      changeFontFamily={changeFontFamily}
      changeFontSize={changeFontSize}
      changeFlow={changeFlow}
      bookKey={bookKey}
      {...rest}
    />
  );
}
