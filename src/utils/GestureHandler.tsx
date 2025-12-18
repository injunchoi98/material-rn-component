import React from "react"
import { DimensionValue, I18nManager, Platform, View } from "react-native"
import {
	GestureHandlerRootView,
	GestureDetector,
	Gesture,
	Directions,
	TouchableWithoutFeedback,
} from "react-native-gesture-handler"

interface Props {
	width?: DimensionValue
	height?: DimensionValue

	onSwipeLeft: () => void
	onSwipeRight: () => void
	children: React.ReactNode
}

export function GestureHandler({
	width = "100%",
	height = "100%",

	onSwipeLeft,
	onSwipeRight,
	children,
}: Props) {
	const pan = Gesture.Pan()
		.runOnJS(true)
		.activeOffsetX([-20, 20])
		.onEnd((e) => {
			if (e.translationX > 50) {
				onSwipeRight();
			} else if (e.translationX < -50) {
				onSwipeLeft();
			}
		});

	return (
		<GestureDetector gesture={pan}>
			<View style={{ width, height }}>{children}</View>
		</GestureDetector>
	);
}
