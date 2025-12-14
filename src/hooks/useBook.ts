import {
    useCallback,
    useMemo,
    useReducer,
    useRef,
    useEffect,
    useState,
} from 'react';
import type WebView from 'react-native-webview';
import type {
    ePubCfi,
    FontSize,
    Location,
    AnnotationType,
    SearchResult,
    Theme,
    Annotation,
    AnnotationStyles,
    Bookmark,
    SearchOptions,
    Section,
    Toc,
    Landmark,
    Flow,
    PaginateOptions,
} from '../types';
import * as webViewInjectFunctions from '../utils/webViewInjectFunctions';

type ActionMap<M extends { [index: string]: unknown }> = {
    [Key in keyof M]: M[Key] extends undefined
    ? {
        type: Key;
    }
    : {
        type: Key;
        payload: M[Key];
    };
};

enum Types {
    CHANGE_THEME = 'CHANGE_THEME',
    CHANGE_FONT_SIZE = 'CHANGE_FONT_SIZE',
    CHANGE_FONT_FAMILY = 'CHANGE_FONT_FAMILY',
    SET_AT_START = 'SET_AT_START',
    SET_AT_END = 'SET_AT_END',
    SET_KEY = 'SET_KEY',
    SET_TOTAL_LOCATIONS = 'SET_TOTAL_LOCATIONS',
    SET_CURRENT_LOCATION = 'SET_CURRENT_LOCATION',
    SET_META = 'SET_META',
    SET_PROGRESS = 'SET_PROGRESS',
    SET_LOCATIONS = 'SET_LOCATIONS',
    SET_IS_LOADING = 'SET_IS_LOADING',
    SET_IS_RENDERING = 'SET_IS_RENDERING',
    SET_SEARCH_RESULTS = 'SET_SEARCH_RESULTS',
    SET_IS_SEARCHING = 'SET_IS_SEARCHING',
    SET_ANNOTATIONS = 'SET_ANNOTATIONS',
    SET_SECTION = 'SET_SECTION',
    SET_TOC = 'SET_TOC',
    SET_LANDMARKS = 'SET_LANDMARKS',
    SET_BOOKMARKS = 'SET_BOOKMARKS',
    SET_FLOW = 'SET_FLOW',
}

type BookPayload = {
    [Types.CHANGE_THEME]: Theme;
    [Types.CHANGE_FONT_SIZE]: FontSize;
    [Types.CHANGE_FONT_FAMILY]: string;
    [Types.SET_AT_START]: boolean;
    [Types.SET_AT_END]: boolean;
    [Types.SET_KEY]: string;
    [Types.SET_TOTAL_LOCATIONS]: number;
    [Types.SET_CURRENT_LOCATION]: Location;
    [Types.SET_META]: {
        cover: string | ArrayBuffer | null | undefined;
        author: string;
        title: string;
        description: string;
        language: string;
        publisher: string;
        rights: string;
    };
    [Types.SET_PROGRESS]: number;
    [Types.SET_LOCATIONS]: ePubCfi[];
    [Types.SET_IS_LOADING]: boolean;
    [Types.SET_IS_RENDERING]: boolean;
    [Types.SET_IS_SEARCHING]: boolean;
    [Types.SET_SEARCH_RESULTS]: { results: SearchResult[]; totalResults: number };
    [Types.SET_ANNOTATIONS]: Annotation[];
    [Types.SET_SECTION]: Section | null;
    [Types.SET_TOC]: Toc;
    [Types.SET_LANDMARKS]: Landmark[];
    [Types.SET_BOOKMARKS]: Bookmark[];
    [Types.SET_FLOW]: Flow;
};

type BookActions = ActionMap<BookPayload>[keyof ActionMap<BookPayload>];

type InitialState = {
    theme: Theme;
    fontFamily: string;
    fontSize: FontSize;
    atStart: boolean;
    atEnd: boolean;
    bookKey: string;
    totalLocations: number;
    currentLocation: Location | null;
    meta: {
        cover: string | ArrayBuffer | null | undefined;
        author: string;
        title: string;
        description: string;
        language: string;
        publisher: string;
        rights: string;
    };
    progress: number;
    locations: ePubCfi[];
    isLoading: boolean;
    isRendering: boolean;
    isSearching: boolean;
    searchResults: { results: SearchResult[]; totalResults: number };
    annotations: Annotation[];
    section: Section | null;
    toc: Toc;
    landmarks: Landmark[];
    bookmarks: Bookmark[];
    flow: Flow;
};

