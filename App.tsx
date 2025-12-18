import React from 'react';
import { useWindowDimensions, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Book, Reader } from './src';
import { useFileSystem } from './src/hooks/useFileSystem';
import Themes from './src/themes';
import { Setting, useSetting } from './src/Setting';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  const { documentDirectory, writeAsStringAsync, readAsStringAsync, getFileInfo } = useFileSystem();
  const [cachedLocations, setCachedLocations] = React.useState<string[] | undefined>(undefined);

  React.useEffect(() => {
    (async () => {
      if (!documentDirectory) return;
      const cachePath = `${documentDirectory}/locations.json`;
      const info = await getFileInfo(cachePath);
      if (info.exists) {
        const content = await readAsStringAsync(cachePath);
        try {
          setCachedLocations(JSON.parse(content));
        } catch (e) {
          console.log('Failed to parse cached locations');
        }
      }
    })();
  }, [documentDirectory]);

  const onLocationsReady = React.useCallback(async (epubKey: string, locations: string[]) => {
    if (!documentDirectory) return;
    const cachePath = `${documentDirectory}/locations.json`;
    await writeAsStringAsync(cachePath, JSON.stringify(locations));
  }, [documentDirectory]);


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <Book
            initialBookmarks={[]}
            initialLocation="epubcfi(/6/14!/4/2/2/2/2[c001s0000]/1:0)"
            cachedLocations={cachedLocations}
            initialAnnotations={[
              // Chapter 1
              {
                cfiRange: 'epubcfi(/6/10!/4/2/4,/1:0,/1:319)',
                data: {},
                sectionIndex: 4,
                styles: { color: '#23CE6B' },
                cfiRangeText:
                  'The pale Usher—threadbare in coat, heart, body, and brain; I see him now. He was ever dusting his old lexicons and grammars, with a queer handkerchief, mockingly embellished with all the gay flags of all the known nations of the world. He loved to dust his old grammars; it somehow mildly reminded him of his mortality.',
                type: 'highlight',
              },
              // Chapter 5
              {
                cfiRange: 'epubcfi(/6/22!/4/2/4,/1:80,/1:88)',
                data: {},
                sectionIndex: 3,
                styles: { color: '#CBA135' },
                cfiRangeText: 'landlord',
                type: 'highlight',
              },
            ]}
          // The Reader component will now have access to the book's context
          >
            <Setting>
              <MyReaderScreen onLocationsReady={onLocationsReady} />
            </Setting>
          </Book>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function MyReaderScreen({ onLocationsReady }: { onLocationsReady?: (key: string, locations: string[]) => void }) {

  const { setVisible } = useSetting();
  return (
    <View style={{ flex: 1 }}>
      <Reader
        src="https://s3.amazonaws.com/moby-dick/OPS/package.opf"
        width="100%"
        height="100%"
        fileSystem={useFileSystem}
        defaultTheme={Themes.DARK}
        onLocationsReady={onLocationsReady}
        charactersPerLocation={4000}
      //cachedLocations={cachedLocations}
      />
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 10,
          borderRadius: 8,
          zIndex: 10
        }}
        onPress={() => setVisible(true)}
      >
        <Text style={{ color: 'white' }}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
}
