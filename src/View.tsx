import React, { useContext, useEffect, useRef, useState } from 'react';
import { Dimensions, View as RNView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewMessageEvent,
} from 'react-native-webview/lib/WebViewTypes';
import { defaultTheme as initialTheme } from './hooks/useBook';
import type { ReaderProps, BookResult } from './types';
import { OpeningBook } from './utils/OpeningBook';
import INTERNAL_EVENTS from './utils/internalEvents.util';
import { GestureHandler } from './utils/GestureHandler';

export type ViewProps = Omit<ReaderProps, 'src' | 'fileSystem'> & BookResult & {
  templateUri: string;
  allowedUris: string;
};

export function View({
  templateUri,
  allowedUris,
  onStarted = () => { },
  onReady = () => { },
  onDisplayError = () => { },
  onResized = () => { },
  onLocationChange = () => { },
  onRendered = () => { },
  onChangeSection = () => { },
  onSearch = () => { },
  onLocationsReady = () => { },
  onSelected = () => { },
  onPressAnnotation = () => { },
  onOrientationChange = () => { },
  onLayout = () => { },
  onNavigationLoaded = () => { },
  onBeginning = () => { },
  onFinish = () => { },

  width,
  height,
  initialLocation,
  enableSwipe = true,
  onSwipeLeft = () => { },
  onSwipeRight = () => { },

  defaultTheme = initialTheme,
  renderOpeningBookComponent = () => (
    <OpeningBook
      width={width}
      height={height}
      backgroundColor={defaultTheme.body.background}
    />
  ),
  openingBookComponentContainerStyle = {
    width: width || Dimensions.get('screen').width,
    height: height || Dimensions.get('screen').height,
  },
  onPressExternalLink,
  menuItems,
  onAddAnnotation = () => { },
  onChangeAnnotations = () => { },
  initialAnnotations,
  onAddBookmark = () => { },
  onRemoveBookmark = () => { },
  onUpdateBookmark = () => { },
  onChangeBookmarks = () => { },
  initialBookmarks,
  injectedJavascript,
  getInjectionJavascriptFn,
  onWebViewMessage,
  waitForLocationsReady = false,
  keepScrollOffsetOnLocationChange,

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
  setIsSearching,
  addBookmark,
  removeBookmark,
  updateBookmark,

}: ViewProps) {
  const book = useRef<WebView>(null);
  const [selectedText, setSelectedText] = useState<{
    cfiRange: string;
    cfiRangeText: string;
  }>({ cfiRange: '', cfiRangeText: '' });

  useEffect(() => {
    if (getInjectionJavascriptFn && book.current) {
      getInjectionJavascriptFn(book.current.injectJavaScript);
    }
  }, [getInjectionJavascriptFn]);

  const onMessage = (event: WebViewMessageEvent) => {
    const parsedEvent = JSON.parse(event.nativeEvent.data);
    const { type } = parsedEvent;

    const msg = JSON.stringify(parsedEvent);
    //console.log('WebView Message:', type, msg.length > 100 ? msg.slice(0, 1000) + '...' : msg);

    if (!INTERNAL_EVENTS.includes(type) && onWebViewMessage) {
      return onWebViewMessage(parsedEvent);
    }

    delete parsedEvent.type;

    if (type === 'meta') {
      const { metadata } = parsedEvent;
      setMeta(metadata);
    }

    if (type === 'onStarted') {
      setIsRendering(true);

      changeTheme(defaultTheme);

      return onStarted();
    }

    if (type === 'onReady') {
      const { totalLocations, currentLocation, progress } = parsedEvent;
      if (!waitForLocationsReady) {
        setIsRendering(false);
      }



      if (injectedJavascript) {
        book.current?.injectJavaScript(injectedJavascript);
      }

      return onReady(totalLocations, currentLocation, progress);
    }

    if (type === 'onDisplayError') {
      const { reason } = parsedEvent;
      setIsRendering(false);

      return onDisplayError(reason);
    }

    if (type === 'onResized') {
      const { layout } = parsedEvent;

      return onResized(layout);
    }

    if (type === 'onLocationChange') {
      const { totalLocations, currentLocation, progress, currentSection } =
        parsedEvent;
      setTotalLocations(totalLocations);
      setCurrentLocation(currentLocation);
      setProgress(progress);
      setSection(currentSection);

      if (section?.href !== currentSection?.href) {
        onChangeSection(currentSection);
      }



      if (currentLocation.atStart) setAtStart(true);
      else if (currentLocation.atEnd) setAtEnd(true);
      else {
        setAtStart(false);
        setAtEnd(false);
      }
      return onLocationChange(
        totalLocations,
        currentLocation,
        progress,
        currentSection
      );
    }

    if (type === 'onSearch') {
      const { results, totalResults } = parsedEvent;
      setSearchResults({ results, totalResults });
      setIsSearching(false);

      return onSearch(results, totalResults);
    }

    if (type === 'onLocationsReady') {
      const { epubKey, totalLocations, currentLocation, progress } =
        parsedEvent;
      setLocations(parsedEvent.locations);
      setKey(epubKey);
      setTotalLocations(totalLocations);
      setCurrentLocation(currentLocation);
      setProgress(progress);

      if (waitForLocationsReady) {
        setIsRendering(false);
      }

      return onLocationsReady(epubKey, parsedEvent.locations);
    }

    if (type === 'onSelected') {
      const { cfiRange, text } = parsedEvent;

      setSelectedText({ cfiRange, cfiRangeText: text });
      return onSelected(text, cfiRange);
    }

    if (type === 'onOrientationChange') {
      const { orientation } = parsedEvent;

      return onOrientationChange(orientation);
    }

    if (type === 'onBeginning') {
      setAtStart(true);

      return onBeginning();
    }

    if (type === 'onFinish') {
      setAtEnd(true);

      return onFinish();
    }

    if (type === 'onRendered') {
      const { currentSection } = parsedEvent;

      return onRendered(parsedEvent.section, currentSection);
    }

    if (type === 'onLayout') {
      const { layout } = parsedEvent;

      return onLayout(layout);
    }

    if (type === 'onNavigationLoaded') {
      const { toc, landmarks } = parsedEvent;

      setToc(toc);
      setLandmarks(landmarks);

      return onNavigationLoaded({ toc, landmarks });
    }

    if (type === 'onAddAnnotation') {
      const { annotation } = parsedEvent;
      return onAddAnnotation(annotation);
    }

    if (type === 'onChangeAnnotations') {
      const { annotations } = parsedEvent;
      setAnnotations(annotations);
      return onChangeAnnotations(annotations);
    }

    if (type === 'onSetInitialAnnotations') {
      const { annotations } = parsedEvent;
      setAnnotations(annotations);
      return () => { };
    }

    if (type === 'onPressAnnotation') {
      const { annotation } = parsedEvent;
      return onPressAnnotation(annotation);
    }

    if (type === 'onAddBookmark') {
      const { bookmark } = parsedEvent;
      addBookmark(bookmark);
      return onAddBookmark(bookmark);
    }

    if (type === 'onRemoveBookmark') {
      const { bookmark } = parsedEvent;
      removeBookmark(bookmark);
      return onRemoveBookmark(bookmark);
    }

    if (type === 'onRemoveBookmarks') {
      setBookmarks([]);
      return;
    }

    if (type === 'onUpdateBookmark') {
      const { bookmark } = parsedEvent;
      updateBookmark(bookmark);
      return onUpdateBookmark(bookmark);
    }



    return () => { };
  };

  /**
   * Handles selection of custom menu items (e.g., "Highlight", "Note").
   * Executed when a user selects an option from the text selection menu.
   */
  const handleOnCustomMenuSelection = (event: {
    nativeEvent: {
      label: string;
      key: string;
      selectedText: string;
    };
  }) => {
    menuItems?.forEach((item) => {
      if (event.nativeEvent.label === item.label) {
        const removeSelectionMenu = item.action(
          selectedText.cfiRange,
          selectedText.cfiRangeText
        );

        if (removeSelectionMenu) {
          removeSelection();
        }
      }
    });
  };

  /**
   * Intercepts navigation requests from the WebView.
   * Instead of loading a new page, it triggers the internal `goToLocation` to change chapters smoothly.
   */
  const handleOnShouldStartLoadWithRequest = (
    request: ShouldStartLoadRequest
  ) => {
    if (
      !isRendering &&
      request.mainDocumentURL &&
      request.url !== request.mainDocumentURL
    ) {
      goToLocation(request.url.replace(request.mainDocumentURL, ''));
    }



    return true;
  };



  /**
   * Registers the WebView instance with the useBook hook.
   * This bridge is essential for the hook to control the WebView (e.g., changing themes, navigation).
   */

  useEffect(() => {
    if (book.current) registerBook(book.current);
  }, [registerBook]);

  return (
    <GestureHandler
      width={width}
      height={height}

      onSwipeLeft={() => {
        if (enableSwipe) {
          goNext({
            keepScrollOffset: keepScrollOffsetOnLocationChange,
          });
          onSwipeLeft();
        }
      }}
      onSwipeRight={() => {
        if (enableSwipe) {
          goPrevious({
            keepScrollOffset: keepScrollOffsetOnLocationChange,
          });
          onSwipeRight();
        }
      }}
    >
      {isRendering && (
        <RNView
          style={{
            ...openingBookComponentContainerStyle,
            position: 'absolute',
            zIndex: 2,
          }}
        >
          {renderOpeningBookComponent()}
        </RNView>
      )}

      <WebView
        ref={book}
        source={{ uri: templateUri }}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled
        originWhitelist={['*']}
        scrollEnabled={false}
        nestedScrollEnabled={Platform.OS === 'android' ? true : undefined}
        overScrollMode="never"
        mixedContentMode="compatibility"
        onMessage={onMessage}
        menuItems={menuItems?.map((item, key) => ({
          label: item.label,
          key: key.toString(),
        }))}
        onCustomMenuSelection={handleOnCustomMenuSelection}
        allowingReadAccessToURL={allowedUris}
        allowUniversalAccessFromFileURLs
        allowFileAccessFromFileURLs
        allowFileAccess
        javaScriptCanOpenWindowsAutomatically
        onOpenWindow={(event) => {
          event.preventDefault();
        }}
        onShouldStartLoadWithRequest={handleOnShouldStartLoadWithRequest}
        style={{
          width,
          backgroundColor: theme.body.background,
          height,
        }}
      />
    </GestureHandler>
  );
}
