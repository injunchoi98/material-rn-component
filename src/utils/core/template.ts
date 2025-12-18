import * as webViewJavaScriptFunctions from '../../utils/webViewInjectFunctions';

export default `
<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EPUB.js</title>
    <script id="jszip"></script>
    <script id="epubjs"></script>

    <style type="text/css">
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      #viewer {
        height: 100vh;
        width: 100vw;
        overflow: hidden !important;
        display: flex;
        justify-content: center;
        align-items: center;
        /* Critical for Android: Tells the browser to ONLY handle horizontal gestures (pan-x).
           Vertical gestures will be ignored by the browser and propagated to the native layer,
           allowing the parent ScrollView/FlatList to scroll. */
        touch-action: pan-x;
      }

      [ref="epubjs-mk-balloon"] {
        background: url("data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPScxLjEnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycgeG1sbnM6eGxpbms9J2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnIHg9JzBweCcgeT0nMHB4JyB2aWV3Qm94PScwIDAgNzUgNzUnPjxnIGZpbGw9JyNCREJEQkQnIGlkPSdidWJibGUnPjxwYXRoIGNsYXNzPSdzdDAnIGQ9J00zNy41LDkuNEMxOS42LDkuNCw1LDIwLjUsNSwzNC4zYzAsNS45LDIuNywxMS4zLDcuMSwxNS42TDkuNiw2NS42bDE5LTcuM2MyLjgsMC42LDUuOCwwLjksOC45LDAuOSBDNTUuNSw1OS4yLDcwLDQ4LjEsNzAsMzQuM0M3MCwyMC41LDU1LjQsOS40LDM3LjUsOS40eicvPjwvZz48L3N2Zz4=") no-repeat;
        width: 20px;
        overflow: hidden; /* Prevent scrolling on the container itself, let epub.js handle it */
      }
    </style>
    <!-- Injection Point: These script tags will be replaced by local file URIs for jszip and epub.js -->
    <script id="jszip"></script>
    <script id="epubjs"></script>
</head>
<body>
    <div id="viewer"></div>
    <script>
      /**
       * =========================================
       * EPUB.JS WEBVIEW CONTROLLER
       * =========================================
       * This script runs INSIDE the WebView.
       * It communicates with React Native via window.ReactNativeWebView.postMessage.
       * 
       * 1. It receives initial configuration via "Direct Injection" (variables like window.book, window.theme).
       * 2. It initializes the ePub object.
       * 3. It sets up event listeners to relay state changes back to React Native.
       */

      // -- Direct Injection Variables --
      // These are replaced by simple string replacement in 'useInjectWebviewVariables.ts'
      // before this HTML is ever loaded into the WebView.
      /**
       * @type {'epub' | 'opf' | 'binary' | 'base64'}
       * The type of the book file.
       */
      const type = window.type;
      /**
       * @type {string}
       * The book file content (path, URL, or base64 string).
       */
      const file = window.book;
      /**
       * @type {object}
       * The theme object for the rendition.
       */
      const theme = window.theme;
      /**
       * @type {string | undefined}
       * Initial CFI locations string to load the book to a specific position.
       */
      const initialLocations = window.locations;
      /**
       * @type {Array<object> | undefined}
       * Initial annotations to display in the book.
       */
      const initialAnnotations = window.initialAnnotations;
      /**
       * @type {boolean}
       * Flag to enable or disable text selection in the WebView.
       */
      const enableSelection = window.enable_selection;
      /**
       * @type {string | undefined}
       * Initial CFI location to display immediately.
       */
      const initialLocation = window.initialLocation;
      const manager = window.manager;
      const flow = window.flow;
      const snap = window.snap;
      const spread = window.spread;
      const fullsize = window.fullsize;

      // Helper to send messages safely to RN
      const reactNativeWebview = window.ReactNativeWebView !== undefined && window.ReactNativeWebView!== null ? window.ReactNativeWebView: window;
      reactNativeWebview.postMessage(JSON.stringify({ type: "onStarted" }));

      window.onerror = function(message, source, lineno, colno, error) {
        reactNativeWebview.postMessage(JSON.stringify({
          type: "onDisplayError",
          reason: "Global Error: " + message + " at " + lineno + ":" + colno
        }));
      };

      if (!file) {
        alert('Failed load book');
      }

      reactNativeWebview.postMessage(JSON.stringify({ type: "debug", message: "Starting initialization", file: file, fileType: type }));

      // -- Initialization --
      let book;
      let rendition;

      try {
        if (type === 'epub' || type === 'opf' || type === 'binary') {
          book = ePub(file);
        } else if (type === 'base64') {
          book = ePub(file, { encoding: "base64" });
        } else {
          throw new Error('Invalid file type: ' + type);
        }

        // Render to the "viewer" div
        rendition = book.renderTo("viewer", {
          width: "100%",
          height: "100%",
          manager: manager,
          flow: flow,
          snap: snap,
          spread: spread,
          fullsize: fullsize,
          allowPopups: allowPopups,
          allowScriptedContent: allowScriptedContent
        });
      } catch (e) {
        reactNativeWebview.postMessage(JSON.stringify({
          type: "onDisplayError",
          reason: e?.message || e
        }));
      }

      /**
       * Helper: Flattens the recursive TOC structure into a linear array
       */
      function flatten(chapters) {
        return [].concat.apply([], chapters.map((chapter) => [].concat.apply([chapter], flatten(chapter.subitems))));
      }

      function getCfiFromHref(book, href) {
        const [_, id] = href.split('#')
        let section = book.spine.get(href.split('/')[1]) || book.spine.get(href) || book.spine.get(href.split('/').slice(1).join('/'))

        const el = section?.document ? (id ? section.document.getElementById(id) : section.document.body) : null;
        if (!el) return null;
        return section.cfiFromElement(el)
      }

      function getChapter(location) {
          const locationHref = location.start.href

          let match = flatten(book.navigation.toc)
              .filter((chapter) => {
                  return book.canonical(chapter.href).includes(locationHref)
              }, null)
              .reduce((result, chapter) => {
                  const chapterCfi = getCfiFromHref(book, chapter.href);
                  if (!chapterCfi) return result;
                  
                  const locationAfterChapter = ePub.CFI.prototype.compare(location.start.cfi, chapterCfi) > 0
                  return locationAfterChapter ? chapter : result
              }, null);

          return match;
      };

      const makeRangeCfi = (a, b) => {
        const CFI = new ePub.CFI()
        const start = CFI.parse(a), end = CFI.parse(b)
        const cfi = {
            range: true,
            base: start.base,
            path: {
                steps: [],
                terminal: null
            },
            start: start.path,
            end: end.path
        }
        const len = cfi.start.steps.length
        for (let i = 0; i < len; i++) {
          if (CFI.equalStep(cfi.start.steps[i], cfi.end.steps[i])) {
              if (i == len - 1) {
                  // Last step is equal, check terminals
                  if (cfi.start.terminal === cfi.end.terminal) {
                      // CFI's are equal
                      cfi.path.steps.push(cfi.start.steps[i])
                      // Not a range
                      cfi.range = false
                  }
              } else cfi.path.steps.push(cfi.start.steps[i])
          } else break
        }
        cfi.start.steps = cfi.start.steps.slice(cfi.path.steps.length)
        cfi.end.steps = cfi.end.steps.slice(cfi.path.steps.length)

        return 'epubcfi(' + CFI.segmentString(cfi.base)
            + '!' + CFI.segmentString(cfi.path)
            + ',' + CFI.segmentString(cfi.start)
            + ',' + CFI.segmentString(cfi.end)
            + ')'
      }

      if (!enableSelection) {
        rendition.themes.default({
          'body': {
            '-webkit-touch-callout': 'none', /* iOS Safari */
            '-webkit-user-select': 'none', /* Safari */
            '-khtml-user-select': 'none', /* Konqueror HTML */
            '-moz-user-select': 'none', /* Firefox */
            '-ms-user-select': 'none', /* Internet Explorer/Edge */
            'user-select': 'none'
          }
        });
      }

      function getProgress(location) {
        if (book.locations.total > 0) {
          return book.locations.percentageFromCfi(location.start.cfi);
        }
        if (book.spine && book.spine.length > 0 && location.start.index !== undefined) {
             if (book.spine.length === 1) return 0;
             return location.start.index / (book.spine.length - 1);
        }
        return 0;
      }

      book.ready
        .then(function () {
          reactNativeWebview.postMessage(JSON.stringify({ type: "debug", message: "Book ready resolved" }));
          if (initialLocations) {
            return book.locations.load(initialLocations);
          }

          book.locations.generate(2000).then(function () {
            reactNativeWebview.postMessage(JSON.stringify({
              type: "onLocationsReady",
              epubKey: book.key(),
              locations: book.locations.save(),
              totalLocations: book.locations.total,
              currentLocation: rendition.currentLocation(),
              currentLocation: rendition.currentLocation(),
              progress: getProgress(rendition.currentLocation()),
            }));
          });
        })
        .then(function () {
           reactNativeWebview.postMessage(JSON.stringify({ type: "debug", message: "Displaying rendition" }));
           var displayed = rendition.display(initialLocation || undefined);

          displayed.then(function () {
            var currentLocation = rendition.currentLocation();

            reactNativeWebview.postMessage(JSON.stringify({
              type: "onReady",
              totalLocations: book.locations.total,
              currentLocation: currentLocation,
              totalLocations: book.locations.total,
              currentLocation: currentLocation,
              progress: getProgress(currentLocation),
            }));
          });

          book
          .coverUrl()
          .then(async (url) => {
            var reader = new FileReader();
            reader.onload = (res) => {
              reactNativeWebview.postMessage(
                JSON.stringify({
                  type: "meta",
                  metadata: {
                    cover: reader.result,
                    author: book.package.metadata.creator,
                    title: book.package.metadata.title,
                    description: book.package.metadata.description,
                    language: book.package.metadata.language,
                    publisher: book.package.metadata.publisher,
                    rights: book.package.metadata.rights,
                  },
                })
              );
            };
            reader.readAsDataURL(await fetch(url).then((res) => res.blob()));
          })
          .catch(() => {
            reactNativeWebview.postMessage(
              JSON.stringify({
                type: "meta",
                metadata: {
                  cover: undefined,
                  author: book.package.metadata.creator,
                  title: book.package.metadata.title,
                  description: book.package.metadata.description,
                  language: book.package.metadata.language,
                  publisher: book.package.metadata.publisher,
                  rights: book.package.metadata.rights,
                  },
                })
            );
          });

          book.loaded.navigation.then(function (item) {
            reactNativeWebview.postMessage(JSON.stringify({
              type: 'onNavigationLoaded',
              toc: item.toc,
              landmarks: item.landmarks
            }));
          });
        })
        .catch(function (err) {
          reactNativeWebview.postMessage(JSON.stringify({
          type: "onDisplayError",
          reason: err?.message || err
        }));
      });

      rendition.on('started', () => {
        rendition.themes.register({ theme: theme });
        rendition.themes.select('theme');
        
        if (initialAnnotations) {
            initialAnnotations.forEach((annotation) => {
                 let epubStyles = {};
                if (annotation.type === 'highlight') {
                    epubStyles = {
                    'fill': annotation.styles?.color || 'yellow',
                    'fill-opacity': annotation.styles?.opacity || 0.3,
                    };
                }
                if (annotation.type === 'underline') {
                    epubStyles = {
                    'stroke': annotation.styles?.color || 'yellow',
                    'stroke-opacity': annotation.styles?.opacity || 0.3,
                    'stroke-width': annotation.styles?.thickness || 1,
                    };
                }
                rendition.annotations.add(
                    annotation.type, 
                    annotation.cfiRange, 
                    annotation.data, 
                    () => {}, 
                    annotation.iconClass, 
                    epubStyles, 
                    annotation.cfiRangeText
                );
            });
        }
      });

      rendition.on("relocated", function (location) {
        var percent = getProgress(location);
        var percentage = percent;
        var chapter = getChapter(location);

        reactNativeWebview.postMessage(JSON.stringify({
          type: "onLocationChange",
          totalLocations: book.locations.total,
          currentLocation: location,
          progress: percentage,
          currentSection: chapter,
        }));

        if (location.atStart) {
          reactNativeWebview.postMessage(JSON.stringify({
            type: "onBeginning",
          }));
        }

        if (location.atEnd) {
          reactNativeWebview.postMessage(JSON.stringify({
            type: "onFinish",
          }));
        }
      });

      rendition.on("orientationchange", function (orientation) {
        reactNativeWebview.postMessage(JSON.stringify({
          type: 'onOrientationChange',
          orientation: orientation
        }));
      });

      rendition.on("rendered", function (section) {
        reactNativeWebview.postMessage(JSON.stringify({
          type: 'onRendered',
          section: section,
          currentSection: book.navigation.get(section.href),
        }));
      });

      rendition.on("layout", function (layout) {
        reactNativeWebview.postMessage(JSON.stringify({
          type: 'onLayout',
          layout: layout,
        }));
      });

      rendition.on("selected", function (cfiRange, contents) {
        book.getRange(cfiRange).then(function (range) {
          if (range) {
            reactNativeWebview.postMessage(JSON.stringify({
              type: 'onSelected',
              cfiRange: cfiRange,
              text: range.toString(),
            }));
          }
        });
      });

      rendition.on("markClicked", function (cfiRange, contents) {
        const annotations = Object.values(rendition.annotations._annotations);
        const annotation = annotations.find(item => item.cfiRange === cfiRange);

        if (annotation) {
          reactNativeWebview.postMessage(JSON.stringify({
            type: 'onPressAnnotation',
            annotation: ${webViewJavaScriptFunctions.mapObjectToAnnotation('annotation')}
          }));
        }
      });



      rendition.on("resized", function (layout) {
        reactNativeWebview.postMessage(JSON.stringify({
          type: 'onResized',
          layout: layout,
        }));
      });
    </script>
  </body>
</html>
`;