export const defaultTheme: Theme = {
    'body': {
        background: '#fff',
    },
    'span': {
        color: '#000 !important',
    },
    'p': {
        color: '#000 !important',
    },
    'li': {
        color: '#000 !important',
    },
    'h1': {
        color: '#000 !important',
    },
    'a': {
        'color': '#000 !important',
        'pointer-events': 'auto',
        'cursor': 'pointer',
    },
    '::selection': {
        background: 'lightskyblue',
    },
};

const initialState: InitialState = {
    theme: defaultTheme,
    fontFamily: 'Helvetica',
    fontSize: '12pt',
    // UI State: Used for disabling buttons or showing edge indicators.
    // While these could be derived from `currentLocation`, separate state allows for specific event reactions (onBeginning/onFinish).
    atStart: false,
    atEnd: false,
    bookKey: '',
    totalLocations: 0,
    currentLocation: null,
    meta: {
        cover: null,
        author: '',
        title: '',
        description: '',
        language: '',
        publisher: '',
        rights: '',
    },
    progress: 0,
    locations: [],
    // -- Two-Phase Loading System --
    // 1. isLoading: Native side is preparing the file (download, decode, unzip). WebView is not yet active.
    isLoading: true,
    // 2. isRendering: WebView is active and epub.js is parsing/laying out the book.
    isRendering: true,
    isSearching: false,
    searchResults: { results: [], totalResults: 0 },
    annotations: [],
    section: null,
    toc: [],
    landmarks: [],
    bookmarks: [],
    flow: 'auto',
};

function bookReducer(state: InitialState, action: BookActions): InitialState {
    switch (action.type) {
        case Types.CHANGE_THEME:
            return {
                ...state,
                theme: action.payload,
            };
        case Types.CHANGE_FONT_SIZE:
            return {
                ...state,
                fontSize: action.payload,
            };
        case Types.CHANGE_FONT_FAMILY:
            return {
                ...state,
                fontFamily: action.payload,
            };
        case Types.SET_AT_START:
            return {
                ...state,
                atStart: action.payload,
            };
        case Types.SET_AT_END:
            return {
                ...state,
                atEnd: action.payload,
            };
        case Types.SET_KEY:
            return {
                ...state,
                bookKey: action.payload,
            };
        case Types.SET_TOTAL_LOCATIONS:
            return {
                ...state,
                totalLocations: action.payload,
            };
        case Types.SET_CURRENT_LOCATION:
            return {
                ...state,
                currentLocation: action.payload,
            };
        case Types.SET_META:
            return {
                ...state,
                meta: action.payload,
            };
        case Types.SET_PROGRESS:
            return {
                ...state,
                progress: action.payload,
            };
        case Types.SET_LOCATIONS:
            return {
                ...state,
                locations: action.payload,
            };
        case Types.SET_IS_LOADING:
            return {
                ...state,
                isLoading: action.payload,
            };
        case Types.SET_IS_RENDERING:
            return {
                ...state,
                isRendering: action.payload,
            };
        case Types.SET_IS_SEARCHING:
            return {
                ...state,
                isSearching: action.payload,
            };
        case Types.SET_SEARCH_RESULTS:
            return {
                ...state,
                searchResults: action.payload,
            };
        case Types.SET_ANNOTATIONS:
            return {
                ...state,
                annotations: action.payload,
            };
        case Types.SET_SECTION:
            return {
                ...state,
                section: action.payload,
            };
        case Types.SET_TOC:
            return {
                ...state,
                toc: action.payload,
            };
        case Types.SET_LANDMARKS:
            return {
                ...state,
                landmarks: action.payload,
            };
        case Types.SET_BOOKMARKS:
            return {
                ...state,
                bookmarks: action.payload,
            };
        case Types.SET_FLOW:
            return {
                ...state,
                flow: action.payload,
            };
        default:
            return state;
    }
}

export type UseBookProps = {
    initialTheme?: Theme;
    initialBookmarks?: Bookmark[];
    initialAnnotations?: Annotation[];
    initialLocations?: ePubCfi[];
    initialFlow?: Flow;
};

