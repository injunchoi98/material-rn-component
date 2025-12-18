import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useBookContext } from './context';

const SettingContext = createContext<{
    visible: boolean;
    setVisible: (v: boolean) => void;
}>({ visible: false, setVisible: () => { } });

export const useSetting = () => useContext(SettingContext);

export function Setting({ children }: { children: ReactNode }) {
    const [visible, setVisible] = useState(false);
    const { toc, goToLocation, currentLocation, progress } = useBookContext();


        console.log('Setting Update:', { currentLocation, progress });

    const screenWidth = Dimensions.get('window').width;

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity onPress={() => {
            goToLocation(item.href);
            setVisible(false);
        }} style={styles.item}>
            <Text style={styles.itemText}>{item.label?.trim() || 'No Label'}</Text>
        </TouchableOpacity>
    );

    return (
        <SettingContext.Provider value={{ visible, setVisible }}>
            <View style={{ flex: 1 }}>

                {children}

                {visible && (
                    <View style={styles.overlay} pointerEvents="box-none">
                        {/* We need to be able to tap 'through' or tap this overlay to close if it's a modal behavior, 
                             but the user said "ontab... setting disappears" which might refer to the Reader tap. 
                             If overlay covers Reader, Reader can't be tapped.
                             So maybe the overlay is just the menu part, leaving some part of Reader visible? 
                             Or maybe the overlay has a transparent part that captures taps to close?
                         */}
                        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setVisible(false)} />

                        <View style={styles.menuContainer}>
                            <View style={styles.tocContainer}>
                                <FlatList
                                    data={toc}
                                    renderItem={renderItem}
                                    keyExtractor={(item, index) => item.id || index.toString()}
                                />
                            </View>
                            <View style={styles.pagerContainer}>
                                <ScrollView
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    style={{ flex: 1 }}
                                >
                                    <View key="1" style={[styles.page, { width: screenWidth - 40 }]}>
                                        <Text>Page 1</Text>
                                    </View>
                                    <View key="2" style={[styles.page, { width: screenWidth - 40 }]}>
                                        <Text>Page 2</Text>
                                    </View>
                                    <View key="3" style={[styles.page, { width: screenWidth - 40 }]}>
                                        <Text>Page 3</Text>
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </SettingContext.Provider>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
        justifyContent: 'flex-end',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    menuContainer: {
        backgroundColor: 'white',
        height: '50%', // Occupy half screen?
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
    },
    tocContainer: {
        flex: 1,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    pagerContainer: {
        height: 150,
        backgroundColor: '#f5f5f5',
    },
    item: {
        padding: 15,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    itemText: {
        fontSize: 16,
    },
    page: {
        flex: 1,
        backgroundColor: '#e0e0e0',
        margin: 10,
        borderRadius: 8,
    }
});
