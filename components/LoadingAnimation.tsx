import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

type AnimationType = 'dots' | 'pulse' | 'rotate' | 'bounce' | 'wave' | 'blink';

interface LoadingAnimationProps {
  type?: AnimationType;
  size?: number;
  color?: string;
  duration?: number;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  type = 'dots',
  size = 10,
  color = '#f4511e',
  duration = 1500
}) => {
  // Animation values
  const animation1 = useRef(new Animated.Value(0)).current;
  const animation2 = useRef(new Animated.Value(0)).current;
  const animation3 = useRef(new Animated.Value(0)).current;
  const animation4 = useRef(new Animated.Value(0)).current;
  const animation5 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startAnimation();
    
    return () => {
      // Cleanup animations
      animation1.stopAnimation();
      animation2.stopAnimation();
      animation3.stopAnimation();
      animation4.stopAnimation();
      animation5.stopAnimation();
    };
  }, [type, duration]);

  const startAnimation = () => {
    if (type === 'dots') {
      // Dots animation - three dots fading in and out in sequence
      Animated.loop(
        Animated.stagger(duration / 6, [
          Animated.sequence([
            Animated.timing(animation1, {
              toValue: 1,
              duration: duration / 3,
              useNativeDriver: true,
              easing: Easing.ease
            }),
            Animated.timing(animation1, {
              toValue: 0,
              duration: duration / 3,
              useNativeDriver: true,
              easing: Easing.ease
            })
          ]),
          Animated.sequence([
            Animated.timing(animation2, {
              toValue: 1,
              duration: duration / 3,
              useNativeDriver: true,
              easing: Easing.ease
            }),
            Animated.timing(animation2, {
              toValue: 0,
              duration: duration / 3,
              useNativeDriver: true,
              easing: Easing.ease
            })
          ]),
          Animated.sequence([
            Animated.timing(animation3, {
              toValue: 1,
              duration: duration / 3,
              useNativeDriver: true,
              easing: Easing.ease
            }),
            Animated.timing(animation3, {
              toValue: 0,
              duration: duration / 3,
              useNativeDriver: true,
              easing: Easing.ease
            })
          ])
        ])
      ).start();
    } else if (type === 'pulse') {
      // Pulse animation - a circle that grows and shrinks
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation1, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease)
          }),
          Animated.timing(animation1, {
            toValue: 0,
            duration: duration / 2,
            useNativeDriver: true,
            easing: Easing.in(Easing.ease)
          })
        ])
      ).start();
    } else if (type === 'rotate') {
      // Rotate animation - a spinning circle
      Animated.loop(
        Animated.timing(animation1, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
          easing: Easing.linear
        })
      ).start();
    } else if (type === 'bounce') {
      // Bounce animation - three bouncing circles
      Animated.loop(
        Animated.stagger(duration / 6, [
          Animated.sequence([
            Animated.timing(animation1, {
              toValue: 1,
              duration: duration / 3,
              useNativeDriver: true,
              easing: Easing.out(Easing.back(1.5))
            }),
            Animated.timing(animation1, {
              toValue: 0,
              duration: duration / 3,
              useNativeDriver: true,
              easing: Easing.in(Easing.back(1.5))
            })
          ]),
          Animated.sequence([
            Animated.timing(animation2, {
              toValue: 1,
              duration: duration / 3,
              useNativeDriver: true,
              easing: Easing.out(Easing.back(1.5))
            }),
            Animated.timing(animation2, {
              toValue: 0,
              duration: duration / 3,
              useNativeDriver: true,
              easing: Easing.in(Easing.back(1.5))
            })
          ]),
          Animated.sequence([
            Animated.timing(animation3, {
              toValue: 1,
              duration: duration / 3,
              useNativeDriver: true,
              easing: Easing.out(Easing.back(1.5))
            }),
            Animated.timing(animation3, {
              toValue: 0,
              duration: duration / 3,
              useNativeDriver: true,
              easing: Easing.in(Easing.back(1.5))
            })
          ])
        ])
      ).start();
    } else if (type === 'wave') {
      // Wave animation - five dots moving in a wave pattern
      const staggerDuration = duration / 10;
      
      Animated.loop(
        Animated.stagger(staggerDuration, [
          Animated.sequence([
            Animated.timing(animation1, {
              toValue: 1,
              duration: duration / 2,
              useNativeDriver: true,
              easing: Easing.sin
            }),
            Animated.timing(animation1, {
              toValue: 0,
              duration: duration / 2,
              useNativeDriver: true,
              easing: Easing.sin
            })
          ]),
          Animated.sequence([
            Animated.timing(animation2, {
              toValue: 1,
              duration: duration / 2,
              useNativeDriver: true,
              easing: Easing.sin
            }),
            Animated.timing(animation2, {
              toValue: 0,
              duration: duration / 2,
              useNativeDriver: true,
              easing: Easing.sin
            })
          ]),
          Animated.sequence([
            Animated.timing(animation3, {
              toValue: 1,
              duration: duration / 2,
              useNativeDriver: true,
              easing: Easing.sin
            }),
            Animated.timing(animation3, {
              toValue: 0,
              duration: duration / 2,
              useNativeDriver: true,
              easing: Easing.sin
            })
          ]),
          Animated.sequence([
            Animated.timing(animation4, {
              toValue: 1,
              duration: duration / 2,
              useNativeDriver: true,
              easing: Easing.sin
            }),
            Animated.timing(animation4, {
              toValue: 0,
              duration: duration / 2,
              useNativeDriver: true,
              easing: Easing.sin
            })
          ]),
          Animated.sequence([
            Animated.timing(animation5, {
              toValue: 1,
              duration: duration / 2,
              useNativeDriver: true,
              easing: Easing.sin
            }),
            Animated.timing(animation5, {
              toValue: 0,
              duration: duration / 2,
              useNativeDriver: true,
              easing: Easing.sin
            })
          ])
        ])
      ).start();
    } else if (type === 'blink') {
      // Blink animation - a circle that blinks
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation1, {
            toValue: 1,
            duration: duration / 4,
            useNativeDriver: true,
            easing: Easing.linear
          }),
          Animated.timing(animation1, {
            toValue: 0,
            duration: duration / 4,
            useNativeDriver: true,
            easing: Easing.linear
          }),
          Animated.timing(animation1, {
            toValue: 1,
            duration: duration / 4,
            useNativeDriver: true,
            easing: Easing.linear
          }),
          Animated.timing(animation1, {
            toValue: 0,
            duration: duration / 4,
            useNativeDriver: true,
            easing: Easing.linear
          }),
          Animated.delay(duration / 2)
        ])
      ).start();
    }
  };

  if (type === 'dots') {
    return (
      <View style={[styles.container, styles.dotsContainer]}>
        <Animated.View 
          style={[
            styles.dot, 
            { 
              width: size, 
              height: size, 
              backgroundColor: color,
              opacity: animation1,
              marginHorizontal: size / 2
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.dot, 
            { 
              width: size, 
              height: size, 
              backgroundColor: color,
              opacity: animation2,
              marginHorizontal: size / 2
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.dot, 
            { 
              width: size, 
              height: size, 
              backgroundColor: color,
              opacity: animation3,
              marginHorizontal: size / 2
            }
          ]} 
        />
      </View>
    );
  } else if (type === 'pulse') {
    const scale = animation1.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.5]
    });
    
    const opacity = animation1.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.6, 1, 0.6]
    });
    
    return (
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.circle, 
            { 
              width: size * 2, 
              height: size * 2, 
              backgroundColor: color,
              transform: [{ scale }],
              opacity
            }
          ]} 
        />
      </View>
    );
  } else if (type === 'rotate') {
    const rotate = animation1.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg']
    });
    
    return (
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.spinner, 
            { 
              width: size * 2, 
              height: size * 2, 
              borderColor: color,
              borderWidth: size / 5,
              borderTopColor: 'transparent',
              transform: [{ rotate }]
            }
          ]} 
        />
      </View>
    );
  } else if (type === 'bounce') {
    const translateY1 = animation1.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -size]
    });
    
    const translateY2 = animation2.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -size]
    });
    
    const translateY3 = animation3.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -size]
    });
    
    return (
      <View style={[styles.container, styles.bounceContainer]}>
        <Animated.View 
          style={[
            styles.circle, 
            { 
              width: size * 1.2, 
              height: size * 1.2, 
              backgroundColor: color,
              transform: [{ translateY: translateY1 }],
              marginHorizontal: size / 2
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.circle, 
            { 
              width: size * 1.2, 
              height: size * 1.2, 
              backgroundColor: color,
              transform: [{ translateY: translateY2 }],
              marginHorizontal: size / 2
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.circle, 
            { 
              width: size * 1.2, 
              height: size * 1.2, 
              backgroundColor: color,
              transform: [{ translateY: translateY3 }],
              marginHorizontal: size / 2
            }
          ]} 
        />
      </View>
    );
  } else if (type === 'wave') {
    const translateY1 = animation1.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -size]
    });
    
    const translateY2 = animation2.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -size]
    });
    
    const translateY3 = animation3.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -size]
    });
    
    const translateY4 = animation4.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -size]
    });
    
    const translateY5 = animation5.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -size]
    });
    
    return (
      <View style={[styles.container, styles.waveContainer]}>
        <Animated.View 
          style={[
            styles.dot, 
            { 
              width: size, 
              height: size, 
              backgroundColor: color,
              transform: [{ translateY: translateY1 }],
              marginHorizontal: size / 3
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.dot, 
            { 
              width: size, 
              height: size, 
              backgroundColor: color,
              transform: [{ translateY: translateY2 }],
              marginHorizontal: size / 3
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.dot, 
            { 
              width: size, 
              height: size, 
              backgroundColor: color,
              transform: [{ translateY: translateY3 }],
              marginHorizontal: size / 3
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.dot, 
            { 
              width: size, 
              height: size, 
              backgroundColor: color,
              transform: [{ translateY: translateY4 }],
              marginHorizontal: size / 3
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.dot, 
            { 
              width: size, 
              height: size, 
              backgroundColor: color,
              transform: [{ translateY: translateY5 }],
              marginHorizontal: size / 3
            }
          ]} 
        />
      </View>
    );
  } else if (type === 'blink') {
    return (
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.circle, 
            { 
              width: size * 2, 
              height: size * 2, 
              backgroundColor: color,
              opacity: animation1
            }
          ]} 
        />
      </View>
    );
  }
  
  return null;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
  },
  bounceContainer: {
    flexDirection: 'row',
  },
  waveContainer: {
    flexDirection: 'row',
  },
  dot: {
    borderRadius: 50,
  },
  circle: {
    borderRadius: 50,
  },
  spinner: {
    borderRadius: 50,
  }
});

export default LoadingAnimation; 