export function useBook({
    initialTheme: initTheme = defaultTheme,
    initialBookmarks = [],
    initialAnnotations = [],
    initialLocations = [],
    initialFlow = 'paginated',
}: UseBookProps = {}) {
    const [state, dispatch] = useReducer(bookReducer, {
        ...initialState,
        theme: initTheme,
        bookmarks: initialBookmarks,
        annotations: initialAnnotations,
        locations: initialLocations,
        flow: initialFlow,
    });
    const book = useRef<WebView | null>(null);

    const registerBook = useCallback((bookRef: WebView) => {
        book.current = bookRef;
    }, []);

    const changeTheme = useCallback((theme: Theme) => {
        book.current?.injectJavaScript(`
      rendition.themes.register({ theme: ${JSON.stringify(theme)} });
      rendition.themes.select('theme');
      rendition.views().forEach(view => view.pane ? view.pane.render() : null); true;
    `);
        dispatch({ type: Types.CHANGE_THEME, payload: theme });
    }, []);

    const changeFontFamily = useCallback((fontFamily: string) => {
        book.current?.injectJavaScript(`
      rendition.themes.font('${fontFamily}');
      rendition.views().forEach(view => view.pane ? view.pane.render() : null); true;
    `);
        dispatch({ type: Types.CHANGE_FONT_FAMILY, payload: fontFamily });
    }, []);

    const changeFontSize = useCallback((size: FontSize) => {
        book.current?.injectJavaScript(`
      rendition.themes.fontSize('${size}');
      rendition.views().forEach(view => view.pane ? view.pane.render() : null); true;
    `);
        dispatch({ type: Types.CHANGE_FONT_SIZE, payload: size });
    }, []);

    const setAtStart = useCallback((atStart: boolean) => {
        dispatch({ type: Types.SET_AT_START, payload: atStart });
    }, []);

    const setAtEnd = useCallback((atEnd: boolean) => {
        dispatch({ type: Types.SET_AT_END, payload: atEnd });
    }, []);

    const setTotalLocations = useCallback((totalLocations: number) => {
        dispatch({ type: Types.SET_TOTAL_LOCATIONS, payload: totalLocations });
    }, []);

    const setCurrentLocation = useCallback((location: Location) => {
        dispatch({ type: Types.SET_CURRENT_LOCATION, payload: location });
    }, []);

    const setMeta = useCallback(
        (meta: {
            cover: string | ArrayBuffer | null | undefined;
            author: string;
            title: string;
            description: string;
            language: string;
            publisher: string;
            rights: string;
        }) => {
            dispatch({ type: Types.SET_META, payload: meta });
        },
        []
    );

    const setProgress = useCallback((progress: number) => {
        dispatch({ type: Types.SET_PROGRESS, payload: progress });
    }, []);

    const setLocations = useCallback((locations: ePubCfi[]) => {
        dispatch({ type: Types.SET_LOCATIONS, payload: locations });
    }, []);

    const setIsLoading = useCallback((isLoading: boolean) => {
        dispatch({ type: Types.SET_IS_LOADING, payload: isLoading });
    }, []);

    const setIsRendering = useCallback((isRendering: boolean) => {
        dispatch({ type: Types.SET_IS_RENDERING, payload: isRendering });
    }, []);

    const goToLocation = useCallback((targetCfi: ePubCfi) => {
        book.current?.injectJavaScript(`rendition.display('${targetCfi}'); true`);
    }, []);

    const goPrevious = useCallback(
        (options?: PaginateOptions) => {
            webViewInjectFunctions.injectJavaScript(
                book,
                `
      ${!options?.keepScrollOffset && state.flow === 'scrolled-doc'
                    ? `rendition.once('relocated', () => rendition.moveTo(0));`
                    : ''
                }
      rendition.prev();
    `
            );
        },
        [state.flow]
    );

    const goNext = useCallback(
        (options?: PaginateOptions) => {
            webViewInjectFunctions.injectJavaScript(
                book,
                `
      ${!options?.keepScrollOffset && state.flow === 'scrolled-doc'
                    ? `rendition.once('relocated', () => rendition.moveTo(0));`
                    : ''
                }
      rendition.next();
    `
            );
        },
        [state.flow]
    );

    const getLocations = useCallback(() => state.locations, [state.locations]);

    const getCurrentLocation = useCallback(
        () => state.currentLocation,
        [state.currentLocation]
    );

    const getMeta = useCallback(() => state.meta, [state.meta]);

    const search = useCallback(
        (term: string, page?: number, limit?: number, options?: SearchOptions) => {
            dispatch({
                type: Types.SET_SEARCH_RESULTS,
                payload: { results: [], totalResults: 0 },
            });
            dispatch({ type: Types.SET_IS_SEARCHING, payload: true });

            webViewInjectFunctions.injectJavaScript(
                book,
                `
      const page = ${page || 1};
      const limit = ${limit || 20};
      const term = ${JSON.stringify(term)};
      const chapterId = ${JSON.stringify(options?.sectionId)};
      const reactNativeWebview = window.ReactNativeWebView !== undefined && window.ReactNativeWebView!== null ? window.ReactNativeWebView: window;
      if (!term) {
        reactNativeWebview.postMessage(
          JSON.stringify({ type: 'onSearch', results: [] })
        );
      } else {
        Promise.all(
          book.spine.spineItems.map((item) => {
            return item.load(book.load.bind(book)).then(() => {
              let results = item.find(term.trim());
              const locationHref = item.href;

              let [match] = flatten(book.navigation.toc)
              .filter((chapter, index) => {
                  return book.canonical(chapter.href).includes(locationHref)
              }, null);

              if (results.length > 0) {
                results = results.map(result => ({ ...result, section: { ...match, index: book.navigation.toc.findIndex(elem => elem.id === match?.id) } }));

                if (chapterId) {
                  results = results.filter(result => result.section.id === chapterId);
                }
              }

              item.unload();
              return Promise.resolve(results);
            });
          })
        ).then((results) => {
          const items = [].concat.apply([], results);

          reactNativeWebview.postMessage(
            JSON.stringify({ type: 'onSearch', results: items.slice((page - 1) * limit, page * limit), totalResults: items.length })
          );
        }).catch(err => {
          alert(err?.message);

          reactNativeWebview.postMessage(
            JSON.stringify({ type: 'onSearch', results: [], totalResults: 0 })
          );
        })
      }
    `
            );
        },
        []
    );

    const clearSearchResults = useCallback(() => {
        dispatch({
            type: Types.SET_SEARCH_RESULTS,
            payload: { results: [], totalResults: 0 },
        });
    }, []);

    const setIsSearching = useCallback((value: boolean) => {
        dispatch({ type: Types.SET_IS_SEARCHING, payload: value });
    }, []);

    const setSearchResults = useCallback(
        ({
            results,
            totalResults,
        }: {
            results: SearchResult[];
            totalResults: number;
        }) => {
            dispatch({
                type: Types.SET_SEARCH_RESULTS,
                payload: { results, totalResults },
            });
        },
        []
    );

    /**
     * Combined function to manage comments (annotations) and bookmarks.
     */
    const manageAnnotation = useCallback((
        action: 'add' | 'remove' | 'update' | 'removeByCfi' | 'removeByTagId' | 'removeAll' | 'addByTagId',
        payload: {
            type?: AnnotationType | 'bookmark';
            annotation?: Annotation;
            bookmark?: Bookmark;
            cfiRange?: string;
            tagId?: string;
            data?: object;
            styles?: AnnotationStyles;
            iconClass?: string;
            id?: number;
            location?: Location;
        }
    ) => {
        // Annotation Handling
        if (payload.type !== 'bookmark' && !payload.bookmark) {
            if (action === 'add') {
                webViewInjectFunctions.injectJavaScript(
                    book,
                    `
                  ${webViewInjectFunctions.addAnnotation(
                        payload.type as AnnotationType,
                        payload.cfiRange!,
                        payload.data,
                        payload.iconClass,
                        payload.styles
                    )}
                  ${webViewInjectFunctions.onChangeAnnotations()}
                `
                );
            } else if (action === 'addByTagId') {
                webViewInjectFunctions.injectJavaScript(
                    book,
                    webViewInjectFunctions.addAnnotationByTagId(
                        payload.type as AnnotationType,
                        payload.tagId!,
                        payload.data,
                        payload.iconClass,
                        payload.styles
                    )
                );
            } else if (action === 'update') {
                if (payload.annotation) {
                    webViewInjectFunctions.injectJavaScript(
                        book,
                        webViewInjectFunctions.updateAnnotation(payload.annotation, payload.data, payload.styles)
                    );
                } else if (payload.tagId) {
                    webViewInjectFunctions.injectJavaScript(
                        book,
                        webViewInjectFunctions.updateAnnotationByTagId(payload.tagId, payload.data, payload.styles)
                    );
                }
            } else if (action === 'remove') {
                if (payload.annotation) {
                    webViewInjectFunctions.injectJavaScript(
                        book,
                        `
                      rendition.annotations.remove(${JSON.stringify(payload.annotation.cfiRange)}, ${JSON.stringify(payload.annotation.type)});
                      ${webViewInjectFunctions.onChangeAnnotations()}
                  `
                    );
                }
            } else if (action === 'removeByCfi') {
                webViewInjectFunctions.injectJavaScript(
                    book,
                    `
                  ['highlight', 'underline', 'mark'].forEach(type => {
                    rendition.annotations.remove('${payload.cfiRange}', type);
                  });
                  ${webViewInjectFunctions.onChangeAnnotations()}
              `
                );
            } else if (action === 'removeByTagId') {
                webViewInjectFunctions.injectJavaScript(
                    book,
                    webViewInjectFunctions.removeAnnotationByTagId(payload.tagId!)
                );
            } else if (action === 'removeAll') {
                webViewInjectFunctions.injectJavaScript(
                    book,
                    `
                  let annotations = Object.values(rendition.annotations._annotations);
                  if (typeof ${payload.type} === 'string') {
                    annotations = annotations.filter(annotation => annotation.type === ${payload.type});
                  }
                  annotations.forEach(annotation => {
                    rendition.annotations.remove(annotation.cfiRange, annotation.type);
                  });
                  ${webViewInjectFunctions.onChangeAnnotations()}
                `
                );
            }
        }

        // Bookmark Handling
        if (payload.type === 'bookmark' || payload.bookmark || action === 'add' && payload.location) {
            if (action === 'add' && payload.location) {
                webViewInjectFunctions.injectJavaScript(
                    book,
                    `
                const location = ${JSON.stringify(payload.location)};
                const chapter = getChapter(${JSON.stringify(payload.location)});
                const cfi = makeRangeCfi(location.start.cfi, location.end.cfi);
                const data = ${JSON.stringify(payload.data)};
                const reactNativeWebview = window.ReactNativeWebView !== undefined && window.ReactNativeWebView!== null ? window.ReactNativeWebView: window;
          
                book.getRange(cfi).then(range => {
                  reactNativeWebview.postMessage(JSON.stringify({
                    type: "onAddBookmark",
                    bookmark: {
                      id: Date.now(),
                      chapter,
                      location,
                      text: range.toString(),
                      data,
                    },
                  }));
                }).catch(error => alert(error?.message));
              `
                );
            } else if (action === 'remove' && payload.bookmark) {
                webViewInjectFunctions.injectJavaScript(
                    book,
                    `
                const bookmark = ${JSON.stringify(payload.bookmark)};
                const reactNativeWebview = window.ReactNativeWebView !== undefined && window.ReactNativeWebView!== null ? window.ReactNativeWebView: window;
                reactNativeWebview.postMessage(JSON.stringify({
                  type: "onRemoveBookmark",
                  bookmark,
                }));
              `
                );
            } else if (action === 'removeAll') {
                webViewInjectFunctions.injectJavaScript(
                    book,
                    `
                const reactNativeWebview = window.ReactNativeWebView !== undefined && window.ReactNativeWebView!== null ? window.ReactNativeWebView: window;
                reactNativeWebview.postMessage(JSON.stringify({
                  type: "onRemoveBookmarks",
                }));
              `
                );
            } else if (action === 'update' && payload.id) {
                const { bookmarks } = state;
                const bookmark = state.bookmarks.find((item) => item.id === payload.id);

                if (!bookmark) return;
                if (payload.data) bookmark.data = payload.data;

                const index = state.bookmarks.findIndex((item) => item.id === payload.id);
                bookmarks[index] = bookmark;

                webViewInjectFunctions.injectJavaScript(
                    book,
                    `
              const bookmark = ${JSON.stringify(bookmark)};
               const reactNativeWebview = window.ReactNativeWebView !== undefined && window.ReactNativeWebView!== null ? window.ReactNativeWebView: window;
                reactNativeWebview.postMessage(JSON.stringify({
                type: "onUpdateBookmark",
                bookmark,
              }));
            `
                );
            }
        }

    }, [state.bookmarks]);

    // Keep these separate as they are mostly state updates or specific logic
    const setAnnotations = useCallback((annotations: Annotation[]) => {
        dispatch({ type: Types.SET_ANNOTATIONS, payload: annotations });
    }, []);

    const setInitialAnnotations = useCallback((annotations: Annotation[]) => {
        annotations.forEach((annotation) => {
            webViewInjectFunctions.injectJavaScript(
                book,
                webViewInjectFunctions.addAnnotation(
                    annotation.type,
                    annotation.cfiRange,
                    annotation.data,
                    annotation.iconClass,
                    annotation.styles,
                    annotation.cfiRangeText,
                    true
                )
            );
        });

        const transform = JSON.stringify(annotations);
        webViewInjectFunctions.injectJavaScript(
            book,
            `
        const initialAnnotations = JSON.stringify(${transform});
        const reactNativeWebview = window.ReactNativeWebView !== undefined && window.ReactNativeWebView!== null ? window.ReactNativeWebView: window;

        reactNativeWebview.postMessage(JSON.stringify({
          type: 'onSetInitialAnnotations',
          annotations: ${webViewInjectFunctions.mapArrayObjectsToAnnotations('JSON.parse(initialAnnotations)')}
        }));
      `
        );
    }, []);

    const setKey = useCallback((key: string) => {
        dispatch({ type: Types.SET_KEY, payload: key });
    }, []);

    const removeSelection = useCallback(() => {
        webViewInjectFunctions.injectJavaScript(
            book,
            `
        const getSelections = () => rendition.getContents().map(contents => contents.window.getSelection());
        const clearSelection = () => getSelections().forEach(s => s.removeAllRanges());
        clearSelection();
    `
        );
    }, []);

    const setSection = useCallback((section: Section | null) => {
        dispatch({ type: Types.SET_SECTION, payload: section });
    }, []);

    const setToc = useCallback((toc: Toc) => {
        dispatch({ type: Types.SET_TOC, payload: toc });
    }, []);

    const setLandmarks = useCallback((landmarks: Landmark[]) => {
        dispatch({ type: Types.SET_LANDMARKS, payload: landmarks });
    }, []);

    const setBookmarks = useCallback((bookmarks: Bookmark[]) => {
        dispatch({ type: Types.SET_BOOKMARKS, payload: bookmarks });
    }, []);

    const isBookmarked = useMemo(() => {
        return state.bookmarks.some(
            (bookmark) =>
                bookmark.location.start.cfi === state.currentLocation?.start.cfi &&
                bookmark.location.end.cfi === state.currentLocation?.end.cfi
        );
    }, [state.bookmarks, state.currentLocation]);

    const injectJavascript = useCallback((script: string) => {
        book.current?.injectJavaScript(script);
    }, []);

    const changeFlow = useCallback((flow: Flow) => {
        webViewInjectFunctions.injectJavaScript(
            book,
            `rendition.flow(${JSON.stringify(flow)}); true`
        );
        dispatch({ type: Types.SET_FLOW, payload: flow });
    }, []);

    const setFlow = useCallback((flow: Flow) => {
        dispatch({ type: Types.SET_FLOW, payload: flow });
    }, []);

    return {
        registerBook,
        setAtStart,
        setAtEnd,
        setTotalLocations,
        setCurrentLocation,
        setMeta,
        setProgress,
        setLocations,
        setIsLoading,
        setIsRendering,

        goToLocation,
        goPrevious,
        goNext,
        getLocations,
        getCurrentLocation,
        getMeta,

        search,
        clearSearchResults,
        setIsSearching,

        setKey,
        bookKey: state.bookKey,

        changeTheme,
        changeFontFamily,
        changeFontSize,
        theme: state.theme,

        atStart: state.atStart,
        atEnd: state.atEnd,
        totalLocations: state.totalLocations,
        currentLocation: state.currentLocation,
        meta: state.meta,
        progress: state.progress,
        locations: state.locations,
        isLoading: state.isLoading,
        isRendering: state.isRendering,

        isSearching: state.isSearching,
        searchResults: state.searchResults,
        setSearchResults,

        removeSelection,

        manageAnnotation, // New unified function
        setAnnotations,
        setInitialAnnotations,
        annotations: state.annotations,

        setSection,
        setToc,
        setLandmarks,
        section: state.section,
        toc: state.toc,
        landmarks: state.landmarks,

        setBookmarks,
        bookmarks: state.bookmarks,
        isBookmarked,
        injectJavascript,
        changeFlow,
        setFlow,
        flow: state.flow,
    };
}
